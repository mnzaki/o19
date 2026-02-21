/**
 * Android Generator
 *
 * Generates Android foreground service code from spiral patterns.
 * 
 * Matrix match: (AndroidSpiraler, RustCore) → Android bridge
 */

import * as path from 'node:path';
import { renderEjs } from '../shuttle/template-renderer.js';
import { ensureSpireDirectory, autoHookup } from '../shuttle/hookup-manager.js';
import type { SpiralNode, GeneratedFile } from '../heddles/index.js';
import { AndroidSpiraler } from '../../warp/spiral/spiralers/android.js';
import { RustCore } from '../../warp/spiral/core.js';

export interface AndroidGenerationOptions {
  /** Output directory for the generated crate */
  outputDir: string;
  /** Core crate name (e.g., "o19-foundframe") */
  coreCrateName: string;
  /** Android package name (e.g., "ty.circulari.o19") */
  packageName: string;
  /** Service name (e.g., "FoundframeRadicleService") */
  serviceName: string;
  /** Management methods to include in AIDL */
  methods?: Array<{
    name: string;
    returnType: string;
    params: Array<{ name: string; type: string }>;
    description?: string;
  }>;
}

/**
 * Generate Android foreground service files.
 * 
 * This is called when the matrix matches (AndroidSpiraler, RustCore).
 * It generates:
 * - Kotlin service class
 * - AIDL interface
 * - Cargo.toml
 * - build.rs (for AIDL compilation)
 */
export async function generateAndroidService(
  current: SpiralNode,
  previous: SpiralNode,
  options?: Partial<AndroidGenerationOptions>
): Promise<GeneratedFile[]> {
  const opts = options ?? {};
  const files: GeneratedFile[] = [];
  
  // Validate node types
  if (!(current.ring instanceof AndroidSpiraler)) {
    throw new Error('Expected AndroidSpiraler as current node');
  }
  if (!(previous.ring instanceof RustCore)) {
    throw new Error('Expected RustCore as previous node');
  }
  
  const core = previous.ring as RustCore;
  const android = current.ring as AndroidSpiraler;
  
  // Get metadata from the core
  const metadata = core.getMetadata();
  
  // Build options with defaults
  // Output goes to {package}/spire/ directory
  const packageDir = opts.outputDir ?? `o19/crates/${metadata.packageName}-android`;
  const fullOpts: AndroidGenerationOptions = {
    outputDir: path.join(packageDir, 'spire'),
    coreCrateName: opts.coreCrateName ?? metadata.crateName ?? 'o19-foundframe',
    packageName: opts.packageName ?? `ty.circulari.${metadata.packageName}`,
    serviceName: opts.serviceName ?? `${pascalCase(metadata.packageName)}Service`,
    methods: opts.methods ?? defaultMethods(),
  };
  
  // 1. Generate Kotlin service
  const serviceContent = await renderEjs({
    templateString: serviceTemplate,
    data: {
      packageName: fullOpts.packageName,
      serviceName: fullOpts.serviceName,
      logTag: fullOpts.serviceName.toUpperCase().replace(/\s/g, '_'),
      channelId: fullOpts.serviceName.toLowerCase().replace(/\s/g, '_'),
      channelName: fullOpts.serviceName,
      channelDescription: `Background service for ${metadata.packageName}`,
      notificationTitle: `${metadata.packageName} Service`,
      notificationText: 'Running in background',
      nativeLibName: 'android',
      homeDirName: `.${metadata.packageName}`,
    }
  });
  
  files.push({
    path: path.join(packageDir, 'android/java', fullOpts.packageName.replace(/\./g, '/'), 'service', `${fullOpts.serviceName}.kt`),
    content: serviceContent,
  });
  
  // 2. Generate AIDL interface
  const interfaceName = `I${pascalCase(metadata.packageName)}`;
  const aidlContent = await renderEjs({
    template: 'machinery/bobbin/templates/android/aidl_interface.aidl.ejs',
    data: {
      interfaceName,
      packageName: fullOpts.packageName,
      coreName: metadata.packageName,
      imports: [],
      methods: fullOpts.methods,
    }
  });
  
  files.push({
    path: path.join(packageDir, 'android/aidl', fullOpts.packageName.replace(/\./g, '/'), `${interfaceName}.aidl`),
    content: aidlContent,
  });
  
  // Ensure spire/ directory exists and is hooked up
  const spirePath = ensureSpireDirectory(packageDir, 'rust');
  const { hooked, type } = autoHookup(packageDir);
  
  if (hooked) {
    console.log(`  Hooked up spire module to ${type} package`);
  }
  
  // TODO: Hook up individual generated files to spire/mod.rs
  // addSpireSubmodule(packageDir, 'android_service', 'rust');
  
  return files;
}

function pascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('');
}

function defaultMethods() {
  // Default methods for the AIDL interface
  return [
    {
      name: 'getNodeId',
      returnType: 'String',
      params: [],
      description: 'Get the node ID',
    },
    {
      name: 'isNodeRunning',
      returnType: 'boolean',
      params: [],
      description: 'Check if node is running',
    },
  ];
}

// Inline template for the service (for testing, will move to file)
const serviceTemplate = `package <%= packageName %>.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Process
import android.util.Log

class <%= serviceName %> : Service() {
    
    companion object {
        private const val TAG = "<%= logTag %>"
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "<%= channelId %>"
        
        init {
            try {
                System.loadLibrary("<%= nativeLibName %>")
            } catch (e: Throwable) {
                Log.e(TAG, "Failed to load native library", e)
            }
        }
    }
    
    private external fun nativeStartService(homeDir: String, alias: String)
    
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "<%= channelName %>",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(Context.NOTIFICATION_SERVICE)?.let {
                (it as NotificationManager).createNotificationChannel(channel)
            }
        }
        startForeground(NOTIFICATION_ID, createNotification())
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val homeDir = getDir("<%= homeDirName %>", Context.MODE_PRIVATE).absolutePath
        val alias = intent?.getStringExtra("alias") ?: "android"
        
        Thread {
            try {
                nativeStartService(homeDir, alias)
            } catch (e: Exception) {
                Log.e(TAG, "Native service error", e)
            }
            stopSelf(startId)
        }.start()
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent): IBinder? = null
    
    private fun createNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            Notification.Builder(this)
        }
        return builder
            .setContentTitle("<%= notificationTitle %>")
            .setContentText("<%= notificationText %>")
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setOngoing(true)
            .build()
    }
}
`;
