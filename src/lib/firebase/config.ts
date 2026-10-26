import rawConfig from '../../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

/**
 * Validates the loaded Firebase configuration to ensure all required fields are present
 * and correctly formatted. Fails immediately and explicitly if required fields are missing.
 */
export function validateFirebaseConfig(config: any): FirebaseClientConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Firebase configuration error: Configuration must be a non-null object.');
  }

  const requiredFields: (keyof FirebaseClientConfig)[] = [
    'projectId',
    'appId',
    'apiKey',
    'authDomain',
    'firestoreDatabaseId',
  ];

  for (const field of requiredFields) {
    if (!config[field] || typeof config[field] !== 'string' || !config[field].trim()) {
      throw new Error(`Firebase configuration error: Missing or empty required field '${field}'.`);
    }
  }

  if (!config.apiKey.startsWith('AIzaSy')) {
    throw new Error('Firebase configuration error: Invalid API key format (must start with standard prefix).');
  }

  return {
    projectId: config.projectId.trim(),
    appId: config.appId.trim(),
    apiKey: config.apiKey.trim(),
    authDomain: config.authDomain.trim(),
    firestoreDatabaseId: config.firestoreDatabaseId.trim(),
    storageBucket: config.storageBucket?.trim(),
    messagingSenderId: config.messagingSenderId?.trim(),
    measurementId: config.measurementId?.trim(),
    oAuthClientId: config.oAuthClientId?.trim(),
    recaptchaSiteKey: config.recaptchaSiteKey?.trim(),
  };
}

export const firebaseConfig: FirebaseClientConfig = validateFirebaseConfig(rawConfig);
