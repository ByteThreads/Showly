import * as admin from 'firebase-admin';

// Helper function to format private key correctly
function formatPrivateKey(key: string): string {
  // Remove any surrounding quotes that might have been added
  let formattedKey = key.trim();

  // Remove leading/trailing quotes if present
  if ((formattedKey.startsWith('"') && formattedKey.endsWith('"')) ||
      (formattedKey.startsWith("'") && formattedKey.endsWith("'"))) {
    formattedKey = formattedKey.slice(1, -1);
  }

  // Replace escaped newlines with actual newlines
  formattedKey = formattedKey.replace(/\\n/g, '\n');

  return formattedKey;
}

// Initialize Firebase Admin SDK (singleton pattern)
if (!admin.apps.length) {
  // Try to use service account credentials if available
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    console.log('[Firebase Admin] Initializing with service account');
    console.log('[Firebase Admin] Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log('[Firebase Admin] Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('[Firebase Admin] Private Key starts with:', privateKey.substring(0, 30));
    console.log('[Firebase Admin] Private Key ends with:', privateKey.substring(privateKey.length - 30));

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } else {
    // Fall back to Application Default Credentials (works in Cloud environments)
    console.log('[Firebase Admin] Initializing with Application Default Credentials');
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
