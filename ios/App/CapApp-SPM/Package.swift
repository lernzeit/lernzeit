// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.0"),
        .package(name: "CapacitorCommunityAppleSignIn", path: "..\..\..\node_modules\@capacitor-community\apple-sign-in"),
        .package(name: "CapacitorApp", path: "..\..\..\node_modules\@capacitor\app"),
        .package(name: "CapacitorAppLauncher", path: "..\..\..\node_modules\@capacitor\app-launcher"),
        .package(name: "CapacitorBrowser", path: "..\..\..\node_modules\@capacitor\browser"),
        .package(name: "CapacitorLocalNotifications", path: "..\..\..\node_modules\@capacitor\local-notifications"),
        .package(name: "CapacitorPreferences", path: "..\..\..\node_modules\@capacitor\preferences"),
        .package(name: "CapacitorPushNotifications", path: "..\..\..\node_modules\@capacitor\push-notifications"),
        .package(name: "RevenuecatPurchasesCapacitor", path: "..\..\..\node_modules\@revenuecat\purchases-capacitor"),
        .package(name: "OnesignalCordovaPlugin", path: "../../capacitor-cordova-ios-plugins/sources/OnesignalCordovaPlugin")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunityAppleSignIn", package: "CapacitorCommunityAppleSignIn"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorAppLauncher", package: "CapacitorAppLauncher"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorLocalNotifications", package: "CapacitorLocalNotifications"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorPushNotifications", package: "CapacitorPushNotifications"),
                .product(name: "RevenuecatPurchasesCapacitor", package: "RevenuecatPurchasesCapacitor"),
                .product(name: "OnesignalCordovaPlugin", package: "OnesignalCordovaPlugin")
            ]
        )
    ]
)
