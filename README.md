# Eira

Dating app for Android, built around chat and video. Adults 18 and older only.

The phone app is in `mobile`. The API and PostgreSQL database are in `server`. Sample profiles live in the local `vela` database.

## Run it locally

1. PostgreSQL is expected at `localhost:5432` with user `postgres` and password `postgres`.
2. Start the API:

```powershell
cd server
npm install
npm run seed
npm start
```

3. Start the app:

```powershell
cd mobile
npx expo start
```

On a phone, the app uses the saved server address, or `http://192.168.1.14:4000` if none is saved. The Android emulator should use `http://10.0.2.2:4000`.

Sample accounts all use the password `password123`:

- maya@vela.test
- arjun@vela.test
- leela@vela.test
- kabir@vela.test
- ananya@vela.test
- rohan@vela.test
- sara@vela.test
- dev@vela.test

Admin (ban, delete, and review of reports and uploaded photos or files): `admin@vela.test` with the same password. That account opens the admin screen instead of the dating deck.

Forgot password is on the sign-in screen. It emails a 6-digit code, then that code sets a new password. Add these lines to `server/.env` with a mailbox you control. For Gmail, `SMTP_PASS` is an app password, not the normal Gmail password.

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Eira <you@gmail.com>
```

Sign in as two of them (for example Maya and Arjun), like each other, then chat. Video calls need a native Android build, not Expo Go, because they use the camera.

```powershell
cd mobile
npx expo run:android
```

## Play Store

The package name is `com.eira.dating`. Adults only. Account deletion is under **You → Delete account**. Block and report are in each chat. The admin account can ban or delete people and review reports and uploads.

### 1. Put the API on the public internet

Buy a domain and host the `server` folder on a Linux machine or a Node host with PostgreSQL. Use HTTPS only. In `server/.env`:

- `DATABASE_URL` for that Postgres database, not your other local databases
- `JWT_SECRET` a long random string, different from the local one
- `PUBLIC_URL=https://api.yourdomain.com`
- `SUPPORT_EMAIL` an inbox you actually read
- `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL` so video works between mobile networks

Open these URLs in a browser before you submit:

- `https://api.yourdomain.com/legal/privacy`
- `https://api.yourdomain.com/legal/terms`
- `https://api.yourdomain.com/legal/support`
- `https://api.yourdomain.com/legal/copyright`

### 2. Point the Android app at that server

In `mobile/app.json`, set `expo-build-properties` → `android.usesCleartextTraffic` to `false`. Then build with the public address baked in:

```powershell
cd mobile
$env:EXPO_PUBLIC_API_URL="https://api.yourdomain.com"
npx eas build -p android --profile production
```

`eas.json` already has a production profile that makes an Android App Bundle (`.aab`). The first time, run `npx eas login` and `npx eas build:configure` if EAS asks. EAS can create and store the upload keystore for you. Keep that keystore. You need the same one for every future update.

To build on this PC instead:

```powershell
cd mobile
$env:EXPO_PUBLIC_API_URL="https://api.yourdomain.com"
npx expo prebuild --platform android
cd android
.\gradlew.bat bundleRelease
```

Create the upload keystore once and do not commit it:

```powershell
keytool -genkeypair -v -keystore eira-upload.keystore -alias eira -keyalg RSA -keysize 2048 -validity 10000
```

The bundle is `android/app/build/outputs/bundle/release/app-release.aab`.

### 3. Create the Play Console app

1. Sign up at [Google Play Console](https://play.google.com/console). A personal account has a one-time registration fee.
2. Create an app named Eira, type App, free or paid. Default language English.
3. Complete the store listing: short description, full description, app icon, feature graphic, and phone screenshots.
4. Set the privacy policy URL to `https://api.yourdomain.com/legal/privacy`.
5. Complete App content: privacy policy, ads (no), content rating (dating, 18+), target audience (18 and older), news app (no), data safety, and government apps (no).
6. Data safety should say you collect account info, photos, messages, and approximate location, that data is not sold, and that users can request deletion in the app.
7. New personal developer accounts usually must run a closed test with at least 12 testers for 14 days before production access is granted. Upload the same `.aab` to Closed testing first, add testers, and wait out that period if the console requires it.
8. Then create a Production release, upload the `.aab`, add release notes, and send it for review.

Camera, microphone, and location permissions are declared for calls and nearby people. Photos are used for the profile picture and chat.
