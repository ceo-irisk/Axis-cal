import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.axiscalendar.app',
  appName: 'Axis Calendar',
  webDir: 'build',
  server: {
    // Backend URL для production
    url: 'https://single-server-app.preview.emergentagent.com',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;
