/**
 * Android Code Generation
 *
 * Android-specific code generation utilities for the bobbin.
 * Template generation, AIDL content, etc.
 *
 * > *"The bobbin holds the Android thread."*
 */

import type { GeneratedFile } from '../heddles/index.js';

export interface EventCallbackConfig {
  coreName: string;
  coreNamePascal: string;
  packageName: string;
  packagePath: string;
}

/**
 * Generate IEventCallback.aidl content.
 */
export function generateEventCallbackAidl(config: EventCallbackConfig): string {
  return `// IEventCallback.aidl
// Callback interface for ${config.coreName} events

package ${config.packageName};

interface IEventCallback {
    // Event is a JSON string representing ${config.coreNamePascal}Event
    oneway void onEvent(String eventJson);
}`;
}

/**
 * Write IEventCallback.aidl file and add to tracking.
 */
export function writeEventCallbackAidl(
  resolvedPackageDir: string,
  files: GeneratedFile[],
  config: EventCallbackConfig
): void {
  const callbackContent = generateEventCallbackAidl(config);
  const packagePath = config.packagePath;

  const callbackPath = `${resolvedPackageDir}/spire/android/aidl/${packagePath}/IEventCallback.aidl`;

  files.push({
    path: callbackPath,
    content: callbackContent,
  });
}
