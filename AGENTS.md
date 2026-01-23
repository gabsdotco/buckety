# AGENTS.md

Guidelines for AI coding agents working in the Buckety codebase.

## Project Overview

Buckety is a CLI tool for running Bitbucket Pipelines locally using Docker containers.
Built with TypeScript (ES2020, NodeNext modules), requires Node.js >= 20.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Build (compile TypeScript + resolve path aliases)
pnpm build

# Watch mode (TypeScript only, no alias resolution)
pnpm build:watch

# Run in development (via ts-node)
pnpm start

# Run compiled version
pnpm start:node
```

## Linting & Formatting

```bash
# Lint (ESLint with TypeScript)
pnpm eslint src/

# Format (Prettier)
pnpm prettier --write src/
```

No test framework is currently configured. When adding tests, use Vitest (recommended for ESM projects).

## Project Structure

```
src/
├── index.ts              # CLI entry point (Commander.js setup)
├── commands/             # CLI commands
│   └── run.ts            # Main 'run' command
├── modules/              # Core business logic
│   ├── runner.ts         # Pipeline orchestration
│   ├── instance.ts       # Docker container management
│   ├── image.ts          # Docker image handling
│   ├── configuration.ts  # YAML parsing
│   ├── environment.ts    # Environment variables
│   └── artifacts.ts      # Artifact management
├── lib/                  # Shared utilities
│   ├── ui.ts             # Terminal output (Chalk)
│   └── regex.ts          # Validation patterns
└── types/                # TypeScript interfaces
```

## Code Style Guidelines

### Imports

Order imports in this sequence, separated by blank lines:

1. External packages (npm dependencies)
2. Node.js built-ins
3. Type imports (using `import type`)
4. Internal modules with `@/` alias
5. Relative imports (same directory)

```typescript
// External packages
import Docker from 'dockerode';
import tar from 'tar-fs';

// Node built-ins
import path from 'path';
import { Writable } from 'stream';

// Type imports
import type { Step } from '@/types/step.js';

// Internal modules (use @/ alias)
import * as ui from '@/lib/ui.js';
import { Environment } from '@/modules/environment.js';

// Relative imports
import { Image } from './image.js';
```

**Important**: Always include `.js` extension in imports (required for NodeNext module resolution).

### Formatting (Prettier)

- 2 spaces indentation, no tabs
- Single quotes for strings
- Semicolons required
- Trailing commas (all)
- Arrow function parens always: `(x) => x`
- Print width: 100 characters

### TypeScript

- Strict mode enabled
- Use `interface` for object shapes, `type` for unions/intersections
- Define option types inline in modules when simple:
  ```typescript
  type RunnerOptions = {
    name: string;
    environment: Environment;
  };
  ```
- Export interfaces from `src/types/` for shared types
- Prefer explicit types over inference for function parameters
- Use optional properties (`prop?: Type`) not `| undefined`

### Naming Conventions

| Element         | Convention            | Example                               |
| --------------- | --------------------- | ------------------------------------- |
| Files           | kebab-case            | `configuration.ts`                    |
| Classes         | PascalCase            | `Configuration`, `Runner`             |
| Interfaces      | PascalCase            | `Step`, `Template`                    |
| Functions       | camelCase             | `setupRunCommand`, `runPipelineSteps` |
| Variables       | camelCase             | `stepInstance`, `defaultImage`        |
| Constants       | SCREAMING_SNAKE_CASE  | `DEFAULT_PIPELINE_NAME`               |
| Private members | camelCase (no prefix) | `private docker: Docker`              |

### Classes

- Use classes for stateful modules (Runner, Instance, Configuration)
- Private members first, then constructor, then private methods, then public methods
- Constructor accepts an options object for multiple parameters
- No explicit `public` keyword (it's the default)

```typescript
export class Runner {
  private name: string;
  private instance: Instance;

  constructor(options: RunnerOptions) {
    this.name = options.name;
  }

  private async runPipelineStep(step: Step) {}

  async runPipelineSteps() {}
}
```

### Error Handling

- Use try/catch for async operations that may fail
- Check `error instanceof Error` before accessing `.message`
- Display errors via `ui.text()` with `{ fg: 'red' }`
- Exit with `process.exit()` on fatal errors (no exit codes currently)

```typescript
try {
  await this.docker.ping();
} catch {
  ui.text('- Docker is not available', { fg: 'red' });
  process.exit();
}
```

### Console Output

Never use `console.log`. Use the `ui` module from `@/lib/ui.js`:

```typescript
import * as ui from '@/lib/ui.js';

ui.text('Message'); // Standard output
ui.text('Error', { fg: 'red' }); // Error (red)
ui.text('Success', { fg: 'green' }); // Success (green)
ui.text('Title', { bold: true }); // Bold text
ui.box('Section Title'); // Boxed header
ui.divider(); // Horizontal line
ui.output(multilineString); // Code/output block
```

### Path Aliases

Use `@/` alias for all imports from `src/`:

```typescript
// Correct
import { Runner } from '@/modules/runner.js';

// Incorrect
import { Runner } from '../../modules/runner.js';
```

The alias is resolved by `tsc-alias` during build.

### ESLint Rules

- `no-console: warn` - Use `ui.*` functions instead of console

## Key Dependencies

| Package    | Purpose                                         |
| ---------- | ----------------------------------------------- |
| commander  | CLI framework                                   |
| dockerode  | Docker API client                               |
| js-yaml    | YAML parsing                                    |
| chalk (v4) | Terminal colors (CJS version for compatibility) |
| dotenv     | Environment file parsing                        |
| tar-fs     | Archive creation/extraction                     |
| globby     | File pattern matching                           |
| lodash     | Utility functions (use `_.get` for deep access) |

## Common Patterns

### Adding a New Command

1. Create `src/commands/newcommand.ts`
2. Export setup function: `export const setupNewCommand = (program: Command) => ...`
3. Register in `src/index.ts`

### Adding a New Module

1. Create class in `src/modules/`
2. Export from module file
3. Instantiate in Runner or command as needed

### Adding New Types

1. Create interface in `src/types/newtypes.ts`
2. Export from `src/types/index.ts`
