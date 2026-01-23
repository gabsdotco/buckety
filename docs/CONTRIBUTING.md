# Contributing Guide

This guide covers how to set up the development environment, project structure, and guidelines for contributing to Buckety.

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm (recommended) or npm
- Docker (for testing)
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/gabsdotco/buckety.git
cd buckety

# Install dependencies
pnpm install

# Build the project
pnpm build

# Link for local development
pnpm link --global
```

### Development Workflow

```bash
# Run TypeScript compiler in watch mode
pnpm dev

# Build for production
pnpm build

# Lint code
pnpm lint

# Fix lint issues
pnpm lint:fix

# Format code
pnpm format
```

## Project Structure

```
buckety/
├── bin/
│   └── cli                    # Entry point (runs dist/index.js)
├── src/
│   ├── index.ts              # CLI setup with Commander.js
│   ├── commands/
│   │   ├── index.ts          # Command exports
│   │   └── run.ts            # Main 'run' command
│   ├── modules/
│   │   ├── runner.ts         # Pipeline orchestration
│   │   ├── instance.ts       # Docker container management
│   │   ├── image.ts          # Docker image handling
│   │   ├── configuration.ts  # YAML parsing
│   │   ├── environment.ts    # Env variable handling
│   │   └── artifacts.ts      # Artifact management
│   ├── tui/
│   │   ├── index.tsx         # TUI entry, cursor/screen management
│   │   ├── App.tsx           # Main layout, keyboard handlers
│   │   ├── types.ts          # TUI type definitions
│   │   ├── components/
│   │   │   ├── Sidebar.tsx   # Step list with status
│   │   │   ├── OutputPanel.tsx # Scrollable output view
│   │   │   ├── AnsiText.tsx  # ANSI color parser
│   │   │   └── PipelinePicker.tsx # Pipeline selection
│   │   └── hooks/
│   │       ├── usePipelineEvents.ts # Event state management
│   │       └── useTerminalDimensions.ts # Terminal size
│   ├── lib/
│   │   ├── ui.ts             # Terminal UI utilities
│   │   ├── events.ts         # Pipeline event emitter
│   │   └── regex.ts          # Validation patterns
│   └── types/
│       └── *.ts              # TypeScript interfaces
├── dist/                      # Compiled output
├── example/                   # Example project
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public functions
- Avoid `any` - use `unknown` if type is truly unknown

### Formatting

The project uses Prettier with the following settings:

```json
{
  "singleQuote": true,
  "tabWidth": 2,
  "semi": true,
  "trailingComma": "es5"
}
```

Run `pnpm format` before committing.

### Linting

ESLint is configured with TypeScript support. Run `pnpm lint` to check for issues.

## Adding New Features

### Adding a New Command

1. Create a new file in `src/commands/`:

```typescript
// src/commands/mycommand.ts
import { Command } from 'commander';

export const mycommand = new Command('mycommand')
  .description('Description of my command')
  .option('-o, --option <value>', 'Option description')
  .action(async (options) => {
    // Command implementation
  });
```

2. Export from `src/commands/index.ts`:

```typescript
export { mycommand } from './mycommand';
```

3. Register in `src/index.ts`:

```typescript
import { mycommand } from '@/commands';

program.addCommand(mycommand);
```

### Adding a New Module

1. Create a new file in `src/modules/`:

```typescript
// src/modules/mymodule.ts
export class MyModule {
  constructor(private options: MyModuleOptions) {}

  public async doSomething(): Promise<void> {
    // Implementation
  }
}
```

2. Export from `src/modules/index.ts` (if needed for external use).

## TUI Development

The TUI is built with React and Ink. Here are guidelines for TUI development:

### Component Structure

```typescript
// src/tui/components/MyComponent.tsx
import React from 'react';
import { Box, Text } from 'ink';

type MyComponentProps = {
  title: string;
  active?: boolean;
};

export function MyComponent({ title, active = false }: MyComponentProps) {
  return (
    <Box flexDirection="column">
      <Text bold={active}>{title}</Text>
    </Box>
  );
}
```

### Adding New Hooks

```typescript
// src/tui/hooks/useMyHook.ts
import { useState, useEffect } from 'react';

export function useMyHook() {
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    // Setup logic
    return () => {
      // Cleanup logic
    };
  }, []);

  return { value, setValue };
}
```

### Handling Pipeline Events

To add a new event type:

1. Add the event type to the `PipelineEvent` discriminated union in `src/lib/events.ts`.
2. Update `src/tui/reducers/pipelineReducer.ts` to handle the new event type in `handlePipelineEvent`.
3. Emit the event from the module using `this.reporter.emit({ type: 'my-event', data: ... })`.

```typescript
// src/lib/events.ts
export type PipelineEvent =
  | { type: 'my-event:start'; data: { value: string } }
  // ...

// In a module
this.reporter.emit({ type: 'my-event:start', data: { value: 'test' } });

// In src/tui/reducers/pipelineReducer.ts
case 'my-event:start':
  return addOutput(state, { text: `Started: ${event.data.value}`, type: 'info' });
```

### Testing TUI Changes

```bash
# Run the TUI with the example project
cd example && bun run ../src/index.ts run default

# Run a specific pipeline
cd example && bun run ../src/index.ts run custom:error-test
```

### TUI Design Guidelines

- **Monochrome with status colors**: Use color only for status indication
- **Minimal borders**: Prefer background colors (`#191919`) over excessive borders
- **Keyboard-first**: All interactions should be keyboard accessible
- **Real-time feedback**: Stream output as it arrives, don't buffer

### Adding New Types

1. Create or update files in `src/types/`:

```typescript
// src/types/mytype.ts
export interface MyType {
  property: string;
  optional?: number;
}
```

2. Export from `src/types/index.ts`:

```typescript
export type { MyType } from './mytype';
```

## Testing

### Manual Testing

Use the example project for testing:

```bash
# Navigate to example directory
cd example

# Run with local buckety
buckety run
```

### Testing Pipeline Changes

Create a test `bitbucket-pipelines.yml`:

```yaml
image: alpine:latest

pipelines:
  default:
    - step:
        name: Test
        script:
          - echo "Testing feature"
```

## Commit Guidelines

### Commit Message Format

Use conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

#### Types

| Type       | Description                         |
| ---------- | ----------------------------------- |
| `feat`     | New feature                         |
| `fix`      | Bug fix                             |
| `docs`     | Documentation changes               |
| `style`    | Code style (formatting, semicolons) |
| `refactor` | Code refactoring                    |
| `test`     | Adding/updating tests               |
| `chore`    | Maintenance tasks                   |

#### Examples

```
feat(runner): add support for parallel steps
fix(artifacts): handle empty artifact patterns
docs(readme): add installation instructions
refactor(instance): simplify container creation
```

## Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
3. **Make changes** and commit
4. **Push** to your fork:
   ```bash
   git push origin feature/my-feature
   ```
5. **Open a Pull Request** against `main`

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation updated (if applicable)
- [ ] Commit messages follow conventions

## Architecture Decisions

### Why Dockerode?

Dockerode provides a direct Node.js API to Docker, avoiding shell command parsing issues and providing better error handling.

### Why Commander.js?

Commander.js is a mature, well-documented CLI framework with excellent TypeScript support and a simple API.

### Why Class-Based Modules?

Classes provide clear instantiation, state management, and lifecycle control for components like containers and configurations.

## Known Issues & Limitations

See [Architecture - Limitations](./ARCHITECTURE.md#limitations) for current limitations.

## Getting Help

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Provide reproduction steps for bugs

## License

By contributing, you agree that your contributions will be licensed under the ISC License.
