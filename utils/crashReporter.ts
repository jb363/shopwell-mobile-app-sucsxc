
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

interface CrashReport {
  timestamp: string;
  platform: string;
  deviceInfo: {
    brand: string | null;
    modelName: string | null;
    osName: string | null;
    osVersion: string | null;
    deviceYearClass: number | null;
    totalMemory: number | null;
  };
  appInfo: {
    version: string;
    buildNumber: string;
    expoVersion: string;
  };
  error: {
    message: string;
    stack?: string;
    name: string;
  };
  context?: any;
}

class CrashReporter {
  private crashes: CrashReport[] = [];
  private maxCrashes = 50;

  constructor() {
    console.log('[CrashReporter] Initializing crash reporter...');
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    try {
      // Handle unhandled promise rejections
      if (typeof global !== 'undefined') {
        // Track unhandled promise rejections
        if (typeof (global as any).HermesInternal === 'undefined') {
          // Non-Hermes environment
          try {
            (global as any).onunhandledrejection = (event: any) => {
              console.error('[CrashReporter] Unhandled promise rejection:', event?.reason);
              try {
                this.logCrash(event?.reason || new Error('Unhandled promise rejection'), {
                  type: 'unhandledRejection',
                  promise: event?.promise,
                });
              } catch (logError) {
                console.error('[CrashReporter] Error logging unhandled rejection:', logError);
              }
            };
          } catch (setupError) {
            console.error('[CrashReporter] Error setting up unhandled rejection handler:', setupError);
          }
        }
      }

      // React Native ErrorUtils integration
      if (typeof ErrorUtils !== 'undefined') {
        try {
          const originalHandler = ErrorUtils.getGlobalHandler();
          
          ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
            console.error('[CrashReporter] Global error caught:', {
              isFatal,
              message: error?.message,
              stack: error?.stack,
            });
            
            try {
              this.logCrash(error, {
                isFatal,
                type: 'globalError',
              });
            } catch (logError) {
              console.error('[CrashReporter] Error logging global error:', logError);
            }
            
            // Call original handler if it exists
            if (originalHandler) {
              try {
                originalHandler(error, isFatal);
              } catch (handlerError) {
                console.error('[CrashReporter] Error calling original handler:', handlerError);
              }
            }
          });
        } catch (setupError) {
          console.error('[CrashReporter] Error setting up ErrorUtils handler:', setupError);
        }
      }

      console.log('[CrashReporter] Global error handlers installed');
    } catch (error) {
      console.error('[CrashReporter] Error in setupGlobalHandlers:', error);
    }
  }

  async logCrash(error: Error, context?: any) {
    try {
      const deviceInfo = {
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        deviceYearClass: Device.deviceYearClass,
        totalMemory: Device.totalMemory,
      };

      const appInfo = {
        version: Constants.expoConfig?.version || 'unknown',
        buildNumber: Platform.select({
          ios: Constants.expoConfig?.ios?.buildNumber || 'unknown',
          android: Constants.expoConfig?.android?.versionCode?.toString() || 'unknown',
          default: 'unknown',
        }),
        expoVersion: Constants.expoConfig?.sdkVersion || 'unknown',
      };

      const crashReport: CrashReport = {
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        deviceInfo,
        appInfo,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        context,
      };

      // Store crash report
      this.crashes.push(crashReport);
      if (this.crashes.length > this.maxCrashes) {
        this.crashes.shift();
      }

      // Log to console with full details
      console.error('[CrashReporter] ═══════════════════════════════════════');
      console.error('[CrashReporter] CRASH REPORT');
      console.error('[CrashReporter] ═══════════════════════════════════════');
      console.error('[CrashReporter] Timestamp:', crashReport.timestamp);
      console.error('[CrashReporter] Platform:', crashReport.platform);
      console.error('[CrashReporter] Device:', `${deviceInfo.brand} ${deviceInfo.modelName}`);
      console.error('[CrashReporter] OS:', `${deviceInfo.osName} ${deviceInfo.osVersion}`);
      console.error('[CrashReporter] App Version:', `${appInfo.version} (${appInfo.buildNumber})`);
      console.error('[CrashReporter] Error:', error.name, '-', error.message);
      console.error('[CrashReporter] Stack:', error.stack);
      if (context) {
        console.error('[CrashReporter] Context:', JSON.stringify(context, null, 2));
      }
      console.error('[CrashReporter] ═══════════════════════════════════════');

      // Try to persist to storage for later retrieval
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const existingCrashes = await AsyncStorage.default.getItem('@shopwell/crash_reports');
        const crashes = existingCrashes ? JSON.parse(existingCrashes) : [];
        crashes.push(crashReport);
        
        // Keep only last 50 crashes
        if (crashes.length > 50) {
          crashes.splice(0, crashes.length - 50);
        }
        
        await AsyncStorage.default.setItem('@shopwell/crash_reports', JSON.stringify(crashes));
        console.log('[CrashReporter] Crash report saved to storage');
      } catch (storageError) {
        console.error('[CrashReporter] Failed to save crash report to storage:', storageError);
      }
    } catch (reportError) {
      console.error('[CrashReporter] Error creating crash report:', reportError);
    }
  }

  async getCrashReports(): Promise<CrashReport[]> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const existingCrashes = await AsyncStorage.default.getItem('@shopwell/crash_reports');
      return existingCrashes ? JSON.parse(existingCrashes) : [];
    } catch (error) {
      console.error('[CrashReporter] Error retrieving crash reports:', error);
      return [];
    }
  }

  async clearCrashReports() {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.removeItem('@shopwell/crash_reports');
      this.crashes = [];
      console.log('[CrashReporter] Crash reports cleared');
    } catch (error) {
      console.error('[CrashReporter] Error clearing crash reports:', error);
    }
  }

  async getLastCrash(): Promise<CrashReport | null> {
    const crashes = await this.getCrashReports();
    return crashes.length > 0 ? crashes[crashes.length - 1] : null;
  }
}

// Export singleton instance
export const crashReporter = new CrashReporter();

// Export helper function to manually log crashes
export function logCrash(error: Error, context?: any) {
  crashReporter.logCrash(error, context);
}

// Export helper to get crash reports
export async function getCrashReports(): Promise<CrashReport[]> {
  return crashReporter.getCrashReports();
}

// Export helper to get last crash
export async function getLastCrash(): Promise<CrashReport | null> {
  return crashReporter.getLastCrash();
}

// Export helper to clear crash reports
export async function clearCrashReports() {
  return crashReporter.clearCrashReports();
}
