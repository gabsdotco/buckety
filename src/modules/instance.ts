import tar from 'tar-fs';
import Docker from 'dockerode';

import { Writable } from 'stream';

import { emitPipelineEvent } from '@/lib/events.js';
import { cleanTerminalOutput } from '@/lib/terminal.js';
import { handleAndEmitError } from '@/lib/errors.js';
import { docker } from '@/lib/docker.js';
import { CONTAINER_WORKDIR } from '@/lib/paths.js';

import { Image } from './image.js';

export class Instance {
  private image: Image;
  private docker: Docker;

  constructor() {
    this.image = new Image();
    this.docker = docker;
  }

  public async checkAvailability() {
    emitPipelineEvent({ type: 'docker:checking' });

    try {
      await this.docker.ping();
      emitPipelineEvent({ type: 'docker:available' });
    } catch (error) {
      emitPipelineEvent({ type: 'docker:unavailable', error });
      throw new Error('Docker is not available or not running');
    }
  }

  public async createInstance(image: string, variables: string[]): Promise<Docker.Container> {
    try {
      await this.image.pullImage(image);

      if (variables.length) {
        emitPipelineEvent({
          type: 'info',
          message: `Initializing instance with ${variables.length} variables`,
        });
      }

      emitPipelineEvent({ type: 'instance:creating', data: { image } });

      // Add environment variables to force color output in CLI tools
      const colorEnvVars = [
        'TERM=xterm-256color', // Standard terminal with 256 color support
        'FORCE_COLOR=1', // Force color for chalk/supports-color
        'COLORTERM=truecolor', // Indicate true color support
        'CI=true', // Some tools check this but still respect FORCE_COLOR
      ];

      const instance = await this.docker.createContainer({
        Tty: true,
        Env: [...colorEnvVars, ...variables],
        Image: image,
        WorkingDir: CONTAINER_WORKDIR,
      });

      const shortId = `${instance.id.substring(0, 4)}..${instance.id.slice(-4)}`;
      emitPipelineEvent({
        type: 'instance:created',
        data: { id: instance.id, shortId },
      });

      emitPipelineEvent({ type: 'instance:copying' });

      // @TODO: make the path configurable through CLI options
      const workingDir = process.cwd();
      const workingDirTarStream = tar.pack(workingDir);

      await instance.putArchive(workingDirTarStream, {
        path: CONTAINER_WORKDIR,
      });

      emitPipelineEvent({ type: 'instance:copied' });

      return instance;
    } catch (error) {
      handleAndEmitError('creating instance', error);
    }
  }

  public async removeInstance(instance: Docker.Container) {
    emitPipelineEvent({ type: 'instance:stopping' });

    await instance.stop();
    await instance.remove();

    emitPipelineEvent({ type: 'instance:stopped' });
  }

  public async runInstanceScript(
    instance: Docker.Container,
    stepScript: string,
    stepScriptIndex: number,
    totalStepScripts: number,
  ) {
    const sanitizedScript = stepScript.replace(/\n/g, '; ');

    emitPipelineEvent({
      type: 'script:start',
      data: {
        script: stepScript,
        index: stepScriptIndex,
        total: totalStepScripts,
        sanitizedScript,
      },
    });

    const exec = await instance.exec({
      Cmd: ['bash', '-c', stepScript],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    });

    const stream = await exec.start({
      Detach: false,
      Tty: true,
    });

    // Track if we've received any output
    let hasOutput = false;

    // Buffer for incomplete lines (chunks may split mid-line)
    let lineBuffer = '';

    const outputStream = new Writable({
      write(chunk, _encoding, callback) {
        const text = chunk.toString('utf-8');
        // Handle line buffering for partial lines
        const combined = lineBuffer + text;
        const lines = combined.split('\n');

        // Last element might be incomplete, keep it in buffer
        lineBuffer = lines.pop() || '';

        // Emit complete lines
        for (const line of lines) {
          const cleanLine = cleanTerminalOutput(line);
          if (cleanLine) {
            hasOutput = true;
            emitPipelineEvent({
              type: 'script:output',
              data: { text: cleanLine, stderr: false },
            });
          }
        }
        callback();
      },
    });

    return new Promise<void>((resolve, reject) => {
      // With TTY mode, stream is already multiplexed, pipe directly
      stream.pipe(outputStream);

      stream.on('error', async (err: Error) => {
        emitPipelineEvent({ type: 'script:error', error: err });

        await this.removeInstance(instance);
        reject(err);
      });

      stream.on('end', async () => {
        // Flush any remaining buffered content
        if (lineBuffer) {
          const cleanLine = cleanTerminalOutput(lineBuffer);
          if (cleanLine) {
            emitPipelineEvent({
              type: 'script:output',
              data: { text: cleanLine, stderr: false },
            });
          }
        }

        if (!hasOutput) {
          emitPipelineEvent({
            type: 'script:output',
            data: { text: '(no output)', stderr: false },
          });
        }

        const result = await exec.inspect();

        if (result.ExitCode !== 0) {
          const error = new Error(`Script failed with exit code ${result.ExitCode}`);
          emitPipelineEvent({ type: 'script:error', error });

          await this.removeInstance(instance);
          reject(error);
        } else {
          emitPipelineEvent({ type: 'script:complete' });
          resolve();
        }
      });
    });
  }
}
