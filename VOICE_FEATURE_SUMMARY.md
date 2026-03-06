
# Voice Planner Feature - Implementation Summary

## What Was Implemented

### Native App (iOS & Android)
✅ **Voice Recording Capability**
- Added microphone permission handling
- Implemented audio recording using `expo-audio`
- Audio is recorded in high quality (44.1kHz, 128kbps)
- Audio is converted to base64 for transmission to web app

✅ **Native Bridge Messages**
- `natively.voice.startRecording` - Web → Native: Start recording
- `natively.voice.stopRecording` - Web → Native: Stop recording
- `VOICE_RECORDING_STARTED` - Native → Web: Recording started
- `VOICE_RECORDING_COMPLETE` - Native → Web: Audio data ready (base64)
- `VOICE_RECORDING_ERROR` - Native → Web: Error occurred

✅ **Quick Actions Integration**
- "Voice Planner" quick action already configured
- Triggers `QUICK_ACTION` message with `action: 'VOICE_PLANNER'`
- Works on both iOS (long-press app icon) and Android (long-press app icon)

✅ **Feature Flag**
- Added `voiceRecording: true` to `window.nativeFeatures`
- Web app can detect if voice recording is available

## What the Web Team Needs to Do

### 1. Add Message Listeners
Listen for voice recording messages from the native app:
- `VOICE_RECORDING_STARTED` - Update UI to show recording in progress
- `VOICE_RECORDING_COMPLETE` - Send audio to backend for transcription
- `VOICE_RECORDING_ERROR` - Show error message to user
- `QUICK_ACTION` (action: 'VOICE_PLANNER') - Auto-start voice planner

### 2. Create Voice Planner UI
- Button to start/stop recording
- Recording indicator (e.g., pulsing microphone icon)
- Transcription loading state
- Display transcribed text
- Error handling UI

### 3. Backend Transcription Endpoint
Create `POST /api/voice/transcribe` endpoint that:
- Accepts base64 audio data and mimeType
- Decodes base64 to audio file
- Sends to Google Gemini API for transcription
- Returns transcribed text

**Recommended API**: Google Gemini 3 Flash (fast, accurate, cost-effective)

### 4. Process Transcribed Text
Once you have the transcribed text:
- Parse it to extract plan details (items, quantities, dates, etc.)
- Create a shopping plan/list from the voice input
- Show confirmation to user
- Save to database

## Technical Details

### Audio Format
- **Format**: M4A (AAC codec)
- **Sample Rate**: 44.1kHz
- **Bitrate**: 128kbps
- **Encoding**: Base64 string

### Permissions
- Microphone permission is requested automatically when user starts recording
- If denied, error message is sent to web app
- User can grant permission in device settings

### Message Flow Example
```
User taps "Start Voice Planning" button
  ↓
Web app sends: { type: 'natively.voice.startRecording' }
  ↓
Native app requests microphone permission (if needed)
  ↓
Native app starts recording
  ↓
Native app sends: { type: 'VOICE_RECORDING_STARTED' }
  ↓
Web app shows "Recording..." UI
  ↓
User taps "Stop" button
  ↓
Web app sends: { type: 'natively.voice.stopRecording' }
  ↓
Native app stops recording and converts to base64
  ↓
Native app sends: { type: 'VOICE_RECORDING_COMPLETE', audioData: '...', mimeType: 'audio/m4a' }
  ↓
Web app sends audio to backend: POST /api/voice/transcribe
  ↓
Backend transcribes using Gemini
  ↓
Backend returns: { text: 'I need milk, eggs, and bread' }
  ↓
Web app processes text and creates shopping plan
```

## Files Modified
- `app/(tabs)/(home)/index.ios.tsx` - Added voice recording handlers
- `app/(tabs)/(home)/index.android.tsx` - Added voice recording handlers
- `VOICE_PLANNER_INTEGRATION.md` - Detailed integration guide for web team

## Testing Checklist
- [ ] iOS: Long-press app icon → "Voice Planner" → Recording starts
- [ ] Android: Long-press app icon → "Voice Planner" → Recording starts
- [ ] In-app: Tap voice button → Permission requested → Recording starts
- [ ] Recording indicator shows while recording
- [ ] Stop button stops recording
- [ ] Audio is sent to backend
- [ ] Transcription is displayed
- [ ] Error handling works (permission denied, etc.)

## Next Steps
1. Web team implements message listeners (see VOICE_PLANNER_INTEGRATION.md)
2. Backend team creates transcription endpoint using Gemini
3. Web team creates voice planner UI component
4. Test end-to-end flow on real devices
5. Deploy to production

## Questions?
Refer to `VOICE_PLANNER_INTEGRATION.md` for detailed implementation examples and code snippets.
