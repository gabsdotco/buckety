/**
 * Shared Docker client instance to avoid multiple connections.
 */

import Docker from 'dockerode';

/**
 * Shared Docker client instance.
 * Using a single instance prevents creating multiple socket connections.
 */
export const docker = new Docker();
