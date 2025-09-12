# Firebase Authentication Setup

This guide explains how to set up Firebase Authentication for your Tamil AI Tools application.

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps to create a new project
3. Give your project a name (e.g., "Tamil AI Tools")
4. Enable Google Analytics (optional but recommended)
5. Click "Create project"

## Step 2: Register Your Web App

1. On the Firebase project dashboard, click the web icon (</>) to add a web app
2. Give your app a nickname (e.g., "Tamil AI Web App")
3. Check the box for "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration object (apiKey, authDomain, etc.)

## Step 3: Update Firebase Configuration

1. Open `src/context/AuthContext.jsx` in your project
2. Replace the placeholder firebaseConfig object with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Step 4: Enable Authentication Methods

1. In the Firebase Console, go to "Authentication" in the left sidebar
2. Click on "Get started" or "Sign-in method" tab
3. Enable the authentication methods you want to use:
   - Email/Password (required for basic auth)
   - Google (used for "Sign in with Google" button)
   - Other providers as needed (Facebook, Twitter, etc.)

## Step 5: Install Dependencies and Run the App

1. Install the required dependencies:
   ```
   npm install firebase
   ```

2. Start the development server:
   ```
   npm start
   ```

## Authentication Features

The Firebase authentication setup provides the following features:

1. **User Registration**: Users can create new accounts with email and password
2. **User Login**: Existing users can sign in with email and password
3. **Google Sign-In**: Users can sign in with their Google accounts
4. **Password Reset**: Users can request password reset emails
5. **Profile Management**: Users can view and update their profile information
6. **Route Protection**: Certain routes require authentication to access

## How to Use

1. **Sign Up**: New users should visit `/signup` to create an account
2. **Log In**: Existing users can log in at `/login`
3. **Reset Password**: Users can reset their password at `/forgot-password`
4. **Profile**: Users can view and edit their profile at `/profile`

All protected routes (Metaphor Classifier, Lyric Generator, etc.) require users to be logged in.
