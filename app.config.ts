import type { ExpoConfig } from 'expo/config';

// Google OAuth client IDs come from env (.env.local) so they never live in source control.
// See README.md → "Google Drive setup".
const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? 'com.googleusercontent.apps.REPLACE_ME';

const config: ExpoConfig = {
  name: 'TrackIt',
  slug: 'trackit-app',
  scheme: 'trackit',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.terralogic.trackit',
  },
  android: {
    package: 'com.terralogic.trackit',
    adaptiveIcon: {
      backgroundColor: '#0E7C66',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro' },
  plugins: ['expo-router', 'expo-status-bar', ['@react-native-google-signin/google-signin', { iosUrlScheme }]],
};

export default config;
