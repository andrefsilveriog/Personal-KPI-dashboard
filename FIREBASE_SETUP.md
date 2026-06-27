# Firebase Setup

This repo is already wired for Firebase Auth and Cloud Firestore. The app still works locally if Firebase is missing, but sign-in and cloud sync turn on when `.env.local` has the Firebase web app config.

## What Is Already Done In Code

- Firebase SDK installed.
- `.env.example` lists the required Vite variables.
- `.env.local` is git-ignored so real Firebase values stay local.
- Google sign-in is wired into the top bar.
- Firestore sync is wired to this data shape:

```txt
users/{uid}/settings/current
users/{uid}/workouts/{yyyy-mm-dd}
users/{uid}/habits/{yyyy-mm-dd}
users/{uid}/nutrition/{yyyy-mm-dd}
users/{uid}/spending/{entryId}
```

- Local browser storage remains as fallback/cache.
- First sign-in behavior:
  - If Firestore already has dashboard data, the app loads it.
  - If Firestore is empty, the app creates a blank dashboard with default settings.

## Firebase Console Checklist

Open the existing Firebase project and check these items.

### 1. Web App Config

Firebase Console -> Project settings -> General -> Your apps -> Web app.

The config values must exist in `.env.local`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

If any are missing, paste the Firebase config block into chat and Codex can update `.env.local`.

### 2. Authentication

Firebase Console -> Authentication -> Sign-in method.

Enable:

- Google

Then add authorized domains:

- `localhost`
- the GitHub Pages domain for this repo

### 3. Firestore Database

Firebase Console -> Firestore Database.

Create the database if it does not exist.

Use production mode. Pick the closest available region to where you will use the app most often.

### 4. Security Rules

Firebase Console -> Firestore Database -> Rules.

Paste the contents of `firestore.rules`:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Publish the rules.

## Validation

Run:

```bash
npm run typecheck
npm test
npm run build
```

Then start the app:

```bash
npm run dev
```

Expected result:

- Top bar shows a sync status pill.
- If Firebase config is present, the Sign in button is enabled.
- Sign in with Google.
- A new Firestore user starts with no logged workouts, habits, nutrition, or spending.
- Add or edit a metric.
- Status should move through `Saving` and return to `Synced`.
- Firestore should show documents under `users/{yourUserId}`.
