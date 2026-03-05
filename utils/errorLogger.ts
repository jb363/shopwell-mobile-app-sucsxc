
import { Platform } from "react-native";
import Constants from "expo-constants";

// Muted messages to reduce noise
const MUTED_MESSAGES = [
  'Require cycle:',
  'VirtualizedLists should never be nested',
  'Non-serializable values were found',
  'Animated: `useNativeDriver`',
];

// Flush interval (ms)
const FLUSH_INTERVAL = 5000;

// In-memory log queue
let logQueue: any[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function shouldMuteMessage(message: string): boolean {
  return MUTED_MESSAGES.some(muted => message.includes(muted));
}

function getPlatformName(): string {
  if (Platform.OS === 'web') return 'Web';
  if (Platform.OS === 'ios') return 'iOS';
  if (Platform.OS === 'android') return 'Android';
  return Platform.OS;
}

function getLogServerUrl(): string {
  if (Platform.OS === 'web') {
    return '/natively-logs';
  }
  
  const devServerUrl = Constants.expoConfig?.hostUri;
  if (devServerUrl) {
    const baseUrl = devServerUrl.split(':')[0];
    return `http://${baseUrl}:8081/natively-logs`;
  }
  
  return 'http://localhost:8081/natively-logs';
}

async function flushLogs() {
  if (logQueue.length === 0) return;
  
  const logsToSend = [...logQueue];
  logQueue = [];
  
  try {
    const url = getLogServerUrl();
    
    // Send logs in batch
    for (const log of logsToSend) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(log),
        });
      } catch (error) {
        // Silently fail - don't log errors about logging
      }
    }
  } catch (error) {
    // Silently fail
  }
}

function queueLog(level: string, message: string, source: string) {
  if (shouldMuteMessage(message)) return;
  
  logQueue.push({
    timestamp: new Date().toISOString(),
    level,
    message,
    source,
    platform: getPlatformName(),
  });
  
  // Schedule flush if not already scheduled
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushLogs();
    }, FLUSH_INTERVAL);
  }
}

// Override console methods (lightweight version)
if (typeof console !== 'undefined') {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.log = function(...args: any[]) {
    originalLog.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    queueLog('log', message, 'console.log');
  };
  
  console.warn = function(...args: any[]) {
    originalWarn.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    queueLog('warn', message, 'console.warn');
  };
  
  console.error = function(...args: any[]) {
    originalError.apply(console, args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    queueLog('error', message, 'console.error');
  };
}
