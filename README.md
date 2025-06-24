# Going Merry Bets Deployment

This repository contains a simple Firebase web app. Use the provided deployment
script and workflow to publish changes to Firebase Hosting.

## Prerequisites

- [Firebase CLI](https://firebase.google.com/docs/cli) installed (`npm install -g firebase-tools`)
- Access to the Firebase project configured for this app
- A valid `FIREBASE_TOKEN` (generated via `firebase login:ci`)

## Deploying Manually

Run the script from the project root:

```bash
./scripts/deploy.sh --token YOUR_FIREBASE_TOKEN
```

If the `FIREBASE_TOKEN` environment variable is set, you can omit the `--token`
argument.

## GitHub Actions Workflow

A workflow file is provided in `.github/workflows/migrate.yml`. This workflow
runs automatically whenever a commit is pushed to the `migrate` branch. It
checks out the repository, installs the Firebase CLI, and runs the deployment
script.

To enable this workflow:

1. In your repository settings on GitHub, add a secret named
   `FIREBASE_TOKEN` containing a token generated with `firebase login:ci`.
2. Push any commit to the `migrate` branch. GitHub Actions will trigger the
   workflow and deploy the app using that token.

