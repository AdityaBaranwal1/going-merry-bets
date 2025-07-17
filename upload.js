/* eslint-env node */
/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
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
    // Validate and normalize odds
    let odds_for, odds_against;
    if (bet.odds && typeof bet.odds.for === "number" && typeof bet.odds.against === "number") {
      odds_for = bet.odds.for;
      odds_against = bet.odds.against;
    } else if (typeof bet.odds_for === "number" && typeof bet.odds_against === "number") {
      odds_for = bet.odds_for;
      odds_against = bet.odds_against;
    } else {
      console.warn("Skipping bet due to invalid odds:", bet);
      return;
    }
    if (!bet.bet || typeof bet.bet !== "string" || bet.bet.length < 5) {
      console.warn("Skipping bet due to invalid bet name:", bet);
      return;
    }
    const docRef = collectionRef.doc(); // Auto-generate document IDs
    batch.set(docRef, {
      bet: bet.bet,
      odds_for,
      odds_against,
      status: bet.status ?? "Pending"
    });
  });

  await batch.commit();
  console.log("Bets uploaded successfully!");
}

uploadBets().catch((error) => {
  console.error("Error uploading bets:", error);
});
