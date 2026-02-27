# ShopWell.ai Mobile

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.

---

## 🐛 Debugging App Launch Crashes

If the app is crashing on launch, we have built-in crash diagnostics to help identify the issue.

### Accessing Crash Diagnostics

**Method 1: Deep Link** (if app opens briefly)
```
shopwellai://crash-diagnostics
```

**Method 2: Console Logs**
- All crashes are automatically logged with `[CrashReporter]` prefix
- Check the Expo dev tools console for detailed crash information
- Crashes include: device info, app version, error message, stack trace, and context

### What Gets Logged

Every crash report includes:
- **Device**: Brand, model, OS version, memory
- **App**: Version, build number, Expo SDK version
- **Error**: Name, message, full stack trace
- **Context**: Component/hook/function where crash occurred
- **Timestamp**: Exact time of crash
- **Fatal Status**: Whether the crash was fatal

### Recent Fixes Applied

✅ **React Hooks Violation Fixed** (Critical)
- `useQuickActions` was being called conditionally in try-catch block
- This violates React's Rules of Hooks and causes crashes
- **Fix**: All hooks now called unconditionally at component top level
- File: `app/(tabs)/(home)/index.ios.tsx`

✅ **ESLint Warnings Fixed**
- Added missing dependencies to useEffect arrays
- Fixed import ordering in errorLogger.ts
- All linting errors resolved

### Crash Diagnostics Screen

The app includes a dedicated crash diagnostics screen at `/crash-diagnostics` that shows:
- List of all crashes with full details
- Device and app information for each crash
- Stack traces for debugging
- Share button to export crash data as JSON
- Clear button to reset crash history

### Common Crash Causes

1. **React Hooks Violations**: Hooks called conditionally or in callbacks ✅ FIXED
2. **Permission Errors**: iOS tracking transparency, location, contacts
3. **WebView Issues**: Network errors, JavaScript injection failures
4. **Memory Issues**: Low memory on older devices
5. **Native Module Errors**: Expo modules not properly initialized

### Next Steps for Debugging

If crashes persist after these fixes:

1. **Check Console Logs**: Look for `[CrashReporter]` entries with full crash details
2. **Device-Specific**: Note if crashes only occur on specific iOS versions (e.g., iOS 16.7.14)
3. **Timing**: Check if crash happens immediately or after specific user action
4. **Permissions**: Check if related to permission requests (tracking, location, contacts)
5. **Share Crash Data**: Use the crash diagnostics screen to export and share crash reports

### Monitoring

- ✅ Global error handler installed
- ✅ All errors logged with full context
- ✅ Crash reports persisted to AsyncStorage
- ✅ Console logs include detailed initialization steps
- ✅ WebView errors captured and logged
- ✅ Permission request errors captured
