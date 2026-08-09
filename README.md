# Cotton Candy Event Deco

Full-stack event styling and hire platform with a React + TypeScript client, Express API, MongoDB and Cloudinary uploads.

## Run locally

1. Copy `server/.env.example` to `server/.env` and add `MONGODB_URI`, `CLOUDINARY_URL`, `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
2. Copy `client/.env.example` to `client/.env` if the API is not hosted at `http://localhost:5000/api`.
3. In MongoDB Atlas, add your current IP address in **Network Access** so the API can save requests and website content.
4. Run `npm install` from this folder.
5. Run `npm run dev`.

The customer site runs at `http://localhost:5173`. The private admin workspace is at `/manage-cotton-candy/sign-in`; it is intentionally not linked in the public site and uses the configured admin email and password.

## Admin content

The admin workspace has separate pages for services, hire items, categories, customer request statuses, contact messages, gallery images/videos, promotions and home hero images. All administrator uploads are stored in Cloudinary.

## Admin mobile and desktop apps

The dedicated admin workspace runs in the browser and is also packaged as a native Android app. The admin UI does not show a browser install action; use the Android APK when an installed mobile app is required.

The repository also contains native wrappers:

- Android Capacitor project: `client/android`
- Windows Tauri project: `client/src-tauri`

See `docs/admin-apps.md` for Firebase push notification setup and the exact APK/Windows installer commands.
