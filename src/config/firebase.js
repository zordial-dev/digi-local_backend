const admin = require('firebase-admin');

let firebaseApp = null;

/**
 * Initializes Firebase Admin SDK using credentials from environment variables.
 */
function initFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('[Firebase] Credentials missing in .env - Firebase Admin SDK initialization skipped.');
      return null;
    }

    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });

    console.log(`[Firebase] Firebase Admin SDK initialized for project: ${projectId}`);
    return firebaseApp;
  } catch (err) {
    console.error('[Firebase] Failed to initialize Firebase Admin SDK:', err.message);
    return null;
  }
}

/**
 * Verifies a Firebase ID token sent from a client app (iOS/Android/Web).
 * @param {string} idToken - Firebase ID Token
 */
async function verifyFirebaseToken(idToken) {
  if (!idToken) {
    throw new Error('Firebase ID token is required');
  }

  const app = initFirebase();
  if (!app) {
    throw new Error('Firebase Admin SDK is not initialized on server');
  }

  console.log(`🔥 [FIREBASE VERIFY] Decoding Firebase ID Token (${idToken.slice(0, 15)}...)...`);
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log(`🔥 [FIREBASE TOKEN VERIFIED] SUCCESS!`);
    console.log(`   ├─ Firebase UID: ${decodedToken.uid}`);
    console.log(`   ├─ Phone Number: ${decodedToken.phone_number || 'N/A'}`);
    console.log(`   ├─ Issuer (iss): ${decodedToken.iss}`);
    console.log(`   └─ Auth Time: ${new Date(decodedToken.auth_time * 1000).toISOString()}`);

    return {
      uid: decodedToken.uid,
      phone_number: decodedToken.phone_number || null,
      email: decodedToken.email || null,
      decodedToken
    };
  } catch (err) {
    console.error(`🔥 [FIREBASE VERIFY FAILED] Error: ${err.message}`);
    throw err;
  }
}

function isFirebaseAvailable() {
  return !!firebaseApp;
}

// Attempt initialization on file require
initFirebase();

module.exports = {
  admin,
  initFirebase,
  verifyFirebaseToken,
  isFirebaseAvailable
};
