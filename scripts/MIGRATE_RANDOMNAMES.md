One-time migration: /randomNames -> /students

Purpose
- Copy legacy `/randomNames` data into the new canonical `/students` key with shape `[{ name, Klasse }, ...]`.

Prerequisites
- A Firebase service account JSON (Admin SDK) with Database access.
- Node.js installed locally.

Run
1. Place your service account JSON somewhere local, e.g. `./serviceAccountKey.json`.
2. Run with explicit args:

```bash
node scripts/migrate_randomNames_to_students.js ./serviceAccountKey.json https://<your-db>.firebaseio.com
```

Or set env vars and run without args:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
export FIREBASE_DATABASE_URL=https://<your-db>.firebaseio.com
node scripts/migrate_randomNames_to_students.js
```

Notes
- The script will abort if `/students` already exists (safe guard).
- The script leaves `/randomNames` intact. After verifying migration you can remove it from the Realtime Database console or uncomment the `remove()` line in the script and run again.
- If your legacy data already contained objects with `name` and optional `Klasse`, those values are preserved when possible.

Want me to add an `npm` script alias to `package.json` or run the migration now? Reply with "add-script" or "run-now".