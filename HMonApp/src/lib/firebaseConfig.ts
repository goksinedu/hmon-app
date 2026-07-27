/**
 * Firebase project configuration.
 *
 * Replace the placeholder values with the web-app config of your Firebase
 * project (Firebase console -> Project settings -> Your apps -> Web app).
 * See the README for step-by-step setup instructions.
 */
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

/** True once real credentials have been pasted in. */
export const isFirebaseConfigured = firebaseConfig.apiKey !== 'YOUR_API_KEY';
