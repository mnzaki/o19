import { Spiraler, SpiralRing, spiralOut } from '../pattern.js';

export interface AndroidServiceOptions {
  /** Name affix for the service (e.g., 'radicle' → IFoundframeRadicle) */
  nameAffix?: string;
  /** Android package name (default: ty.circulari.{coreName}) */
  packageName?: string;
  /** Gradle namespace for the Android module (e.g., 'ty.circulari.o19') */
  gradleNamespace?: string;
  /** Service class name (default: {PascalCase(coreName)}Service) */
  serviceClassName?: string;
}

export class AndroidSpiraler extends Spiraler {
  /** Service configuration options */
  serviceOptions: AndroidServiceOptions = {};

  constructor(innerRing: SpiralRing) {
    super(innerRing);
  }

  /**
   * Configure Android foreground service.
   * 
   * @param options - Service configuration
   * @returns SpiralOut configured for Android service
   * 
   * @example
   * const android = foundframe.android.foregroundService({ 
   *   nameAffix: 'radicle',
   *   gradleNamespace: 'ty.circulari.o19'
   * });
   * // Generates: IFoundframeRadicle AIDL interface
   */
  foregroundService(options: AndroidServiceOptions = {}) {
    this.serviceOptions = options;
    // The AndroidSpiraler itself is the outter - options are stored for generator use
    return spiralOut(this, {});
  }

  /**
   * Get the service name affix, or empty string if none set.
   */
  getNameAffix(): string {
    return this.serviceOptions.nameAffix ?? '';
  }

  /**
   * Get the Gradle namespace for the Android module.
   * Defaults to 'ty.circulari.{packageName}' if not set.
   */
  getGradleNamespace(packageName: string): string {
    return this.serviceOptions.gradleNamespace ?? `ty.circulari.${packageName}`;
  }
}
