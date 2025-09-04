import Docker from 'dockerode';
import { Writable } from 'stream';

import path from 'path';
import tar from 'tar-fs';

import * as ui from '@/lib/ui';

import { Image } from './image';

export class Instance {
  private image: Image;
  private docker: Docker;

  constructor() {
    this.image = new Image();
    this.docker = new Docker();
  }

  public async checkAvailability() {
    ui.text('Checking Docker availability...');

    try {
      await this.docker.ping();

      ui.text('Docker is available');
    } catch {
      ui.text('Docker is not running, or you do not have permission to access it', { fg: 'red' });
      ui.text('Exiting...');

      process.exit();
    }
  }

  public async createInstance(image: string, variables: string[]): Promise<Docker.Container> {
    try {
      await this.image.pullImage(image);

      if (variables.length) {
        ui.text(`- Initializing instance with variables:`);
        variables.map((variable) => ui.text(`- ${variable}`));
      }

      const instance = await this.docker.createContainer({
        Tty: true,
        Env: variables,
        Image: image,
        WorkingDir: '/runner',
      });

      ui.text(`- Created instance "${instance.id.substring(0, 4)}..${instance.id.slice(-4)}"`);
      ui.text('- Copying current directory to instance');

      // @TODO: make the path configurable through CLI options
      const workingDir = path.join(process.cwd(), './example');
      const workingDirTarStream = tar.pack(workingDir);

      await instance.putArchive(workingDirTarStream, {
        path: '/runner',
      });

      ui.text('- Directory files copied to instance');

      return instance;
    } catch (error) {
      if (error instanceof Error) {
        ui.text(`- Error creating instance: "${error.message.trim()}"`, { fg: 'red' });
      } else {
        ui.text(`- Error creating instance: "${error}"`, { fg: 'red' });
      }

      ui.text('- Exiting...');

      process.exit();
    }
  }

  public async removeInstance(instance: Docker.Container) {
    ui.box('Cleanup');
    ui.text('- Stopping and removing instance...');

    await instance.stop();
    await instance.remove();

    ui.text('- Instance stopped and removed');
  }

  public async runInstanceScript(
    instance: Docker.Container,
    stepScript: string,
    stepScriptIndex: number,
    totalStepScripts: number,
  ) {
    const sanitizedScript = stepScript.replace(/\n/g, '; ');

    if (stepScriptIndex > 1 && stepScriptIndex <= totalStepScripts) {
      ui.divider({
        fg: 'grey',
      });
    }

    ui.text(`(${stepScriptIndex}/${totalStepScripts}) Running Script: "${sanitizedScript}"`, {
      bold: true,
    });

    const exec = await instance.exec({
      Cmd: ['bash', '-c', stepScript],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    const stream = await exec.start({
      hijack: true,
      stdin: false,
    });

    const stdoutBuffer: Buffer[] = [];
    const stderrBuffer: Buffer[] = [];

    const stdoutStream = new Writable({
      write(chunk, _encoding, callback) {
        stdoutBuffer.push(chunk);
        callback();
      },
    });

    const stderrStream = new Writable({
      write(chunk, _encoding, callback) {
        stderrBuffer.push(chunk);
        callback();
      },
    });

    return new Promise<void>((resolve) => {
      this.docker.modem.demuxStream(stream, stdoutStream, stderrStream);

      stream.on('error', async (err) => {
        ui.text(`-> Script failed with error: "${err.message}"`, { fg: 'red' });

        await this.removeInstance(instance);

        process.exit();
      });

      stream.on('end', async () => {
        const stdout = Buffer.concat(stdoutBuffer).toString('utf-8').trim();
        const stderr = Buffer.concat(stderrBuffer).toString('utf-8').trim();

        if (!!stdout || !!stderr) {
          const combinedOutput = [stdout, stderr].filter(Boolean).join('\n\n');
          const isOnlyStderr = !stdout && !!stderr;

          ui.output(combinedOutput, {
            fg: isOnlyStderr ? 'red' : 'magentaBright',
          });
        }

        if (!stdout && !stderr) {
          ui.output('No output from script', { fg: 'grey' });
        }

        const result = await exec.inspect();

        if (result.ExitCode !== 0) {
          ui.text(`-> Script failed with code "${result.ExitCode}"`, { fg: 'red' });

          await this.removeInstance(instance);

          process.exit();
        } else {
          ui.text('-> Script executed successfully', { fg: 'green' });

          resolve();
        }
      });
    });
  }
}
