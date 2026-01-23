# Architecture

This document describes the system architecture of Buckety, including its modules, execution flow, and design decisions.

## System Overview

Buckety is built with TypeScript and uses Docker containers to simulate the Bitbucket Pipeline environment. The application follows a modular architecture where each component has a single responsibility.

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLI (Commander.js)                     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Commands (run.ts)                        │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
            │ Environment  │ │Configuration│ │    Runner    │
            └──────────────┘ └─────────────┘ └──────────────┘
                                                    │
                    ┌───────────────┬───────────────┤
                    ▼               ▼               ▼
            ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
            │    Image     │ │  Instance   │ │  Artifacts   │
            └──────────────┘ └─────────────┘ └──────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │    Docker    │
                            │  (Dockerode) │
                            └──────────────┘
```

## Directory Structure

```
buckety/
├── bin/
│   └── cli                    # Entry point executable
├── src/
│   ├── index.ts              # Main entry - CLI setup
│   ├── commands/
│   │   ├── index.ts          # Command exports
│   │   └── run.ts            # 'run' command implementation
│   ├── modules/
│   │   ├── runner.ts         # Pipeline execution orchestrator
│   │   ├── instance.ts       # Docker container management
│   │   ├── image.ts          # Docker image pulling
│   │   ├── configuration.ts  # Pipeline YAML parsing
│   │   ├── environment.ts    # Environment variables handling
│   │   └── artifacts.ts      # Artifacts storage/retrieval
│   ├── tui/
│   │   ├── index.tsx         # TUI entry point, cursor/screen management
│   │   ├── App.tsx           # Main app layout, keyboard handlers
│   │   ├── types.ts          # TUI type definitions
│   │   ├── components/
│   │   │   ├── Sidebar.tsx   # Step list with status indicators
│   │   │   ├── OutputPanel.tsx # Scrollable output with ANSI colors
│   │   │   ├── AnsiText.tsx  # ANSI escape sequence parser/renderer
│   │   │   └── PipelinePicker.tsx # Pipeline selection modal
│   │   └── hooks/
│   │       ├── usePipelineEvents.ts # Event handling and state management
│   │       └── useTerminalDimensions.ts # Terminal size tracking
│   ├── lib/
│   │   ├── ui.ts             # Terminal UI utilities
│   │   ├── events.ts         # Pipeline event emitter
│   │   └── regex.ts          # Regex patterns for validation
│   └── types/
│       ├── index.ts          # Type exports
│       ├── cli.ts            # CLI option types
│       ├── step.ts           # Step interface
│       ├── template.ts       # Template interface
│       ├── pipeline.ts       # Pipeline interfaces
│       ├── definitions.ts    # Definitions interface
│       └── image.ts          # Image type
├── .buckety/                  # Runtime directory for artifacts
└── example/                   # Example project for testing
```

## Core Modules

### 1. Runner (`modules/runner.ts`)

The main orchestrator that coordinates pipeline execution. It:

- Verifies Docker availability
- Retrieves pipeline configuration by name
- Iterates through pipeline steps
- Manages container lifecycle for each step
- Handles artifact transfer between steps
- Provides formatted output

### 2. Instance (`modules/instance.ts`)

Manages Docker container lifecycle using Dockerode:

- **create()**: Creates a new container with specified image and environment
- **start()**: Starts the container
- **exec()**: Executes scripts inside the container
- **uploadFiles()**: Copies project files to container
- **downloadFiles()**: Extracts files from container
- **stop()**: Stops the container
- **remove()**: Removes the container

### 3. Image (`modules/image.ts`)

Handles Docker image management:

- **check()**: Verifies if image exists locally
- **pull()**: Pulls image from registry if not available

### 4. Configuration (`modules/configuration.ts`)

Parses and validates `bitbucket-pipelines.yml`:

- Loads YAML file from disk
- Parses using js-yaml
- Provides access to pipeline definitions
- Supports path notation for nested pipelines (e.g., `branches:develop`)

### 5. Environment (`modules/environment.ts`)

Handles environment variables:

- Parses `.env` files using dotenv
- Parses inline variable strings (`VAR1=value1,VAR2=value2`)
- Provides variables for container injection

### 6. Artifacts (`modules/artifacts.ts`)

Manages artifacts between pipeline steps:

- **store()**: Extracts artifacts from container to `.buckety/artifacts/`
- **upload()**: Uploads stored artifacts to new containers
- Uses glob patterns for flexible file matching

## Terminal User Interface (TUI)

Buckety features an interactive TUI built with React and Ink for real-time pipeline monitoring.

### TUI Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        App.tsx                                   │
│  (Layout, keyboard handlers, state coordination)                 │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
        ┌───────────┴───────────┐   ┌──────────┴──────────┐
        ▼                       ▼   ▼                      ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Sidebar    │        │ OutputPanel  │        │   Hooks      │
│              │        │              │        │              │
│ - Step list  │        │ - ScrollView │        │ - Events     │
│ - Status     │        │ - AnsiText   │        │ - Dimensions │
│ - Shortcuts  │        │ - Scripts    │        │              │
└──────────────┘        └──────────────┘        └──────────────┘
```

