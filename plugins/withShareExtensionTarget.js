
const { withAppDelegate } = require('@expo/config-plugins');
const { createRunOncePlugin } = require('@expo/config-plugins');

/**
 * Advanced iOS Share Extension configuration using @bacons/apple-targets
 * This creates a native Share Extension target that appears in the iOS share sheet
 */
const withShareExtensionTarget = (config) => {
  // Add configuration for the share extension
  if (!config.extra) {
    config.extra = {};
  }
  
  if (!config.extra.targets) {
    config.extra.targets = [];
  }

  const bundleIdentifier = config.ios?.bundleIdentifier || 'ai.shopwell.app';
  const appGroupIdentifier = `group.${bundleIdentifier}`;

  // Define the Share Extension target
  const shareExtensionTarget = {
    type: 'app_extension',
    name: 'ShareExtension',
    bundleIdentifier: `${bundleIdentifier}.ShareExtension`,
    deploymentTarget: '13.0',
    frameworks: ['UIKit', 'Social', 'MobileCoreServices'],
    infoPlist: {
      CFBundleDisplayName: 'ShopWell.ai',
      CFBundleName: 'ShareExtension',
      CFBundleShortVersionString: config.version || '1.0.0',
      CFBundleVersion: config.ios?.buildNumber || '1',
      NSExtension: {
        NSExtensionAttributes: {
          NSExtensionActivationRule: {
            NSExtensionActivationSupportsWebURLWithMaxCount: 1,
            NSExtensionActivationSupportsWebPageWithMaxCount: 1,
            NSExtensionActivationSupportsText: true,
            NSExtensionActivationSupportsImageWithMaxCount: 10,
            NSExtensionActivationSupportsFileWithMaxCount: 1,
          },
        },
        NSExtensionPointIdentifier: 'com.apple.share-services',
        NSExtensionPrincipalClass: 'ShareViewController',
      },
    },
    entitlements: {
      'com.apple.security.application-groups': [appGroupIdentifier],
    },
  };

  config.extra.targets.push(shareExtensionTarget);

  return config;
};

module.exports = createRunOncePlugin(
  withShareExtensionTarget,
  'withShareExtensionTarget',
  '1.0.0'
);
