
# Build Safety Guide - Preventing "Failed to run expo prebuild" Errors

This guide documents the safeguards implemented to prevent expo prebuild failures.

## ✅ Implemented Safeguards

### 1. Configuration File Validation

**Validation Script**: `.expo-prebuild-validation.js`
- Automatically runs before any prebuild command
- Validates all critical configuration files
- Checks for common syntax errors and missing fields

**Usage**:
```bash
npm run validate        # Run validation manually
npm run prebuild        # Runs validation automatically before prebuild
npm run prebuild:android # Runs validation before Android prebuild
npm run prebuild:ios    # Runs validation before iOS prebuild
```

### 2. Required Files Checklist

The following files are validated before each build:

- ✅ `app.json` - Valid JSON with all required Expo fields
- ✅ `package.json` - Valid JSON with required dependencies
- ✅ `metro.config.js` - Properly configured Metro bundler
- ✅ `babel.config.js` - Babel preset configuration
- ✅ `index.ts` - Entry point file

### 3. app.json Safeguards

**Fixed Issues**:
- ❌ Removed trailing commas from intentFilters array
- ✅ Incremented versionCode to 20
- ✅ Incremented buildNumber to 1.0.18
- ✅ Added WRITE_CONTACTS permission for Android
- ✅ Validated all required fields exist

**Required Fields Validated**:
- `expo.name`
- `expo.slug`
- `expo.version`
- `expo.ios.bundleIdentifier`
- `expo.android.package`

### 4. metro.config.js Safeguards

**Fixed Issues**:
- ✅ Uses `getDefaultConfig` from `expo/metro-config`
- ✅ Properly exports configuration
- ✅ No deprecated dependencies (removed metro-cache)
- ✅ Safe error handling for file operations
- ✅ Proper middleware configuration

**Key Features**:
- Package exports enabled for better module resolution
- Asset extensions properly configured
- Custom logging middleware with error handling
- No breaking dependencies

### 5. babel.config.js Creation

**New File Created**:
- ✅ Uses `babel-preset-expo` (required for Expo SDK 54)
- ✅ Includes `react-native-reanimated/plugin`
- ✅ Module resolver for path aliases
- ✅ Export namespace support

### 6. package.json Updates

**New Scripts**:
- `npm run validate` - Validate configuration before build
- `npm run prebuild` - Safe prebuild with validation
- `npm run prebuild:android` - Safe Android prebuild
- `npm run prebuild:ios` - Safe iOS prebuild

**Dependencies**:
- ✅ Added `babel-preset-expo` to devDependencies
- ✅ All required dependencies present
- ✅ Compatible versions for Expo SDK 54

## 🛡️ How It Prevents Failures

### Before This Fix:
1. ❌ Missing `babel.config.js` → Build fails
2. ❌ Trailing comma in `app.json` → JSON parse error
3. ❌ Invalid metro config → Module not found errors
4. ❌ No validation → Errors discovered during build

### After This Fix:
1. ✅ Validation runs automatically before prebuild
2. ✅ All syntax errors caught early
3. ✅ Missing files detected before build starts
4. ✅ Clear error messages guide fixes
5. ✅ Build only proceeds if validation passes

## 🔍 Validation Checks

The validation script checks:

1. **File Existence**: All required files present
2. **JSON Syntax**: Valid JSON in app.json and package.json
3. **Required Fields**: All mandatory Expo fields exist
4. **Dependencies**: Critical packages installed
5. **Config Structure**: Metro and Babel configs properly formatted

## 🚨 If Validation Fails

The validation script will:
1. Stop the build process immediately
2. Display clear error message
3. Indicate which file/field has the issue
4. Exit with error code (prevents build from proceeding)

**Example Error Output**:
```
❌ Validation failed: Invalid JSON in app.json: Unexpected token } in JSON at position 1234

Please fix the above issues before running expo prebuild.
```

## 📋 Pre-Build Checklist

Before running any build command, ensure:

- [ ] All required files exist
- [ ] No syntax errors in JSON files
- [ ] All dependencies installed (`npm install`)
- [ ] Validation passes (`npm run validate`)
- [ ] Version codes incremented for new builds

## 🔧 Manual Validation

To manually validate your configuration:

```bash
npm run validate
```

This will check all configuration files and report any issues.

## 📝 Version History

- **v1.0.18** (iOS buildNumber) - Added validation safeguards
- **v20** (Android versionCode) - Fixed JSON syntax, added babel config
- Previous versions had intermittent prebuild failures

## 🎯 Key Takeaways

1. **Always run validation before prebuild**
2. **Never manually edit JSON files without validation**
3. **Keep babel.config.js and metro.config.js in sync with Expo SDK**
4. **Increment version codes for each new build**
5. **Use the provided npm scripts instead of direct expo commands**

## 🆘 Troubleshooting

If you still encounter prebuild errors:

1. Run `npm run validate` to identify issues
2. Check that all dependencies are installed
3. Verify no manual edits broke JSON syntax
4. Ensure Expo SDK version matches package versions
5. Clear cache: `rm -rf node_modules .expo android ios && npm install`

## 📚 Related Files

- `.expo-prebuild-validation.js` - Validation script
- `babel.config.js` - Babel configuration
- `metro.config.js` - Metro bundler configuration
- `app.json` - Expo app configuration
- `package.json` - Dependencies and scripts
