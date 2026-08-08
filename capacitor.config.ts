import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.lernzeit.app',
  appName: 'LernZeit',
  webDir: 'dist',
  // Store-Builds laden ausschliesslich das gebuendelte dist/ - kein server-Block.
  // Fuer lokale Entwicklung mit Hot Reload den Block einkommentieren und auf die
  // eigene Dev-Server-Adresse zeigen lassen (z. B. http://192.168.x.x:8080):
  // server: {
  //   url: 'http://192.168.1.100:8080',
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
      splashImmersive: true,
      iosSpinnerStyle: 'small'
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
    },
    OneSignal: {
      appId: '84cb5453-b878-47ca-aa31-1ec1405bdd5d'
    }
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#3b82f6'
  },
  ios: {
    backgroundColor: '#3b82f6',
    contentInset: 'automatic',
    scheme: 'LernZeit',
    limitsNavigationsToAppBoundDomains: true,
    preferredContentMode: 'mobile'
  }
};

export default config;
