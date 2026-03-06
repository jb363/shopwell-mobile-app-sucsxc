
# Voice Planner Integration Guide

## Overview
The native mobile app now supports voice recording for the voice planner feature. The native app handles:
1. Microphone permission requests
2. Audio recording (using expo-audio)
3. Converting audio to base64
4. Sending audio data to the web app for transcription

The web app needs to:
1. Listen for voice recording messages from the native bridge
2. Send the audio to the backend for transcription
3. Display the transcribed text in the voice planner UI

## Native → Web Message Flow

### 1. Voice Recording Started
When the user starts recording, the native app sends:
```javascript
{
  type: 'VOICE_RECORDING_STARTED'
}
```

### 2. Voice Recording Complete
When the user stops recording, the native app sends:
```javascript
{
  type: 'VOICE_RECORDING_COMPLETE',
  audioData: 'base64EncodedAudioString...',
  mimeType: 'audio/m4a'
}
```

### 3. Voice Recording Error
If an error occurs (permission denied, recording failed, etc.):
```javascript
{
  type: 'VOICE_RECORDING_ERROR',
  error: 'Error message string'
}
```

## Web → Native Message Flow

### Start Recording
To start voice recording from the web app:
```javascript
window.postMessage({
  type: 'natively.voice.startRecording'
}, '*');
```

### Stop Recording
To stop voice recording from the web app:
```javascript
window.postMessage({
  type: 'natively.voice.stopRecording'
}, '*');
```

## Web App Implementation

### Step 1: Add Message Listener
Add this to your web app's initialization code (e.g., in `public/index.html` or main app component):

```javascript
// Listen for voice recording messages from native app
window.addEventListener('message', function(event) {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    
    if (data.type === 'VOICE_RECORDING_STARTED') {
      console.log('[Voice Planner] Recording started');
      // Update UI to show recording in progress
      // e.g., show a pulsing microphone icon, timer, etc.
    }
    
    else if (data.type === 'VOICE_RECORDING_COMPLETE') {
      console.log('[Voice Planner] Recording complete, transcribing...');
      // Send audio to backend for transcription
      transcribeAudio(data.audioData, data.mimeType);
    }
    
    else if (data.type === 'VOICE_RECORDING_ERROR') {
      console.error('[Voice Planner] Recording error:', data.error);
      // Show error message to user
      alert('Voice recording failed: ' + data.error);
    }
  } catch (error) {
    console.error('[Voice Planner] Error handling message:', error);
  }
});
```

### Step 2: Create Voice Planner UI Component
Example React component for the voice planner:

```javascript
import React, { useState, useEffect } from 'react';

function VoicePlanner() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for voice recording messages
    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.type === 'VOICE_RECORDING_STARTED') {
          setIsRecording(true);
          setError(null);
        }
        
        else if (data.type === 'VOICE_RECORDING_COMPLETE') {
          setIsRecording(false);
          setIsTranscribing(true);
          
          // Send to backend for transcription
          fetch('/api/voice/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audioData: data.audioData,
              mimeType: data.mimeType
            })
          })
          .then(res => res.json())
          .then(result => {
            setIsTranscribing(false);
            setTranscribedText(result.text);
            // Process the transcribed text (e.g., create a plan)
          })
          .catch(err => {
            setIsTranscribing(false);
            setError('Transcription failed: ' + err.message);
          });
        }
        
        else if (data.type === 'VOICE_RECORDING_ERROR') {
          setIsRecording(false);
          setIsTranscribing(false);
          setError(data.error);
        }
      } catch (error) {
        console.error('Error handling voice message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const startRecording = () => {
    console.log('[Voice Planner] Starting recording...');
    window.postMessage({ type: 'natively.voice.startRecording' }, '*');
  };

  const stopRecording = () => {
    console.log('[Voice Planner] Stopping recording...');
    window.postMessage({ type: 'natively.voice.stopRecording' }, '*');
  };

  return (
    <div className="voice-planner">
      <h2>Voice Planner</h2>
      
      {error && (
        <div className="error">{error}</div>
      )}
      
      {isRecording && (
        <div className="recording-indicator">
          <span className="pulse">🎤</span> Recording...
        </div>
      )}
      
      {isTranscribing && (
        <div className="transcribing-indicator">
          Transcribing your voice...
        </div>
      )}
      
      {!isRecording && !isTranscribing && (
        <button onClick={startRecording}>
          Start Voice Planning
        </button>
      )}
      
      {isRecording && (
        <button onClick={stopRecording}>
          Stop Recording
        </button>
      )}
      
      {transcribedText && (
        <div className="transcribed-text">
          <h3>You said:</h3>
          <p>{transcribedText}</p>
        </div>
      )}
    </div>
  );
}

export default VoicePlanner;
```

