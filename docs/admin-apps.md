# Cotton Candy Admin Apps

The private admin workspace is available in three ways:

1. **Browser workspace:** Sign in to the dedicated admin Render URL. Use **Enable alerts** to receive browser push notifications.
2. **Installable web app (PWA):** Use the dedicated admin URL on Android, iPhone, iPad, or desktop. iPhone users can install it from Safari using the steps below.
3. **Android APK:** Capacitor wraps the admin React build in the Android project at `client/android`.
4. **Windows installer:** Tauri wraps the same admin React build in `client/src-tauri` and creates an NSIS installer.

## Install the admin PWA on iPhone or iPad

Deploy the dedicated admin static site using the admin build (`npm run build:admin --workspace client`). On the iPhone or iPad:

1. Open the dedicated admin URL in Safari and sign in.
2. Tap **Share**, then **Add to Home Screen**.
3. Turn on **Open as Web App**, then tap **Add**.
4. Open **Cotton Candy** from the Home Screen and sign in if prompted.

The Home Screen icon opens the same secured admin website in a standalone window. This is a web app; it does not require an iOS IPA build. The public website build does not include the admin PWA manifest or service worker.

## Admin PWA order notifications

The admin PWA uses standard Web Push with VAPID keys. Firebase and a native app are not required. Notifications are sent for new booking or hire requests and customer order updates or cancellations.

### 1. Generate VAPID keys

From the repository root, run:

```powershell
npm exec --workspace server -- web-push generate-vapid-keys
```

Keep the private key secret. Configure these variables on the API service in Render:

```text
WEB_PUSH_PUBLIC_KEY={generated public key}
WEB_PUSH_PRIVATE_KEY={generated private key}
WEB_PUSH_SUBJECT=mailto:your-admin-email@example.com
```

The admin frontend fetches only the public key from the API. Never put the private key in the client app or commit it to Git.

### 2. Deploy and subscribe the admin PWA

Deploy the updated API and the dedicated admin static site, built with `npm run build:admin --workspace client`. Open the admin site over HTTPS, sign in, and select **Enable alerts**. On iPhone or iPad, first add the admin site to the Home Screen and open it from its Home Screen icon. Allow notifications when prompted.

### 3. Verify notifications

Submit a test booking or hire request from the public website. Then test a customer order update or cancellation. The PWA should show a system notification; tapping it opens the relevant admin list. Each browser or device must enable alerts separately.

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
