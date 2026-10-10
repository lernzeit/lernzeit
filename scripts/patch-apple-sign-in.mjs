#!/usr/bin/env node
/**
 * Patcht die Android-build.gradle aller Capacitor-Plugins in node_modules:
 * `getDefaultProguardFile('proguard-android.txt')` → `…-optimize.txt`.
 * AGP 9+ bricht sonst ab mit "getDefaultProguardFile('proguard-android.txt')
 * is no longer supported". Betroffen waren am 10.10.2026 apple-sign-in,
 * native-biometric, in-app-review, local-notifications und push-notifications.
 *
 * Läuft automatisch nach `npm install` (postinstall). Name bleibt aus
 * Kompatibilität, obwohl längst mehr als apple-sign-in gepatcht wird.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const nm = resolve(process.cwd(), "node_modules");
if (!existsSync(nm)) process.exit(0);

const needle = "getDefaultProguardFile('proguard-android.txt')";
const replacement = "getDefaultProguardFile('proguard-android-optimize.txt')";

const pakete = [];
for (const name of readdirSync(nm)) {
  if (name.startsWith(".")) continue;
  if (name.startsWith("@")) {
    for (const sub of readdirSync(join(nm, name))) pakete.push(join(nm, name, sub));
  } else {
    pakete.push(join(nm, name));
  }
}

for (const paket of pakete) {
  for (const datei of [join(paket, "android", "build.gradle"), join(paket, "capacitor", "build.gradle")]) {
    if (!existsSync(datei)) continue;
    const alt = readFileSync(datei, "utf8");
    if (!alt.includes(needle)) continue;
    writeFileSync(datei, alt.split(needle).join(replacement), "utf8");
    console.log(`[patch-proguard] ${datei.slice(nm.length + 1)}: proguard-android.txt → proguard-android-optimize.txt`);
  }
}