### TUI Components

#### App (`tui/App.tsx`)

Main application component that:

- Coordinates layout between Sidebar and OutputPanel
- Handles keyboard input (navigation, scrolling, quit)
- Manages step selection state

#### Sidebar (`tui/components/Sidebar.tsx`)

Displays pipeline steps with:

- Status symbols: `○` pending, `◐` running, `●` success, `✕` failed
- Color-coded status (blue=running, green=success, red=failed)
- Selected step highlighting with `#191919` background
- Keyboard shortcut hints

#### OutputPanel (`tui/components/OutputPanel.tsx`)

Scrollable output view with:

- Real-time script output streaming
- Grouped output by script/phase (Setup, Script, Clean-up, Artifacts)
- ANSI color code rendering via AnsiText component
- Scroll controls with position limits

#### AnsiText (`tui/components/AnsiText.tsx`)

ANSI escape sequence parser that:

- Parses SGR codes (colors, bold, italic, underline, etc.)
- Supports 16 colors, 256 colors, and true color (24-bit)
- Converts ANSI codes to Ink Text component props
- Strips problematic control sequences while preserving colors

### TUI Hooks

#### usePipelineEvents (`tui/hooks/usePipelineEvents.ts`)

Central state management hook that:

- Subscribes to pipeline events from the event emitter
- Maintains step states (pending, running, success, failed)
- Tracks script output organized by phase
- Handles auto-focus on step completion

#### useTerminalDimensions (`tui/hooks/useTerminalDimensions.ts`)

Terminal size tracking hook that:

- Monitors terminal resize events
- Provides current columns and rows
- Updates layout on resize

### Event System & Reporter Pattern

The TUI communicates with the pipeline runner via a strictly typed event system and a `Reporter` interface.

#### Reporter Interface

Core modules (`Runner`, `Instance`, etc.) do not depend on the global event emitter directly. Instead, they accept a `Reporter` interface:

```typescript
interface Reporter {
  emit(event: PipelineEvent): void;
}
```

This allows dependency injection, making modules testable and decoupled from the TUI.

#### Strict Event Types

Events are defined as Discriminated Unions for type safety:

```typescript
type PipelineEvent =
  | { type: 'step:start'; data: { stepName: string } }
  | { type: 'image:pulling'; data: { image: string } }
  | { type: 'error'; error: unknown };
```

#### TUI State Management (Reducer)

The TUI uses a Reducer pattern (`src/tui/reducers/pipelineReducer.ts`) to manage state. It receives raw data events from the core and transforms them into UI state (messages, status updates). This separates business logic (Core) from presentation logic (TUI).

```typescript
function pipelineReducer(state, action) {
  switch (action.type) {
    case 'EVENT':
      // Handle PipelineEvent and update state
      return newState;
    case 'SELECT_STEP':
      // Handle UI interaction
      return { ...state, selectedStepIndex: action.index };
  }
}
```

## Libraries

### UI (`lib/ui.ts`)

Terminal UI utilities using Chalk:

- `box()`: Creates styled boxes with optional borders
- `text()`: Applies color styles to text
- `divider()`: Creates visual dividers

### Regex (`lib/regex.ts`)

Validation patterns:

- File path validation
- Variable list validation

## Execution Flow

### 1. CLI Entry

```
bin/cli → src/index.ts → commands/run.ts
```

Commander.js parses the command and options, then invokes the run command.

### 2. Initialization

```typescript
// 1. Parse environment variables
const environment = new Environment(options);

// 2. Load pipeline configuration
const configuration = new Configuration(options);

// 3. Create runner
const runner = new Runner(environment, configuration);
```

### 3. Pipeline Execution

