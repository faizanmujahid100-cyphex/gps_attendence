# GIGCCL Student Mobile App

Android APK for student GPS attendance marking.

## Build APK

```bash
# Install dependencies
npm install

# Install EAS CLI (one time)
npm install -g eas-cli
eas login

# Configure EAS project (one time)
eas build:configure

# Build preview APK (faster, for testing)
eas build --platform android --profile preview

# Build production APK
eas build --platform android --profile production
```

The build runs on Expo's cloud servers. Once complete, a download link is provided.

## Local Development

```bash
npm start          # Start Expo dev server
npm run android    # Open on connected Android device/emulator
```

## Environment Setup

Edit `mobile/.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Distributing APK to Students

1. Download the `.apk` from Expo dashboard
2. Upload to Google Drive / WhatsApp
3. Students: Settings → Security → Unknown sources → Enable
4. Open the APK file to install
5. Login with GIGCCL email credentials
