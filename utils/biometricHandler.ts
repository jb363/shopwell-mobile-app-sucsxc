
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

/**
 * Check if biometric authentication is supported and available
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    console.log('[BiometricHandler] 🔍 Checking biometric capabilities...');
    
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    console.log('[BiometricHandler] Has hardware:', hasHardware);
    
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    console.log('[BiometricHandler] Is enrolled:', isEnrolled);
    
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    console.log('[BiometricHandler] Supported types:', supportedTypes);
    
    const isAvailable = hasHardware && isEnrolled;
    console.log('[BiometricHandler] ✅ Is available:', isAvailable);
    
    return {
      isAvailable,
      hasHardware,
      isEnrolled,
      supportedTypes,
    };
  } catch (error) {
    console.error('[BiometricHandler] ❌ Error checking capabilities:', error);
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
    };
  }
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometrics(reason?: string): Promise<boolean> {
  try {
    console.log('[BiometricHandler] 🔐 Starting biometric authentication...');
    
    // Check if biometrics are available
    const capabilities = await checkBiometricCapabilities();
    
    if (!capabilities.isAvailable) {
      console.warn('[BiometricHandler] ⚠️ Biometrics not available');
      if (!capabilities.hasHardware) {
        console.log('[BiometricHandler] No biometric hardware detected');
      } else if (!capabilities.isEnrolled) {
        console.log('[BiometricHandler] No biometrics enrolled');
      }
      return false;
    }
    
    // Determine the prompt message based on platform and available biometric types
    let promptMessage = reason || 'Authenticate to continue';
    
    if (Platform.OS === 'ios') {
      if (capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        promptMessage = reason || 'Use Face ID to authenticate';
      } else if (capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        promptMessage = reason || 'Use Touch ID to authenticate';
      }
    } else if (Platform.OS === 'android') {
      promptMessage = reason || 'Use biometrics to authenticate';
    }
    
    console.log('[BiometricHandler] 📱 Showing biometric prompt:', promptMessage);
    
    // Perform authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow PIN/password fallback
      requireConfirmation: false,
    });
    
    console.log('[BiometricHandler] Authentication result:', result.success);
    
    if (result.success) {
      console.log('[BiometricHandler] ✅ Authentication successful');
    } else {
      console.log('[BiometricHandler] ❌ Authentication failed or cancelled');
    }
    
    return result.success;
  } catch (error) {
    console.error('[BiometricHandler] ❌ Error during authentication:', error);
    return false;
  }
}

/**
 * Get a user-friendly name for the biometric type
 */
export function getBiometricTypeName(capabilities: BiometricCapabilities): string {
  if (!capabilities.isAvailable) {
    return 'Not Available';
  }
  
  if (Platform.OS === 'ios') {
    if (capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    } else if (capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID';
    }
  } else if (Platform.OS === 'android') {
    if (capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face Unlock';
    } else if (capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    } else if (capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Scanner';
    }
  }
  
  return 'Biometric Authentication';
}

/**
 * Check if biometric authentication is supported (simple check)
 */
export async function isBiometricSupported(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    console.error('[BiometricHandler] Error checking support:', error);
    return false;
  }
}
