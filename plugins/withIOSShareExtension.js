
const {
  withXcodeProject,
  withInfoPlist,
  withEntitlementsPlist,
  IOSConfig,
} = require('@expo/config-plugins');
const {
  createRunOncePlugin,
} = require('@expo/config-plugins');

/**
 * Config plugin to add iOS Share Extension to the Expo app
 * This makes "ShopWell.ai Mobile" appear in the iOS share sheet
 * 
 * The share extension allows users to share:
 * - URLs from Safari and other apps
 * - Text content
 * - Images
 * 
 * Shared content is passed to the main app via app groups and deep linking
 */
const withIOSShareExtension = (config) => {
  const bundleIdentifier = config.ios?.bundleIdentifier || 'ai.shopwell.app';
  const appGroupIdentifier = `group.${bundleIdentifier}`;

  // Step 1: Add app groups entitlement to main app
  config = withEntitlementsPlist(config, (config) => {
    if (!config.modResults['com.apple.security.application-groups']) {
      config.modResults['com.apple.security.application-groups'] = [];
    }
    
    const appGroups = config.modResults['com.apple.security.application-groups'];
    if (!appGroups.includes(appGroupIdentifier)) {
      appGroups.push(appGroupIdentifier);
    }
    
    return config;
  });

  // Step 2: Configure Info.plist for universal links and URL schemes
  config = withInfoPlist(config, (config) => {
    // Ensure CFBundleURLTypes exists for custom URL scheme
    if (!config.modResults.CFBundleURLTypes) {
      config.modResults.CFBundleURLTypes = [];
    }
    
    const urlTypes = config.modResults.CFBundleURLTypes;
    const hasShopWellScheme = urlTypes.some(
      (type) => type.CFBundleURLSchemes?.includes('shopwellaimobile')
    );
    
    if (!hasShopWellScheme) {
      urlTypes.push({
        CFBundleTypeRole: 'Editor',
        CFBundleURLName: bundleIdentifier,
        CFBundleURLSchemes: ['shopwellaimobile'],
      });
    }
    
    return config;
  });

  return config;
};

// Export as a run-once plugin to avoid duplicate execution
module.exports = createRunOncePlugin(
  withIOSShareExtension,
  'withIOSShareExtension',
  '1.0.0'
);
