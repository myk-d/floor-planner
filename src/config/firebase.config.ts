import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { dotenv, ENV } from './dotenv.config';

const firebaseConfig = {
	apiKey: dotenv.get(ENV.FIRE_API_KEY),
	authDomain: dotenv.get(ENV.FIRE_AUTH_DOMAIN),
	projectId: dotenv.get(ENV.FIRE_PROJECT_ID),
	storageBucket: dotenv.get(ENV.FIRE_STORAGE_BUCKET),
	messagingSenderId: dotenv.get(ENV.FIRE_MESSAGING_SENDER_ID),
	appId: dotenv.get(ENV.FIRE_APP_ID),
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseFirestore = getFirestore(firebaseApp);
export const firebaseProvider = new GoogleAuthProvider();

// Окремий Firebase-проєкт під цей застосунок — колекції без env-префіксу.
export const firebaseCollections = {
	projects: 'projects',
	catalog: 'catalog',
};
