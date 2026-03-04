
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-proposal-export-namespace-from',
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './',
            '@/components': './components',
            '@/constants': './constants',
            '@/hooks': './hooks',
            '@/utils': './utils',
            '@/styles': './styles',
            '@/types': './types',
            '@/assets': './assets',
          },
        },
      ],
    ],
  };
};
