# Firebase Admin SDK Setup

The Firebase Admin SDK is required for server-side operations like querying the database from API routes.

## Getting Your Firebase Admin Credentials

1. **Go to Firebase Console**: https://console.firebase.google.com
2. Select your project: **showly-b10ed**
3. Click the gear icon (⚙️) → **Project settings**
4. Navigate to the **Service accounts** tab
5. Click **Generate new private key**
6. A JSON file will download - **KEEP THIS SECURE!**

## Adding Credentials to .env.local

The downloaded JSON file will look like this:

```json
{
  "type": "service_account",
  "project_id": "showly-b10ed",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@showly-b10ed.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

### Extract These Values:

1. **FIREBASE_CLIENT_EMAIL**: Copy the `client_email` value
2. **FIREBASE_PRIVATE_KEY**: Copy the `private_key` value (including the `\n` characters)

### Add to .env.local:

```bash
# Firebase Admin SDK
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@showly-b10ed.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourActualPrivateKeyHere\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT**:
- Keep the quotes around the private key
- Don't remove the `\n` characters - they're needed
- Never commit this file to Git (it's already in .gitignore)

## Adding to Vercel (Production)

1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add both variables:
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
4. Make sure to add them to all environments (Production, Preview, Development)
5. Redeploy your app

## Security Notes

- **NEVER** commit the service account JSON file to Git
- **NEVER** share your private key publicly
- The `.env.local` file is already in `.gitignore`
- Only add these credentials to Vercel's secure environment variables
