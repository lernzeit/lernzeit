#!/usr/bin/env node
/**
 * Patch @capacitor-community/apple-sign-in's Android build.gradle to use
 * the optimize variant of the default ProGuard file. AGP 9+ removed support
 * for `getDefaultProguardFile('proguard-android.txt')` and fails the build
 * with: "getDefaultProguardFile('proguard-android.txt') is no longer supported".
 *
 * Runs automatically after `npm install` via the `postinstall` script.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(
  process.cwd(),
  "node_modules/@capacitor-community/apple-sign-in/android/build.gradle",
);

if (!existsSync(target)) {
  // Plugin not installed (e.g. web-only environment) — nothing to patch.
  process.exit(0);
}

const original = readFileSync(target, "utf8");
const needle = "getDefaultProguardFile('proguard-android.txt')";
const replacement = "getDefaultProguardFile('proguard-android-optimize.txt')";

if (!original.includes(needle)) {
  // Already patched or upstream fixed it.
  process.exit(0);
}

const patched = original.split(needle).join(replacement);
writeFileSync(target, patched, "utf8");
console.log(
  "[patch-apple-sign-in] Replaced proguard-android.txt with proguard-android-optimize.txt in @capacitor-community/apple-sign-in/android/build.gradle",
);