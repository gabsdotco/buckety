# Buckety Documentation

Buckety is a minimalist CLI tool for running Bitbucket Pipelines locally. It allows developers to test and debug their pipeline configurations on their local machines before pushing changes to the remote repository.

## Overview

Running CI/CD pipelines can be a time-consuming feedback loop - you push code, wait for the pipeline to run, and only then discover configuration issues. Buckety solves this by letting you execute your `bitbucket-pipelines.yml` locally using Docker containers, providing instant feedback.

## Key Features

- **Local Pipeline Execution**: Run Bitbucket Pipelines locally without pushing to remote
- **Interactive TUI**: Real-time terminal UI with step navigation, scrollable output, and colored script output
- **Docker Integration**: Full Docker container support for isolated execution environments
- **Environment Variables**: Load from `.env` files or pass inline via CLI
- **Artifact Support**: Transfer artifacts between pipeline steps
- **YAML Anchor Support**: Supports YAML anchors and aliases for reusable definitions
- **Multiple Pipeline Types**: Supports default, branches, tags, custom, and pull-requests pipelines
- **Real-time Streaming**: Script output is streamed in real-time as it executes

## Documentation

| Document                            | Description                                |
| ----------------------------------- | ------------------------------------------ |
| [Architecture](./ARCHITECTURE.md)   | System design, modules, and execution flow |
| [Usage](./USAGE.md)                 | CLI commands, options, and examples        |
| [Configuration](./CONFIGURATION.md) | Pipeline configuration and YAML schema     |
| [Contributing](./CONTRIBUTING.md)   | Development setup and contribution guide   |

## Quick Start

```bash
# Install globally
npm install -g buckety

# Run default pipeline
buckety run

# Run specific branch pipeline
buckety run branches:develop

# Run with environment variables
buckety run -v ./.env
```

## Requirements

- Node.js >= 20
- Docker (running)

## License

ISC
