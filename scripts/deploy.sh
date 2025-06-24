#!/bin/bash
# Deploy the Going Merry Bets app to Firebase Hosting.
# Usage: ./scripts/deploy.sh [--token <FIREBASE_TOKEN>]

set -e

if ! command -v firebase >/dev/null 2>&1; then
  echo "Error: Firebase CLI is not installed." >&2
  echo "Install it with: npm install -g firebase-tools" >&2
  exit 1
fi

# Allow passing a token as argument or via environment variable
TOKEN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --token)
      TOKEN="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [ -n "$TOKEN" ]; then
  firebase deploy --token "$TOKEN"
else
  firebase deploy
fi
