
const {
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');
const { createRunOncePlugin } = require('@expo/config-plugins');

/**
 * Config plugin to add Android Share Target to the Expo app
 * This makes "ShopWell.ai Mobile" appear in the Android share sheet
 * 
 * The share target allows users to share:
 * - URLs from Chrome and other apps
 * - Text content
 * - Images
 * 
 * Shared content is passed to the main app via Intent extras and deep linking
 */
const withAndroidShareTarget = (config) => {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const mainActivity = mainApplication.activity?.find(
      (activity) => activity.$?.['android:name'] === '.MainActivity'
    );

    if (!mainActivity) {
      console.warn('[withAndroidShareTarget] MainActivity not found in AndroidManifest.xml');
      return config;
    }

    // Ensure intent-filter array exists
    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }

    const intentFilters = mainActivity['intent-filter'];

    // Check if SEND intent filter already exists
    const hasSendTextFilter = intentFilters.some((filter) =>
      filter.action?.some((action) => action.$?.['android:name'] === 'android.intent.action.SEND') &&
      filter.data?.some((data) => data.$?.['android:mimeType'] === 'text/plain')
    );

    // Add SEND intent filter for text/plain (URLs and text)
    if (!hasSendTextFilter) {
      console.log('[withAndroidShareTarget] Adding SEND intent filter for text/plain');
      intentFilters.push({
        action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:mimeType': 'text/plain' } }],
      });
    }

    // Check if SEND intent filter for images already exists
    const hasSendImageFilter = intentFilters.some((filter) =>
      filter.action?.some((action) => action.$?.['android:name'] === 'android.intent.action.SEND') &&
      filter.data?.some((data) => data.$?.['android:mimeType'] === 'image/*')
    );

    // Add SEND intent filter for image/*
    if (!hasSendImageFilter) {
      console.log('[withAndroidShareTarget] Adding SEND intent filter for image/*');
      intentFilters.push({
        action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:mimeType': 'image/*' } }],
      });
    }

    // Check if SEND_MULTIPLE intent filter already exists
    const hasSendMultipleFilter = intentFilters.some((filter) =>
      filter.action?.some((action) => action.$?.['android:name'] === 'android.intent.action.SEND_MULTIPLE')
    );

    // Add SEND_MULTIPLE intent filter for multiple images
    if (!hasSendMultipleFilter) {
      console.log('[withAndroidShareTarget] Adding SEND_MULTIPLE intent filter for image/*');
      intentFilters.push({
        action: [{ $: { 'android:name': 'android.intent.action.SEND_MULTIPLE' } }],
        category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
        data: [{ $: { 'android:mimeType': 'image/*' } }],
      });
    }

    console.log('[withAndroidShareTarget] ✅ Android share target configuration complete');

    return config;
  });
};

// Export as a run-once plugin to avoid duplicate execution
module.exports = createRunOncePlugin(
  withAndroidShareTarget,
  'withAndroidShareTarget',
  '1.0.0'
);
