# Pipeline Configuration

This document describes the `bitbucket-pipelines.yml` configuration format and how Buckety interprets it.

## Overview

Buckety uses the same configuration format as Bitbucket Pipelines. Your existing `bitbucket-pipelines.yml` should work without modification.

## Basic Structure

```yaml
# Optional: Default Docker image for all steps
image: node:20

# Optional: Reusable definitions
definitions:
  steps:
    - step: &build-step
        name: Build
        script:
          - npm install
          - npm run build

# Pipeline definitions
pipelines:
  default:
    - step:
        name: Default Pipeline Step
        script:
          - echo "Running default pipeline"

  branches:
    main:
      - step:
          name: Main Branch Step
          script:
            - echo "Running on main"

    develop:
      - step:
          name: Develop Branch Step
          script:
            - echo "Running on develop"

  tags:
    'v*':
      - step:
          name: Version Tag Step
          script:
            - echo "Running on version tag"

  custom:
    deploy:
      - step:
          name: Deploy Step
          script:
            - echo "Deploying..."
```

## Configuration Reference

### Top-Level Keys

| Key           | Description                                | Required |
| ------------- | ------------------------------------------ | -------- |
| `image`       | Default Docker image for all steps         | No       |
| `definitions` | Reusable step definitions and YAML anchors | No       |
| `pipelines`   | Pipeline definitions                       | Yes      |

### Image

Specify the Docker image to use:

```yaml
# Simple image
image: node:20

# Image with specific registry
image: docker.io/library/node:20

# Image with credentials (not supported by Buckety)
image:
  name: my-registry/my-image:tag
```

#### Default Image

If no image is specified, Buckety uses: `atlassian/default-image:4`

### Steps

Each step runs in an isolated Docker container.

```yaml
- step:
    name: Build and Test # Optional: Display name
    image: node:18 # Optional: Override default image
    script: # Required: Commands to run
      - npm install
      - npm test
    artifacts: # Optional: Files to pass to next steps
      - dist/**
      - coverage/**
```

#### Step Properties

| Property    | Description                         | Required |
| ----------- | ----------------------------------- | -------- |
| `name`      | Display name for the step           | No       |
| `image`     | Docker image (overrides default)    | No       |
| `script`    | List of commands to execute         | Yes      |
| `artifacts` | Glob patterns for files to preserve | No       |

### Scripts

Scripts are executed sequentially in the container:

```yaml
script:
  # Simple commands
  - npm install
  - npm test

  # Multi-line commands (using YAML block scalar)
  - |-
    if [ "$NODE_ENV" = "production" ]; then
      npm run build:prod
    else
      npm run build
    fi

  # Commands with environment variable exports
  - |-
    export BUILD_ID=$(date +%s)
    echo "Build ID: $BUILD_ID"
    npm run build
```

> **Note**: Environment variables exported in one script line are NOT available in subsequent lines unless you use block scalars (`|-`) or chain commands with `&&`.

### Artifacts

Artifacts allow files to be passed between steps:

```yaml
- step:
    name: Build
    script:
      - npm run build
    artifacts:
      - dist/** # All files in dist/
      - package.json # Single file
      - coverage/lcov.info # Specific file in directory

- step:
    name: Deploy
    script:
      # dist/ is automatically available
      - ls dist/
```

#### Glob Patterns

| Pattern       | Description                  |
| ------------- | ---------------------------- |
| `**/*`        | All files in all directories |
| `dist/**`     | All files in dist/           |
| `*.js`        | All .js files in root        |
| `src/**/*.ts` | All .ts files in src/        |

### Definitions

Use definitions to create reusable steps with YAML anchors:

```yaml
definitions:
  steps:
    - step: &install-step
        name: Install Dependencies
        script:
          - npm ci

    - step: &test-step
        name: Run Tests
        script:
          - npm test

pipelines:
  default:
    - step: *install-step
    - step: *test-step

  branches:
    main:
      - step: *install-step
      - step: *test-step
      - step:
          name: Deploy
          script:
            - npm run deploy
```

## Pipeline Types

### Default Pipeline

Runs when no specific branch/tag pipeline matches:

```yaml
pipelines:
  default:
    - step:
        name: Default Step
        script:
          - echo "Default pipeline"
```

Run with: `buckety run` or `buckety run default`

### Branch Pipelines

Triggered for specific branches:

```yaml
pipelines:
  branches:
    main:
      - step:
          script:
            - echo "Main branch"

    develop:
      - step:
          script:
            - echo "Develop branch"

    'feature/*':
      - step:
          script:
            - echo "Feature branch"
```

Run with: `buckety run branches:main`

### Tag Pipelines

Triggered for specific tags:

```yaml
pipelines:
  tags:
    'v*':
      - step:
          script:
            - echo "Version tag"

    'release-*':
      - step:
          script:
            - echo "Release tag"
```

Run with: `buckety run tags:v*`

### Custom Pipelines

Manually triggered pipelines:

```yaml
pipelines:
  custom:
    deploy-staging:
      - step:
          script:
            - echo "Deploying to staging"

    deploy-production:
      - step:
          script:
            - echo "Deploying to production"
```

Run with: `buckety run custom:deploy-staging`

### Pull Request Pipelines

Triggered for pull requests:

