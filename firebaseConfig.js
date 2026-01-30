// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "",
  authDomain: "slider-noten-app-db.firebaseapp.com",
  databaseURL: "https://slider-noten-app-db-default-rtdb.firebaseio.com",
  projectId: "slider-noten-app-db",
  storageBucket: "slider-noten-app-db.firebasestorage.app",
  messagingSenderId: "518655861199",
  appId: "1:518655861199:web:659c5ebce5be09ade3b2ba"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Realtime Database
const database = getDatabase(app);

export { database };