### Step 3: Backend Transcription Endpoint
You need to create a backend endpoint that receives the base64 audio and transcribes it using Gemini or another speech-to-text service.

**Backend Requirements:**
- Endpoint: `POST /api/voice/transcribe`
- Request body:
  ```json
  {
    "audioData": "base64EncodedAudioString...",
    "mimeType": "audio/m4a"
  }
  ```
- Response:
  ```json
  {
    "text": "Transcribed text from the audio",
    "confidence": 0.95
  }
  ```

**Implementation using Gemini:**
The backend should:
1. Decode the base64 audio data
2. Send it to Google Gemini API for transcription (using gemini-3-flash or gemini-3-pro)
3. Return the transcribed text

## Quick Actions Integration
The native app already has a "Voice Planner" quick action configured. When the user triggers it:
1. The app sends a `QUICK_ACTION` message with `action: 'VOICE_PLANNER'`
2. Your web app should listen for this and automatically start the voice recording

Example:
```javascript
window.addEventListener('message', function(event) {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    
    if (data.type === 'QUICK_ACTION' && data.action === 'VOICE_PLANNER') {
      console.log('[Voice Planner] Quick action triggered');
      // Navigate to voice planner page or open voice planner modal
      // Then automatically start recording
      window.postMessage({ type: 'natively.voice.startRecording' }, '*');
    }
  } catch (error) {
    console.error('Error handling quick action:', error);
  }
});
```

## Feature Detection
Check if voice recording is available:
```javascript
if (window.nativeFeatures && window.nativeFeatures.voiceRecording) {
  console.log('Voice recording is available');
  // Show voice planner UI
} else {
  console.log('Voice recording not available (web browser)');
  // Hide voice planner UI or show alternative input method
}
```

## Testing
1. **iOS**: Long-press the app icon → Select "Voice Planner" → Should start recording
2. **Android**: Long-press the app icon → Select "Voice Planner" → Should start recording
3. **In-app**: Tap the voice planner button → Should request microphone permission → Start recording
4. **Permissions**: If permission is denied, should show error message

## Audio Format
- **iOS**: Records in `audio/m4a` format (AAC codec)
- **Android**: Records in `audio/m4a` format (AAC codec)
- **Quality**: HIGH_QUALITY preset (44.1kHz sample rate, 128kbps bitrate)

## Error Handling
Common errors and how to handle them:
- `"Microphone permission denied"` → Show permission request UI
- `"No active recording"` → User tried to stop when not recording
- `"Recording failed"` → Generic recording error, try again

## Next Steps for Web Team
1. ✅ Add message listener for voice recording events
2. ✅ Create voice planner UI component
3. ✅ Implement backend transcription endpoint (using Gemini)
4. ✅ Handle quick action trigger
5. ✅ Add error handling and user feedback
6. ✅ Test on both iOS and Android devices

## Support
If you encounter issues:
1. Check browser console for `[Voice Planner]` logs
2. Verify the native bridge is ready (`window.nativeAppReady === true`)
3. Ensure microphone permissions are granted
4. Test the backend transcription endpoint separately
