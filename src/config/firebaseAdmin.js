import admin from 'firebase-admin';

let firebaseInitialized = false;

export const getFirebaseAdmin = () => {
  try {
    if (firebaseInitialized) {
      return admin;
    }

    const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;

    if (!credentialsJson) {
      console.warn('FIREBASE_ADMIN_CREDENTIALS is not set. Push notifications will be skipped.');
      return null;
    }

    const serviceAccount = JSON.parse(credentialsJson);

    const appOptions = {
      credential: admin.credential.cert(serviceAccount)
    };

    if (serviceAccount.project_id) {
      appOptions.projectId = serviceAccount.project_id;
    }

    admin.initializeApp(appOptions);

    firebaseInitialized = true;
    console.log('Firebase admin initialized for push notifications.');
    return admin;
  } catch (error) {
    console.error('Failed to initialize Firebase admin SDK:', error);
    return null;
  }
};

 