```yaml
pipelines:
  pull-requests:
    '**':
      - step:
          script:
            - echo "Pull request pipeline"

    'feature/*':
      - step:
          script:
            - echo "Feature PR pipeline"
```

Run with: `buckety run pull-requests:**`

## Complete Example

```yaml
image: node:20

definitions:
  steps:
    - step: &install
        name: Install
        script:
          - npm ci
        artifacts:
          - node_modules/**

    - step: &build
        name: Build
        script:
          - npm run build
        artifacts:
          - dist/**

    - step: &test
        name: Test
        script:
          - npm test

pipelines:
  default:
    - step: *install
    - step: *build
    - step: *test

  branches:
    main:
      - step: *install
      - step: *build
      - step: *test
      - step:
          name: Deploy Production
          image: amazon/aws-cli:latest
          script:
            - aws s3 sync dist/ s3://my-bucket/

    develop:
      - step: *install
      - step: *build
      - step: *test
      - step:
          name: Deploy Staging
          script:
            - npm run deploy:staging

  custom:
    lint:
      - step: *install
      - step:
          name: Lint
          script:
            - npm run lint

    security-scan:
      - step: *install
      - step:
          name: Security Audit
          script:
            - npm audit
```

## Unsupported Features

The following Bitbucket Pipeline features are **not yet supported** by Buckety:

### Step Configuration

| Feature        | Description                                                | Bitbucket Docs                                   |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| `services`     | Service containers (databases, redis, elasticsearch, etc.) | Runs additional Docker containers alongside step |
| `caches`       | Dependency caching between builds                          | Caches directories like `node_modules`, `.m2`    |
| `size`         | Memory allocation (1x, 2x, 4x, 8x)                         | Controls container memory/CPU limits             |
| `max-time`     | Step timeout in minutes                                    | Default 120 min, max 120 min                     |
| `after-script` | Commands that always run after step                        | Runs regardless of step success/failure          |
| `clone`        | Repository clone settings                                  | Clone depth, LFS, submodules                     |

### Execution Control

| Feature     | Description                          | Bitbucket Docs                       |
| ----------- | ------------------------------------ | ------------------------------------ |
| `parallel`  | Parallel step execution              | Run multiple steps concurrently      |
| `stage`     | Group steps into stages              | Named groups with parallel execution |
| `trigger`   | Manual/automatic triggers            | `manual` requires user approval      |
| `condition` | Conditional step execution           | `changesets` to run on file changes  |
| `fail-fast` | Stop parallel steps on first failure | Default true for parallel steps      |

### Deployment & Security

| Feature                | Description                   | Bitbucket Docs                         |
| ---------------------- | ----------------------------- | -------------------------------------- |
| `deployment`           | Deployment environments       | `staging`, `production` with approvals |
| `oidc`                 | OpenID Connect authentication | Secure cloud provider authentication   |
| `runs-on`              | Self-hosted runners           | Run on custom infrastructure           |
| `aws-oidc`, `gcp-oidc` | Cloud-specific OIDC           | Native cloud authentication            |

### Image Configuration

| Feature             | Description           | Bitbucket Docs                        |
| ------------------- | --------------------- | ------------------------------------- |
| `image.username`    | Private registry auth | Username for private registries       |
| `image.password`    | Private registry auth | Password/token for private registries |
| `image.aws`         | ECR authentication    | AWS credentials for ECR               |
| `image.run-as-user` | Container user        | Run container as specific UID         |

### Pipes

| Feature | Description                  | Bitbucket Docs                        |
| ------- | ---------------------------- | ------------------------------------- |
| `pipe`  | Reusable pipeline components | Pre-built actions like deploy, notify |

Pipes are Bitbucket's reusable components (similar to GitHub Actions). They are defined as:

```yaml
# Not supported
- pipe: atlassian/aws-s3-deploy:1.1.0
  variables:
    AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID
    S3_BUCKET: my-bucket
```

**Workaround**: Replace pipes with equivalent shell commands in your `script` section.

### Variables & Secrets

| Feature              | Description                    | Bitbucket Docs                               |
| -------------------- | ------------------------------ | -------------------------------------------- |
| Secured variables    | Encrypted repository variables | Variables marked as secured in UI            |
| Deployment variables | Environment-specific variables | Variables scoped to deployments              |
| `$BITBUCKET_*`       | Built-in variables             | `BITBUCKET_COMMIT`, `BITBUCKET_BRANCH`, etc. |

**Workaround**: Pass variables via `.env` file or `-v` flag.

### Other Features

| Feature                    | Description                         |
| -------------------------- | ----------------------------------- |
| `options.docker`           | Docker-in-Docker support            |
| `options.max-time`         | Global timeout setting              |
| `definitions.services`     | Reusable service definitions        |
| `definitions.caches`       | Custom cache definitions            |
| SSH keys                   | Repository SSH key access           |
| Artifacts download options | `download: false` to skip artifacts |

## Validation

Buckety validates your configuration on load. Common errors:

| Error               | Cause                        | Solution                     |
| ------------------- | ---------------------------- | ---------------------------- |
| Invalid YAML syntax | Malformed YAML               | Check indentation and syntax |
| Pipeline not found  | Missing pipeline definition  | Verify pipeline name exists  |
| Missing script      | Step without script property | Add script to step           |
| Invalid image       | Malformed image reference    | Check image name format      |
