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
    emitPipelineEvent('docker:checking', 'Checking Docker availability...');

    try {
      await this.docker.ping();
      emitPipelineEvent('docker:available', 'Docker is available and running');
    } catch {
      emitPipelineEvent('docker:unavailable', 'Docker is not available or not running');
      throw new Error('Docker is not available or not running');
    }
  }

  public async createInstance(image: string, variables: string[]): Promise<Docker.Container> {
    try {
      await this.image.pullImage(image);

      if (variables.length) {
        emitPipelineEvent('info', `Initializing instance with ${variables.length} variables`);
      }

      emitPipelineEvent('instance:creating', `Creating container with image: ${image}`);

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
      emitPipelineEvent('instance:created', shortId, { containerId: instance.id });

      emitPipelineEvent('instance:copying', 'Copying current directory to instance');

      // @TODO: make the path configurable through CLI options
      const workingDir = process.cwd();
      const workingDirTarStream = tar.pack(workingDir);

      await instance.putArchive(workingDirTarStream, {
        path: CONTAINER_WORKDIR,
      });

      emitPipelineEvent('instance:copied', 'Directory files copied to instance');

      return instance;
    } catch (error) {
      handleAndEmitError('creating instance', error);
    }
  }

  public async removeInstance(instance: Docker.Container) {
    emitPipelineEvent('instance:stopping', 'Stopping and removing instance...');

    await instance.stop();
    await instance.remove();

    emitPipelineEvent('instance:stopped', 'Instance stopped and removed');
  }

  public async runInstanceScript(
    instance: Docker.Container,
    stepScript: string,
    stepScriptIndex: number,
    totalStepScripts: number,
  ) {
    const sanitizedScript = stepScript.replace(/\n/g, '; ');

    emitPipelineEvent(
      'script:start',
      `(${stepScriptIndex}/${totalStepScripts}) ${sanitizedScript}`,
      { script: stepScript, index: stepScriptIndex, total: totalStepScripts },
    );

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
            emitPipelineEvent('script:output', cleanLine, { stderr: false });
          }
        }
        callback();
      },
    });

    return new Promise<void>((resolve, reject) => {
      // With TTY mode, stream is already multiplexed, pipe directly
      stream.pipe(outputStream);

      stream.on('error', async (err: Error) => {
        emitPipelineEvent('script:error', `Script failed with error: "${err.message}"`);

        await this.removeInstance(instance);
        reject(err);
      });

      stream.on('end', async () => {
        // Flush any remaining buffered content
        if (lineBuffer) {
          const cleanLine = cleanTerminalOutput(lineBuffer);
          if (cleanLine) {
            emitPipelineEvent('script:output', cleanLine, { stderr: false });
          }
        }

        if (!hasOutput) {
          emitPipelineEvent('script:output', '(no output)');
        }

        const result = await exec.inspect();

        if (result.ExitCode !== 0) {
          emitPipelineEvent('script:error', `Script failed with code "${result.ExitCode}"`);

          await this.removeInstance(instance);
          reject(new Error(`Script failed with exit code ${result.ExitCode}`));
        } else {
          emitPipelineEvent('script:complete', 'Script executed successfully');
          resolve();
        }
      });
    });
  }
}
