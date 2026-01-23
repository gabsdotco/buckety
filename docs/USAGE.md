# Usage Guide

This guide covers all CLI commands, options, and practical examples for using Buckety.

## Prerequisites

Before using Buckety, ensure you have:

1. **Node.js >= 20** installed
2. **Docker** installed and running
3. A valid `bitbucket-pipelines.yml` file in your project

## Installation

```bash
# Install globally with npm
npm install -g buckety

# Or with pnpm
pnpm add -g buckety

# Or run directly with npx
npx buckety run
```

## Basic Commands

### Run Command

The `run` command executes a pipeline locally.

```bash
buckety run [pipeline] [options]
```

#### Arguments

| Argument   | Description          | Default   |
| ---------- | -------------------- | --------- |
| `pipeline` | Pipeline name to run | `default` |

#### Options

| Option               | Alias | Description                                 | Default                     |
| -------------------- | ----- | ------------------------------------------- | --------------------------- |
| `--template <path>`  | `-t`  | Path to pipeline YAML file                  | `./bitbucket-pipelines.yml` |
| `--variables <vars>` | `-v`  | Environment variables (file path or inline) | -                           |

## Examples

### Running the Default Pipeline

```bash
# Run from project root
buckety run

# Equivalent to
buckety run default
```

### Running Branch Pipelines

Pipeline names support path notation for nested pipelines:

```bash
# Run the 'develop' branch pipeline
buckety run branches:develop

# Run the 'main' branch pipeline
buckety run branches:main

# Run the 'feature/login' branch pipeline
buckety run branches:feature/login
```

### Running Tag Pipelines

```bash
# Run pipeline for version tags
buckety run tags:v*

# Run specific tag pipeline
buckety run tags:release-*
```

### Running Custom Pipelines

```bash
# Run a custom pipeline named 'deploy'
buckety run custom:deploy

# Run a custom pipeline named 'test-integration'
buckety run custom:test-integration
```

### Running Pull Request Pipelines

```bash
# Run default pull-request pipeline
buckety run pull-requests:**
```

## Environment Variables

### From a File

Load environment variables from a `.env` file:

```bash
# Load from .env in current directory
buckety run -v ./.env

# Load from custom path
buckety run -v ./config/.env.development
```

Example `.env` file:

```env
NODE_ENV=development
API_KEY=your-api-key
DATABASE_URL=postgres://localhost:5432/mydb
```

### Inline Variables

Pass variables directly on the command line:

```bash
# Single variable
buckety run -v "NODE_ENV=production"

# Multiple variables (comma-separated)
buckety run -v "NODE_ENV=production,API_KEY=secret123,DEBUG=true"
```

### Combining Options

```bash
# Custom template with environment file
buckety run branches:develop -t ./ci/pipelines.yml -v ./.env.ci
```

## Custom Pipeline Templates

By default, Buckety looks for `bitbucket-pipelines.yml` in the current directory. Use the `-t` option to specify a different file:

```bash
# Use a custom template
buckety run -t ./path/to/custom-pipelines.yml

# Run specific pipeline from custom template
buckety run custom:build -t ./ci/build-pipelines.yml
```

## Understanding Pipeline Output

Buckety provides an interactive TUI (Terminal User Interface) for monitoring pipeline execution in real-time.

### TUI Layout

```
┌────────────────────────────────┬─────────────────────────────────────────┐
│ ○ Build                        │ Setup                                   │
│ ◐ Test                         │   Creating container with image: node:20│
│ ○ Deploy                       │   Container created: abc1..xyz9         │
│                                │                                         │
│                                │ $ npm ci                                │
│                                │   added 150 packages in 5s              │
│                                │   found 0 vulnerabilities               │
│                                │                                         │
│ [↑↓] Navigate                  │ $ npm test                              │
│ [←→] Scroll                    │   PASS src/test.spec.ts                 │
└────────────────────────────────┴─────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Key       | Action                    |
| --------- | ------------------------- |
| `↑` / `k` | Navigate to previous step |
| `↓` / `j` | Navigate to next step     |
| `←` / `h` | Scroll output up          |
| `→` / `l` | Scroll output down        |
| `g`       | Jump to top of output     |
| `G`       | Jump to bottom of output  |
| `q`       | Quit the TUI              |

### Step Status Indicators

| Symbol | Status  | Color |
| ------ | ------- | ----- |
| `○`    | Pending | Dim   |
| `◐`    | Running | Blue  |
| `●`    | Success | Green |
| `✕`    | Failed  | Red   |

### Output Phases

Script output is organized into phases:

- **Setup** (magenta): Container creation and file copying
- **Script** (status color): User-defined script commands
- **Clean-up** (magenta): Container stopping and removal
- **Artifacts Upload** (cyan): Uploading artifacts from step
- **Artifacts Download** (cyan): Downloading artifacts to step

### Real-time Streaming

Script output is streamed in real-time as commands execute. ANSI color codes from commands like `npm`, `yarn`, or other CLI tools are preserved and rendered correctly.

### Auto-focus Behavior

- When a step starts, the TUI automatically focuses on it
- When a step completes, focus moves to the next step
- Manual navigation (using arrow keys) disables auto-focus until the next step starts

## Artifacts

Buckety supports artifacts defined in your pipeline. Artifacts from completed steps are automatically uploaded to subsequent steps.

```yaml
pipelines:
  default:
    - step:
        name: Build
        script:
          - npm run build
        artifacts:
          - dist/**

    - step:
        name: Test
        script:
          # dist/ is automatically available from previous step
          - npm test
```

Artifacts are stored locally in `.buckety/artifacts/` during execution.

## Common Use Cases

### Testing Pipeline Changes

Before pushing pipeline configuration changes:

```bash
# Edit bitbucket-pipelines.yml
# Then test locally
buckety run

# Test specific branch pipeline
buckety run branches:feature/new-pipeline
```

### Debugging Build Failures

When a build fails in CI, reproduce locally:

```bash
# Run with same environment
buckety run branches:main -v ./.env.ci
```

### Running with Different Node Versions

If your pipeline uses different Node versions per step, ensure those images are available:

```yaml
# bitbucket-pipelines.yml
pipelines:
  default:
    - step:
        name: Test Node 18
        image: node:18
        script:
          - npm test

    - step:
        name: Test Node 20
        image: node:20
        script:
          - npm test
```

```bash
# Buckety will pull both images if needed
buckety run
```

## Troubleshooting

### Docker Not Running

```
Error: Cannot connect to Docker daemon
```

**Solution**: Start Docker Desktop or the Docker daemon.

### Pipeline Not Found

```
Error: Pipeline 'branches:feature/test' not found
```

**Solution**: Verify the pipeline name exists in your `bitbucket-pipelines.yml`.

### Image Pull Failures

```
Error: Failed to pull image 'custom/image:latest'
```

**Solution**: Ensure the image exists and you have access. For private registries, authenticate with `docker login` first.

### Permission Errors

```
Error: Permission denied
```

**Solution**: Ensure your user has permission to access Docker (may need `sudo` or adding user to `docker` group on Linux).

## Tips

1. **Add `.buckety/` to `.gitignore`**: The artifacts directory should not be committed.

2. **Use YAML Block Scalars**: For complex scripts that need exported variables:

   ```yaml
   script:
     - |-
       export FOO=bar
       echo $FOO
   ```

3. **Test Incrementally**: Test one step at a time when debugging complex pipelines.

4. **Match CI Environment**: Use the same Docker images locally that your CI uses.
