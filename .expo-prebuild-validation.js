
const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
  'app.json',
  'package.json',
  'metro.config.js',
  'babel.config.js',
  'tsconfig.json',
];

const REQUIRED_DEPENDENCIES = [
  'expo',
  'expo-router',
  'react',
  'react-native',
];

// CRITICAL: Dependencies that MUST NOT be present
const FORBIDDEN_DEPENDENCIES = [
  // expo-file-system causes iOS build failures in Expo SDK 54+
  // The native Swift code has compilation errors
  // Use fetch() + FileReader instead
];

function validateFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing required file: ${filePath}`);
    return false;
  }
  console.log(`✅ Found: ${filePath}`);
  return true;
}

function validateJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    console.log(`✅ Valid JSON: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Invalid JSON in ${filePath}:`, error.message);
    return false;
  }
}

function validateAppJson() {
  const appJsonPath = path.join(__dirname, 'app.json');
  if (!validateJSON(appJsonPath)) {
    return false;
  }

  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  if (!appJson.expo) {
    console.error('❌ app.json missing "expo" configuration');
    return false;
  }

  if (!appJson.expo.name) {
    console.error('❌ app.json missing "expo.name"');
    return false;
  }

  if (!appJson.expo.slug) {
    console.error('❌ app.json missing "expo.slug"');
    return false;
  }

  console.log('✅ app.json is valid');
  return true;
}

function validatePackageJson() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!validateJSON(packageJsonPath)) {
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Check required dependencies
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  let hasAllRequired = true;
  for (const dep of REQUIRED_DEPENDENCIES) {
    if (!allDeps[dep]) {
      console.error(`❌ Missing required dependency: ${dep}`);
      hasAllRequired = false;
    }
  }

  // 🚨 CRITICAL: Check for forbidden dependencies
  let hasForbidden = false;
  for (const dep of FORBIDDEN_DEPENDENCIES) {
    if (allDeps[dep]) {
      console.error(`❌ CRITICAL: Forbidden dependency found: ${dep}`);
      console.error(`   This dependency causes iOS build failures (Exit Status 65)`);
      console.error(`   Remove it from package.json immediately!`);
      console.error(`   See BUILD_SAFETY_CRITICAL.md for details`);
      hasForbidden = true;
    }
  }

  if (hasForbidden) {
    console.error('\n🚨 BUILD WILL FAIL: Remove forbidden dependencies before building!');
    return false;
  }

  if (!hasAllRequired) {
    return false;
  }

  console.log('✅ package.json is valid');
  return true;
}

function validateMetroConfig() {
  const metroConfigPath = path.join(__dirname, 'metro.config.js');
  
  if (!fs.existsSync(metroConfigPath)) {
    console.error('❌ Missing metro.config.js');
    return false;
  }

  console.log('✅ metro.config.js exists');
  return true;
}

function validateBabelConfig() {
  const babelConfigPath = path.join(__dirname, 'babel.config.js');
  
  if (!fs.existsSync(babelConfigPath)) {
    console.error('❌ Missing babel.config.js');
    return false;
  }

  console.log('✅ babel.config.js exists');
  return true;
}

async function main() {
  console.log('\n🔍 Running pre-build validation...\n');

  let allValid = true;

  // Check required files exist
  for (const file of REQUIRED_FILES) {
    if (!validateFileExists(file)) {
      allValid = false;
    }
  }

  console.log('');

  // Validate specific files
  if (!validateAppJson()) allValid = false;
  if (!validatePackageJson()) allValid = false;
  if (!validateMetroConfig()) allValid = false;
  if (!validateBabelConfig()) allValid = false;

  console.log('');

  if (allValid) {
    console.log('✅ All validation checks passed!\n');
    console.log('📋 Build Safety Checklist:');
    console.log('   ✅ No forbidden dependencies in package.json');
    console.log('   ✅ All required files present');
    console.log('   ✅ Configuration files valid\n');
    console.log('🚀 Safe to proceed with build!\n');
    process.exit(0);
  } else {
    console.error('❌ Validation failed! Fix the errors above before building.\n');
    console.error('📖 For build issues, see BUILD_SAFETY_CRITICAL.md\n');
    process.exit(1);
  }
}

main();
