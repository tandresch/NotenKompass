#!/usr/bin/env node
/*
 One-time migration script: copy /randomNames -> /students in Realtime Database.
 Usage:
   node scripts/migrate_randomNames_to_students.js /path/to/serviceAccount.json https://<your-db>.firebaseio.com
 Or set env vars:
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
   FIREBASE_DATABASE_URL=https://<your-db>.firebaseio.com
 Then run:
   node scripts/migrate_randomNames_to_students.js

 The script will:
 - Abort if `/students` already exists (safety)
 - Abort if `/randomNames` does not exist
 - Convert the old shape into an array of student objects: { name: string, Klasse: string }
 - Write the new array to `/students`
 - Leave `/randomNames` intact (safe). To remove it, run the optional delete line shown in the script manually.
*/

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = process.argv[2] || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const databaseURL = process.argv[3] || process.env.FIREBASE_DATABASE_URL;

if (!serviceAccountPath) {
  console.error('Error: service account JSON path required as first arg or set GOOGLE_APPLICATION_CREDENTIALS');
  process.exit(1);
}
if (!databaseURL) {
  console.error('Error: database URL required as second arg or set FIREBASE_DATABASE_URL');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = require(path.resolve(serviceAccountPath));
} catch (err) {
  console.error('Failed to load service account JSON:', err.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL.replace(/\/+$/, '')
});

const db = admin.database();

async function migrate() {
  const studentsRef = db.ref('students');
  const randomRef = db.ref('randomNames');

  const [studentsSnap, randomSnap] = await Promise.all([
    studentsRef.once('value'),
    randomRef.once('value')
  ]);

  if (studentsSnap.exists()) {
    console.log('Abort: /students already exists. No action taken.');
    process.exit(0);
  }

  if (!randomSnap.exists()) {
    console.log('Abort: /randomNames not found. Nothing to migrate.');
    process.exit(0);
  }

  const randomVal = randomSnap.val();
  let studentsVal = [];

  if (Array.isArray(randomVal)) {
    studentsVal = randomVal.map(item => {
      if (typeof item === 'string') return { name: item, Klasse: '' };
      if (item && typeof item === 'object' && item.name) return { name: item.name, Klasse: item.Klasse || '' };
      return { name: String(item), Klasse: '' };
    }).filter(Boolean);
  } else if (randomVal && typeof randomVal === 'object') {
    // object map or keyed list
    studentsVal = Object.values(randomVal).map(item => {
      if (typeof item === 'string') return { name: item, Klasse: '' };
      if (item && typeof item === 'object' && item.name) return { name: item.name, Klasse: item.Klasse || '' };
      return { name: String(item), Klasse: '' };
    }).filter(Boolean);
  } else {
    studentsVal = [{ name: String(randomVal), Klasse: '' }];
  }

  if (!studentsVal.length) {
    console.log('No student entries found to migrate.');
    process.exit(0);
  }

  await studentsRef.set(studentsVal);
  console.log(`Migration complete: wrote ${studentsVal.length} items to /students`);

  // Optional: remove the old key after you verify everything is ok.
  // To delete old data uncomment the following line and run again (or run manually from console):
  // await randomRef.remove();

  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
