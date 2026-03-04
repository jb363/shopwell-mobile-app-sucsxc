
/**
 * Expo Prebuild Validation Script
 * This script validates configuration files before running expo prebuild
 * to prevent common build failures.
 * 
 * Run this automatically before prebuild to catch issues early.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_FILES = [
  'app.json',
  'package.json',
  'metro.config.js',
  'babel.config.js',
  'index.ts'
];

const REQUIRED_DEPENDENCIES = [
  'expo',
  'expo-router',
  'react',
  'react-native'
];

function validateFileExists(filePath) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required file missing: ${filePath}`);
  }
  console.log(`✓ Found: ${filePath}`);
}

function validateJSON(filePath) {
  const fullPath = path.join(__dirname, filePath);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    JSON.parse(content);
    console.log(`✓ Valid JSON: ${filePath}`);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function validateAppJson() {
  const appJsonPath = path.join(__dirname, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  const requiredFields = [
    'expo.name',
    'expo.slug',
    'expo.version',
    'expo.ios.bundleIdentifier',
    'expo.android.package'
  ];
  
  for (const field of requiredFields) {
    const keys = field.split('.');
    let value = appJson;
    for (const key of keys) {
      value = value?.[key];
    }
    if (!value) {
      throw new Error(`Missing required field in app.json: ${field}`);
    }
  }
  
  console.log('✓ app.json has all required fields');
}

function validatePackageJson() {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  for (const dep of REQUIRED_DEPENDENCIES) {
    if (!packageJson.dependencies?.[dep]) {
      throw new Error(`Missing required dependency: ${dep}`);
    }
  }
  
  console.log('✓ package.json has all required dependencies');
}

function validateMetroConfig() {
  const metroConfigPath = path.join(__dirname, 'metro.config.js');
  const content = fs.readFileSync(metroConfigPath, 'utf8');
  
  if (!content.includes('getDefaultConfig')) {
    throw new Error('metro.config.js must use getDefaultConfig from expo/metro-config');
  }
  
  if (!content.includes('module.exports')) {
    throw new Error('metro.config.js must export the config');
  }
  
  console.log('✓ metro.config.js is properly configured');
}

function validateBabelConfig() {
  const babelConfigPath = path.join(__dirname, 'babel.config.js');
  const content = fs.readFileSync(babelConfigPath, 'utf8');
  
  if (!content.includes('babel-preset-expo')) {
    throw new Error('babel.config.js must include babel-preset-expo preset');
  }
  
  if (!content.includes('module.exports')) {
    throw new Error('babel.config.js must export the config');
  }
  
  console.log('✓ babel.config.js is properly configured');
}

function main() {
  console.log('\n🔍 Validating Expo Prebuild Configuration...\n');
  
  try {
    console.log('Checking required files...');
    for (const file of REQUIRED_FILES) {
      validateFileExists(file);
    }
    
    console.log('\nValidating JSON files...');
    validateJSON('app.json');
    validateJSON('package.json');
    
    console.log('\nValidating app.json structure...');
    validateAppJson();
    
    console.log('\nValidating package.json dependencies...');
    validatePackageJson();
    
    console.log('\nValidating metro.config.js...');
    validateMetroConfig();
    
    console.log('\nValidating babel.config.js...');
    validateBabelConfig();
    
    console.log('\n✅ All validation checks passed! Safe to run expo prebuild.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    console.error('\nPlease fix the above issues before running expo prebuild.\n');
    process.exit(1);
  }
}

main();