```typescript
// For each step in the pipeline:
for (const step of pipeline.steps) {
  // 1. Determine Docker image
  const image = step.image || defaultImage;

  // 2. Pull image if needed
  await Image.pull(image);

  // 3. Create and start container
  const instance = new Instance(image, env);
  await instance.create();
  await instance.start();

  // 4. Upload project files
  await instance.uploadFiles('/runner');

  // 5. Upload previous artifacts
  await Artifacts.upload(instance);

  // 6. Execute scripts
  for (const script of step.script) {
    await instance.exec(script);
  }

  // 7. Download artifacts
  await Artifacts.store(step.artifacts);

  // 8. Cleanup
  await instance.stop();
  await instance.remove();
}
```

## Data Flow

```
┌─────────────────┐
│ bitbucket-      │
│ pipelines.yml   │──────┐
└─────────────────┘      │
                         ▼
┌─────────────────┐    ┌─────────────────┐
│   .env file     │───▶│  Configuration  │
└─────────────────┘    │   + Environment │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Runner      │
                       └────────┬────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Step 1        │    │   Step 2        │    │   Step N        │
│   Container     │───▶│   Container     │───▶│   Container     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      ▲
         │    ┌─────────────────┘
         ▼    │
┌─────────────────┐
│   .buckety/     │
│   artifacts/    │
└─────────────────┘
```

## Technology Stack

| Technology      | Purpose                             |
| --------------- | ----------------------------------- |
| TypeScript      | Primary language (ES2020, NodeNext) |
| Node.js         | Runtime (>= 20)                     |
| React           | TUI component framework             |
| Ink             | React renderer for CLI interfaces   |
| ink-scroll-view | Scrollable container for TUI        |
| Dockerode       | Docker API client                   |
| Commander.js    | CLI framework                       |
| js-yaml         | YAML parsing                        |
| Chalk           | Terminal styling                    |
| dotenv          | Environment file parsing            |
| tar-fs          | Archive creation/extraction         |
| globby          | File pattern matching               |
| Lodash          | Utility functions                   |
| ansi-regex      | ANSI escape code parsing            |

## Design Decisions

### Why Docker?

Bitbucket Pipelines run in Docker containers. By using Docker locally, we ensure environment parity between local testing and remote execution.

### Why Modular Architecture?

Each module handles a single concern, making the codebase:

- Easy to test
- Easy to maintain
- Easy to extend

### Why TypeScript?

Strong typing helps catch errors at compile time and provides better IDE support for development.

## Limitations

### Current Limitations

1. **Environment Variable Exports**: Exported variables from one script line cannot be reused in subsequent lines unless combined with `&&` or using YAML block scalars.

   ```yaml
   # Won't work - variables don't persist across script lines
   script:
     - export FOO="bar"
     - echo $FOO  # FOO is undefined

   # Works - same script block
   script:
     - |-
       export FOO="bar"
       echo $FOO
   ```

2. **No Service Containers**: Currently does not support Bitbucket's service containers (like databases, Redis, Elasticsearch). Each step runs in isolation without companion services.

3. **No Caching**: Does not implement Bitbucket's caching mechanism. Dependencies are downloaded fresh for each step.

4. **No Parallel Steps**: Steps are executed sequentially, not in parallel. The `parallel` keyword is ignored.

5. **No Pipes Support**: Bitbucket Pipes (reusable pipeline components) are not supported. Replace with equivalent shell commands.

6. **No Docker-in-Docker**: The `options.docker` setting for running Docker commands inside steps is not supported.

7. **No Built-in Variables**: Bitbucket's built-in variables (`$BITBUCKET_COMMIT`, `$BITBUCKET_BRANCH`, etc.) are not automatically set.

8. **No Private Registry Auth**: Image authentication via `image.username`/`image.password` is not supported. Use `docker login` before running Buckety.

9. **No Deployment Environments**: Deployment environments with approvals and environment-specific variables are not supported.

10. **No Timeouts**: Step timeout settings (`max-time`) are not enforced.

### Workarounds

| Limitation         | Workaround                                                        |
| ------------------ | ----------------------------------------------------------------- |
| Service containers | Run services locally or use Docker Compose before running Buckety |
| Caching            | Mount local directories or use Docker volumes                     |
| Pipes              | Replace with equivalent shell commands                            |
| Built-in variables | Set variables manually via `-v` flag or `.env` file               |
| Private registries | Run `docker login` before running Buckety                         |

See [Configuration - Unsupported Features](./CONFIGURATION.md#unsupported-features) for a complete list.
