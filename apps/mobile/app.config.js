const { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } = process.env

export default {
  expo: {
    name: 'EmberMusic',
    slug: 'ember-music',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.embermusic.app',
      infoPlist: {
        UIBackgroundModes: ['audio'],
      },
    },
    android: {
      package: 'com.embermusic.app',
    },
    plugins: [
      'expo-router',
      'expo-sqlite',
      'expo-build-properties',
    ],
    scheme: 'embermusic',
    extra: {
      eas: {
        projectId: 'c1e95d18-aa12-4965-8446-55c9488d2358',
      },
      supabaseUrl: EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
}
