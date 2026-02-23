
import { Audio } from 'expo-audio';
import { Platform } from 'react-native';

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    console.log('Requesting microphone permission...');
    const { status } = await Audio.requestPermissionsAsync();
    console.log('Microphone permission status:', status);
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
}

export async function hasMicrophonePermission(): Promise<boolean> {
  try {
    const { status } = await Audio.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    return false;
  }
}

export async function startRecording(): Promise<Audio.Recording | null> {
  try {
    console.log('Starting audio recording...');
    
    // Request permission if not already granted
    const hasPermission = await hasMicrophonePermission();
    if (!hasPermission) {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        console.log('Microphone permission denied');
        return null;
      }
    }

    // Set audio mode for recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = Audio.createRecordingAsync(
      Audio.RecordingPresets.HIGH_QUALITY
    );
    
    console.log('Recording started successfully');
    return recording;
  } catch (error) {
    console.error('Error starting recording:', error);
    return null;
  }
}

export async function stopRecording(recording: Audio.Recording): Promise<string | null> {
  try {
    console.log('Stopping recording...');
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log('Recording stopped, URI:', uri);
    return uri;
  } catch (error) {
    console.error('Error stopping recording:', error);
    return null;
  }
}

export async function pauseRecording(recording: Audio.Recording): Promise<boolean> {
  try {
    await recording.pauseAsync();
    console.log('Recording paused');
    return true;
  } catch (error) {
    console.error('Error pausing recording:', error);
    return false;
  }
}

export async function resumeRecording(recording: Audio.Recording): Promise<boolean> {
  try {
    await recording.startAsync();
    console.log('Recording resumed');
    return true;
  } catch (error) {
    console.error('Error resuming recording:', error);
    return false;
  }
}

export async function getRecordingStatus(recording: Audio.Recording) {
  try {
    const status = await recording.getStatusAsync();
    return status;
  } catch (error) {
    console.error('Error getting recording status:', error);
    return null;
  }
}
