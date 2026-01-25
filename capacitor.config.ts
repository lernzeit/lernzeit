import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.lernzeit.app',
  appName: 'LernZeit',
  webDir: 'dist',
  // Production configuration - remove server config for store builds
  // For development with hot reload, uncomment the server block below:
  // server: {
  //   url: 'https://4386b503-9ba8-4312-8a0f-77100fb5c6d8.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6',
      showSpinner: true,
      spinnerColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3b82f6',
      sound: 'beep.wav',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    }
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#3b82f6'
  },
  ios: {
    backgroundColor: '#3b82f6',
    contentInset: 'automatic'
  }
};

export default config;
