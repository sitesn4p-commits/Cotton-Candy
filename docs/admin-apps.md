# Cotton Candy Admin Apps

The private admin workspace is available in three ways:

1. **Browser workspace:** Sign in to the dedicated admin Render URL. Use **Enable notifications** if you want browser push notifications on Chrome or Edge.
2. **Android APK:** Capacitor wraps the admin React build in the Android project at `client/android`.
3. **Windows installer:** Tauri wraps the same admin React build in `client/src-tauri` and creates an NSIS installer.

## Firebase push notifications

Firebase Cloud Messaging (FCM) delivers notifications for new booking requests, contact messages, order changes/cancellations, and newsletter signups. The API stores a device token only after the administrator grants notification permission.

### 1. Create the Firebase project

1. Open the [Firebase console](https://console.firebase.google.com/) and create a project named `Cotton Candy Admin`.
2. Add an **Android** app using this exact package name: `au.com.cottoncandyeventdeco.admin`.
3. Download `google-services.json` and put it at `client/android/app/google-services.json`. This file is ignored by Git.
4. Add a **Web** app. In Firebase Cloud Messaging, create a Web Push certificate and copy the public VAPID key.
5. In Firebase project settings, create a service-account private key JSON file. Keep it private.

### 2. Configure Render

On the **API** Render service, set:

```text
FIREBASE_SERVICE_ACCOUNT_JSON={the full service-account JSON on one line}
ADMIN_CLIENT_URL={the deployed admin Render URL without a trailing slash}
```

On the **admin static site** Render service, add the values from the Firebase web-app configuration:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

Redeploy the API and admin static site after saving these values. The Firebase web config and VAPID key are public client configuration; the service-account JSON must remain private.

### 3. Verify notifications

1. Open the admin app on the phone or desktop and sign in.
2. Allow notification permission when prompted.
3. Create a test booking or submit a contact message from the public website.
4. A system notification should open the relevant admin page when tapped.

## Build the Android APK

Install Android Studio, a JDK, Android SDK Platform/Build Tools, and Android SDK Platform-Tools. Then open a new PowerShell window and run:

```powershell
cd "E:\Cotton Candy\client"
npm run android:open
```

Android Studio opens the project. For a test APK use **Build → Build APK(s)**. The debug APK is normally written to:

```text
client/android/app/build/outputs/apk/debug/app-debug.apk
```

For customer distribution, create a release signing key in Android Studio and use **Build → Generate Signed Bundle / APK → APK**. Do not distribute a debug APK to customers.

## Build the Windows installer

Install the Windows prerequisites for Tauri: Rust (MSVC toolchain), Microsoft C++ Build Tools with **Desktop development with C++**, and Microsoft Edge WebView2. Then run:

```powershell
cd "E:\Cotton Candy\client"
npm run desktop:build
```

The NSIS installer is generated under `client/src-tauri/target/release/bundle/nsis`.

## Local app commands

```powershell
cd "E:\Cotton Candy\client"
npm run dev:admin
npm run android:sync
npm run desktop:dev
```

`desktop:dev` and `desktop:build` require the Tauri Windows prerequisites. `android:sync` prepares the native Android project but building the APK requires the Android Studio/JDK setup.
