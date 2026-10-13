import { existsSync } from "node:fs";
import type { ConfigContext, ExpoConfig } from "expo/config";

export default function configure({ config }: ConfigContext): ExpoConfig {
  const development =
    process.env.APP_ENV === "development" ||
    process.env.EAS_BUILD_PROFILE?.startsWith("development");
  const androidFile =
    process.env.FIREBASE_ANDROID_CONFIG || config.android?.googleServicesFile;
  const iosFile =
    process.env.FIREBASE_IOS_CONFIG || config.ios?.googleServicesFile;
  const androidConfigured = Boolean(androidFile && existsSync(androidFile));
  const iosConfigured = Boolean(iosFile && existsSync(iosFile));
  const platform = process.env.EAS_BUILD_PLATFORM;
  if (
    platform === "android" &&
    (!androidConfigured ||
      !(process.env.ANDROID_PACKAGE || config.android?.package))
  )
    throw new Error(
      "Supply FIREBASE_ANDROID_CONFIG and the registered ANDROID_PACKAGE before building.",
    );
  if (
    platform === "ios" &&
    (!iosConfigured ||
      !(process.env.IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier))
  )
    throw new Error(
      "Supply FIREBASE_IOS_CONFIG and the registered IOS_BUNDLE_IDENTIFIER before building.",
    );
  if (!development && process.env.EXPO_PUBLIC_API_URL?.startsWith("http:"))
    throw new Error("Production builds require an HTTPS ZAWANA API endpoint.");
  const nativePlugins = new Set([
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "react-native-nitro-google-signin",
    "expo-build-properties",
  ]);
  const plugins = (config.plugins ?? []).filter(
    (plugin) =>
      !nativePlugins.has(
        typeof plugin === "string" ? plugin : (plugin[0] ?? ""),
      ),
  );
  if (androidConfigured || iosConfigured)
    plugins.push("@react-native-firebase/app", "@react-native-firebase/auth");
  if (iosConfigured || process.env.GOOGLE_IOS_URL_SCHEME)
    plugins.push([
      "react-native-nitro-google-signin",
      {
        ...(process.env.GOOGLE_IOS_URL_SCHEME
          ? { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME }
          : {}),
      },
    ]);
  plugins.push("expo-apple-authentication", "expo-dev-client", [
    "expo-build-properties",
    {
      // RNFirebase 26 uses its default Swift Package Manager integration.
      ios: {},
      android: { usesCleartextTraffic: Boolean(development) },
    },
  ]);
  return {
    ...config,
    name: config.name ?? "zawana-mobile-app",
    slug: config.slug ?? "zawana-mobile-app",
    plugins,
    ios: {
      ...config.ios,
      usesAppleSignIn: true,
      ...(process.env.IOS_BUNDLE_IDENTIFIER
        ? { bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER }
        : {}),
      ...(iosConfigured ? { googleServicesFile: iosFile } : {}),
      infoPlist: {
        ...config.ios?.infoPlist,
        UIBackgroundModes: ["remote-notification"],
        ...(development
          ? {
              NSAppTransportSecurity: {
                NSAllowsLocalNetworking: true,
                NSAllowsArbitraryLoads: true,
              },
            }
          : {}),
      },
      entitlements: {
        ...config.ios?.entitlements,
        "aps-environment": development ? "development" : "production",
      },
    },
    android: {
      ...config.android,
      ...(process.env.ANDROID_PACKAGE
        ? { package: process.env.ANDROID_PACKAGE }
        : {}),
      ...(androidConfigured ? { googleServicesFile: androidFile } : {}),
    },
  };
}
