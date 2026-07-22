/*
 * SECTION: Metro bundler config (Sentry Debug IDs)
 * WHAT: Expo Metro config wrapped so release bundles get Sentry Debug IDs.
 * HOW: getSentryExpoConfig from @sentry/react-native/metro
 * INPUT: project root (__dirname)
 * OUTPUT: Metro config for Expo start / EAS builds
 */
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
