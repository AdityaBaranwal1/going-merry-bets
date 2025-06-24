console.log("Going Merry Bets app is running!");

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, query, where } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAX6UsOFe0MdaVzxku-6PeqGfkqOe9cPtI",
  authDomain: "going-merry-bets.firebaseapp.com",
  projectId: "going-merry-bets",
  storageBucket: "going-merry-bets.firebasestorage.app",
  messagingSenderId: "759398849906",
  appId: "1:759398849906:web:f9af3265b3fb9f226e11eb",
  measurementId: "G-X6XFXZTB3J",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fetch and display all bets
async function fetchBets() {
  const betsCollection = collection(db, "bets");
  const betsSnapshot = await getDocs(betsCollection);
  const betsList = betsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const betsContainer = document.getElementById("available-bets");
  betsContainer.innerHTML = ""; // Clear previous bets

  betsList.forEach((bet) => {
    const betElement = document.createElement("div");
    betElement.classList.add("bet-item");

    const timestamp = bet.timestamp ? bet.timestamp.toDate() : "No Timestamp";

    betElement.innerHTML = `
      <p><strong>Pick:</strong> ${bet.bet}</p>
      <p><strong>Odds For:</strong> ${bet.odds_for}</p>
      <p><strong>Odds Against:</strong> ${bet.odds_against}</p>
      <p><strong>Status:</strong> ${bet.status || "Pending"}</p>
      <button class="place-wager-btn" data-id="${bet.id}">Place Wager</button>
    `;
    betsContainer.appendChild(betElement);
  });

  document.querySelectorAll(".place-wager-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const betId = e.target.dataset.id;
      showWagerForm(betId);
    });
  });
}

// Display wager form for the selected bet
function showWagerForm(betId) {
  const wagerFormContainer = document.getElementById("wager-form-container");
  wagerFormContainer.innerHTML = `
    <form id="wager-form">
      <label for="user-name">Your Name:</label>
      <input type="text" id="user-name" placeholder="Enter your name" required>
      <label for="bet-choice">Your Choice:</label>
      <select id="bet-choice">
        <option value="For">For</option>
        <option value="Against">Against</option>
      </select>
      <label for="wager-amount">Wager Amount:</label>
      <input type="number" id="wager-amount" placeholder="Enter amount" required>
      <button type="submit">Place Wager</button>
    </form>
  `;

  const wagerForm = document.getElementById("wager-form");
  wagerForm.addEventListener("submit", (e) => handleWagerSubmission(e, betId));
}

// Handle wager submission
async function handleWagerSubmission(e, betId) {
  e.preventDefault();

  const userName = document.getElementById("user-name").value;
  const choice = document.getElementById("bet-choice").value;
  const wagerAmount = Number(document.getElementById("wager-amount").value);

  // Fetch the selected bet details
  const betsCollection = collection(db, "bets");
  const selectedBetQuery = query(betsCollection, where("__name__", "==", betId));
  const betSnapshot = await getDocs(selectedBetQuery);

  if (!betSnapshot.empty) {
    const selectedBet = betSnapshot.docs[0].data();
    const oddsValue = choice === "For" ? selectedBet.odds_for : selectedBet.odds_against;

    const payout = oddsValue > 0
      ? wagerAmount * (oddsValue / 100)
      : wagerAmount / Math.abs(oddsValue) * 100;

    // Add wager to Firestore
    await addDoc(collection(db, "wagers"), {
      bet_id: betId,
      user: userName,
      choice,
      wager: wagerAmount,
      payout,
      timestamp: new Date(),
    });

    alert(`Wager placed successfully! Potential payout: $${payout.toFixed(2)}`);
    fetchWagers(betId); // Refresh wagers for the selected bet
  } else {
    alert("Bet not found!");
  }
}

// Fetch and display wagers for a specific bet
async function fetchWagers(betId) {
  const wagersQuery = query(collection(db, "wagers"), where("bet_id", "==", betId));
  const wagersSnapshot = await getDocs(wagersQuery);

  const wagersContainer = document.getElementById("wagers-list");
  wagersContainer.innerHTML = ""; // Clear previous wagers

  wagersSnapshot.forEach((doc) => {
    const wager = doc.data();
    const wagerElement = document.createElement("div");
    wagerElement.classList.add("wager-item");
    wagerElement.innerHTML = `
      <p><strong>User:</strong> ${wager.user}</p>
      <p><strong>Choice:</strong> ${wager.choice}</p>
      <p><strong>Wager:</strong> $${wager.wager}</p>
      <p><strong>Payout:</strong> $${wager.payout.toFixed(2)}</p>
    `;
    wagersContainer.appendChild(wagerElement);
  });
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  fetchBets();
});
