/*
 * SECTION: Expo app config
 * WHAT: Expo / EAS config including Sentry plugin for release source maps.
 * HOW: Same fields as former app.json; Sentry org/project are public slugs (not secrets).
 * INPUT: optional SENTRY_ORG / SENTRY_PROJECT env; SENTRY_AUTH_TOKEN only at build time
 * OUTPUT: ExpoConfig consumed by Expo CLI
 */
module.exports = {
  expo: {
    name: 'Macrio',
    slug: 'macrio',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'macrio',
    userInterfaceStyle: 'light',
    ios: {
      icon: './assets/expo.icon',
      supportsTablet: false,
      infoPlist: {
        NSCameraUsageDescription: 'Macrio uses the camera to scan food barcodes.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#DCFCE7',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['android.permission.CAMERA'],
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
          backgroundColor: '#16A34A',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Macrio uses the camera to scan food barcodes.',
        },
      ],
      'expo-localization',
      'expo-asset',
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          note: 'Use SENTRY_AUTH_TOKEN env to authenticate with Sentry when uploading source maps.',
          organization: process.env.SENTRY_ORG || 'macrio',
          project: process.env.SENTRY_PROJECT || 'macrio',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
