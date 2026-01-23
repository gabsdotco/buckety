export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export type ScriptStatus = 'running' | 'success' | 'failed';

export type ScriptPhase =
  | 'setup'
  | 'script'
  | 'cleanup'
  | 'artifacts-upload'
  | 'artifacts-download';

export type OutputLine = {
  text: string;
  type: 'stdout' | 'stderr' | 'info' | 'success' | 'error' | 'command';
};

export type ScriptOutput = {
  command: string;
  status: ScriptStatus;
  phase: ScriptPhase;
  lines: OutputLine[];
};

export type StepState = {
  name: string;
  status: StepStatus;
  output: OutputLine[];
  scripts: ScriptOutput[];
  startTime?: number;
  endTime?: number;
};

export type PipelineStatus = 'idle' | 'running' | 'success' | 'failed';

export type PipelineState = {
  pipelineName: string;
  status: PipelineStatus;
  steps: StepState[];
  selectedStepIndex: number;
  globalOutput: OutputLine[]; // For output before any step starts
};
