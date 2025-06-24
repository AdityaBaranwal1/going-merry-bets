const admin = require("firebase-admin");
const fs = require("fs");

// Initialize Firebase Admin SDK
const serviceAccount = require("./going-merry-bets-firebase-adminsdk-f6a8b-90174693b5.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Read bets from bets.json
const betsData = JSON.parse(fs.readFileSync("bets.json", "utf-8"));

// Function to upload bets to Firestore
async function uploadBets() {
  const batch = db.batch(); // Batch operation for bulk uploads
  const collectionRef = db.collection("bets");

  betsData.forEach((bet) => {
    const docRef = collectionRef.doc(); // Auto-generate document IDs
    batch.set(docRef, bet);
  });

  await batch.commit();
  console.log("Bets uploaded successfully!");
}

uploadBets().catch((error) => {
  console.error("Error uploading bets:", error);
});
