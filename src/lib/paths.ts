/**
 * Application path constants.
 */

import path from 'path';

/**
 * The root directory for Buckety temporary files and artifacts.
 * Located at .buckety in the current working directory.
 */
export const BUCKETY_DIR = path.resolve(process.cwd(), '.buckety');

/**
 * Temporary directory for extracting archives and other transient data.
 */
export const TEMP_DIR = path.join(BUCKETY_DIR, 'tmp');

/**
 * Directory where pipeline artifacts are stored.
 */
export const ARTIFACTS_DIR = path.join(BUCKETY_DIR, 'artifacts');

/**
 * Directory inside the container where the project source is mounted/copied.
 */
export const CONTAINER_WORKDIR = '/runner';
