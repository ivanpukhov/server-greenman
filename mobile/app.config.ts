import type { ExpoConfig, ConfigContext } from 'expo/config';

const API_URLS = {
  development: 'https://greenman.kz/api',
  preview: 'https://greenman.kz/api',
  production: 'https://greenman.kz/api',
} as const;

type Profile = keyof typeof API_URLS;

const profile = (process.env.EAS_BUILD_PROFILE as Profile) || 'development';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || API_URLS[profile];

const IS_DEV = profile === 'development';
const IS_PREVIEW = profile === 'preview';

const nameSuffix = IS_DEV ? ' (Dev)' : IS_PREVIEW ? ' (Preview)' : '';
const bundleSuffix = IS_DEV ? '.dev' : IS_PREVIEW ? '.preview' : '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: `Greenman${nameSuffix}`,
  slug: 'greenman-mobile',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'greenman',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: `kz.greenman.app${bundleSuffix}`,
  },
  android: {
    package: `kz.greenman.app${bundleSuffix.replace('.', '')}`,
    adaptiveIcon: {
      backgroundColor: '#e8f6ee',
      foregroundImage: './assets/images/android-icon-foreground.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    'expo-secure-store',
    'expo-localization',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiBaseUrl,
    profile,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
