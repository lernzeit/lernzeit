// swift-tools-version: 5.9
import PackageDescription

// Ohne diese Datei war die Sperre in keinem iOS-Build enthalten.
//
// Capacitor 8 legt das iOS-Projekt mit dem Swift Package Manager an
// (`npx cap add ios` im Codemagic-Workflow) und nimmt nur Plugins auf, die eine
// Package.swift haben. Der podspec allein reichte nicht mehr: `cap add ios`
// meldete "lernzeit-screen-time does not have a Package.swift", das Plugin
// fehlte in CapApp-SPM, und auf dem Kind-iPhone stand "Diese App-Fassung hat
// die nötige Apple-Berechtigung nicht" (Befund 30.09.2026, Version 1.3.0).
//
// Der Paketname muss dem podspec-Namen entsprechen: Die CLI schreibt
// `.product(name: "LernzeitScreenTime", package: "LernzeitScreenTime")`.
let package = Package(
    name: "LernzeitScreenTime",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "LernzeitScreenTime",
            targets: ["ScreenTimePlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "ScreenTimePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/ScreenTimePlugin")
    ]
)
