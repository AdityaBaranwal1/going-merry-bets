/* global Chart, initializeApp, getFirestore, getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, collection, getDocs, addDoc, query, where */
// Utility: Format currency
function formatCurrency(val) {
  return `$${Number(val).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
}
// User Dashboard
function renderUserDashboard() {
  if (!currentUser || wagersListCache.length === 0) return;
  const userWagers = wagersListCache.filter(w => w.user_id === currentUser.uid);
  const totalWagers = userWagers.length;
  const totalPayout = userWagers.reduce((sum, w) => sum + (w.payout || 0), 0);
  const avgWager = userWagers.length ? (userWagers.reduce((sum, w) => sum + (w.wager || 0), 0) / userWagers.length) : 0;
  // Win rate: requires a 'result' field (simulate as random for demo)
  const winCount = userWagers.filter(w => w.result === 'win').length;
  const winRate = userWagers.length ? (winCount / userWagers.length * 100) : 0;
  const dashboardDiv = document.getElementById('user-dashboard');
  if (!dashboardDiv) return;
  dashboardDiv.innerHTML = `
    <div><strong>Total Wagers:</strong> ${totalWagers}</div>
    <div><strong>Total Payout:</strong> ${formatCurrency(totalPayout)}</div>
    <div><strong>Average Wager:</strong> ${formatCurrency(avgWager)}</div>
    <div><strong>Win Rate:</strong> ${winRate.toFixed(1)}%</div>
  `;
}
// Leaderboard
function renderLeaderboard() {
  if (wagersListCache.length === 0) return;
  const userStats = {};
  wagersListCache.forEach(w => {
    if (!userStats[w.user]) userStats[w.user] = { count: 0, payout: 0 };
    userStats[w.user].count++;
    userStats[w.user].payout += (w.payout || 0);
  });
  const sorted = Object.entries(userStats).sort((a,b) => b[1].payout - a[1].payout).slice(0,10);
  const leaderboardDiv = document.getElementById('leaderboard');
  if (!leaderboardDiv) return;
  leaderboardDiv.innerHTML = `<table style="width:100%;border-collapse:collapse;">
    <tr><th>User</th><th>Total Wagers</th><th>Total Payout</th></tr>
    ${sorted.map(([user, stats]) => `<tr><td>${user}</td><td>${stats.count}</td><td>${formatCurrency(stats.payout)}</td></tr>`).join('')}
  </table>`;
}
// Payout Distribution Chart
function renderPayoutDistributionChart() {
  if (typeof Chart === 'undefined' || wagersListCache.length === 0) return;
  const payoutCtx = document.getElementById('payout-distribution-chart').getContext('2d');
  const payouts = wagersListCache.map(w => w.payout || 0);
  const bins = [0, 10, 50, 100, 250, 500, 1000, 5000];
  const binLabels = bins.map((b,i) => i < bins.length-1 ? `$${bins[i]}-$${bins[i+1]-1}` : `$${bins[i]}+`);
  const binCounts = bins.map((b,i) => payouts.filter(p => p >= b && (i === bins.length-1 || p < bins[i+1])).length);
  if (window.payoutDistributionChart) window.payoutDistributionChart.destroy();
  window.payoutDistributionChart = new Chart(payoutCtx, {
    type: 'bar',
    data: {
      labels: binLabels,
      datasets: [{
        label: 'Number of Wagers',
        data: binCounts,
        backgroundColor: 'rgba(255,193,7,0.7)'
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  });
}
// Bet Details Modal
function showBetDetailsModal(betId) {
  const modal = document.getElementById('bet-details-modal');
  if (!modal) return;
  const bet = betsListCache.find(b => b.id === betId);
  if (!bet) return;
  const wagers = wagersListCache.filter(w => w.bet_id === betId);
  modal.innerHTML = `
    <h2>${bet.bet}</h2>
    <div><strong>Odds For:</strong> ${bet.odds_for}</div>
    <div><strong>Odds Against:</strong> ${bet.odds_against}</div>
    <div><strong>Status:</strong> ${bet.status || 'Pending'}</div>
    <h3>Wager Breakdown</h3>
    <table style="width:100%;border-collapse:collapse;">
      <tr><th>User</th><th>Choice</th><th>Wager</th><th>Payout</th></tr>
      ${wagers.map(w => `<tr><td>${w.user}</td><td>${w.choice}</td><td>${formatCurrency(w.wager)}</td><td>${formatCurrency(w.payout)}</td></tr>`).join('')}
    </table>
    <button onclick="document.getElementById('bet-details-modal').style.display='none'">Close</button>
  `;
  modal.style.display = 'block';
}


// Chart.js CDN
const chartJsScript = document.createElement('script');
chartJsScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
chartJsScript.onload = () => { renderCharts(); };
document.head.appendChild(chartJsScript);

const firebaseConfig = {
  apiKey: "AIzaSyAX6UsOFe0MdaVzxku-6PeqGfkqOe9cPtI",
  authDomain: "going-merry-bets.firebaseapp.com",
  projectId: "going-merry-bets",
  storageBucket: "going-merry-bets.firebasestorage.app",
  messagingSenderId: "759398849906",
  appId: "1:759398849906:web:f9af3265b3fb9f226e11eb",
  measurementId: "G-X6XFXZTB3J",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


let currentUser = null;
let betsListCache = [];
let wagersListCache = [];

function showError(msg) {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) errorDiv.textContent = msg;
}

function clearError() {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) errorDiv.textContent = "";
}

function updateUserInfo(user) {
  const userInfoDiv = document.getElementById("user-info");
  if (!userInfoDiv) return;
  if (user) {
    userInfoDiv.innerHTML = `<span>Signed in as <strong>${user.displayName || user.email}</strong></span> <button id="logout-btn">Logout</button>`;
    document.getElementById("logout-btn").onclick = () => signOut(auth);
  } else {
    userInfoDiv.innerHTML = `<button id="login-btn">Sign in with Google</button>`;
    document.getElementById("login-btn").onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
  }
}

async function fetchBets(searchTerm = "") {
  clearError();
  const betsCollection = collection(db, "bets");
  const betsSnapshot = await getDocs(betsCollection);
  let betsList = betsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  betsListCache = betsList;
  if (searchTerm) {
    betsList = betsList.filter(bet => bet.bet.toLowerCase().includes(searchTerm.toLowerCase()));
  }
  const betsContainer = document.getElementById("available-bets");
  if (!betsContainer) return;
  betsContainer.innerHTML = "";
  betsList.forEach((bet) => {
    const betElement = document.createElement("div");
    betElement.classList.add("bet-item");
    betElement.innerHTML = `
      <h3 style="cursor:pointer;text-decoration:underline;" data-bet-id="${bet.id}">${bet.bet}</h3>
      <p><strong>Odds For:</strong> ${bet.odds_for}</p>
      <p><strong>Odds Against:</strong> ${bet.odds_against}</p>
      <p><strong>Status:</strong> ${bet.status || "Pending"}</p>
      <button class="place-wager-btn" data-id="${bet.id}">Place Wager</button>
    `;
    betsContainer.appendChild(betElement);
  });
  document.querySelectorAll(".place-wager-btn").forEach((button) => {
    button.onclick = (e) => {
      if (!currentUser) {
        showError("You must be signed in to place a wager.");
        return;
      }
      showWagerForm(e.target.dataset.id);
    };
  });
  document.querySelectorAll('.bet-item h3').forEach(h3 => {
    h3.onclick = (e) => showBetDetailsModal(e.target.getAttribute('data-bet-id'));
  });
  renderCharts();
}
// Render odds and projected payout charts
function renderCharts() {
  if (typeof Chart === 'undefined' || betsListCache.length === 0) return;
  // Odds Chart
  const oddsCtx = document.getElementById('odds-chart').getContext('2d');
  const payoutCtx = document.getElementById('payout-chart').getContext('2d');
  const labels = betsListCache.map(bet => bet.bet.length > 20 ? bet.bet.slice(0,20) + '...' : bet.bet);
  const oddsFor = betsListCache.map(bet => bet.odds_for);
  const oddsAgainst = betsListCache.map(bet => bet.odds_against);
  // Projected payout for $100 wager
  const payoutFor = betsListCache.map(odds => odds.odds_for > 0 ? 100 * (odds.odds_for / 100) : 100 / Math.abs(odds.odds_for) * 100);
  const payoutAgainst = betsListCache.map(odds => odds.odds_against > 0 ? 100 * (odds.odds_against / 100) : 100 / Math.abs(odds.odds_against) * 100);

  if (window.oddsChart) window.oddsChart.destroy();
  window.oddsChart = new Chart(oddsCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Odds For',
          data: oddsFor,
          backgroundColor: 'rgba(30,136,229,0.6)'
        },
        {
          label: 'Odds Against',
          data: oddsAgainst,
          backgroundColor: 'rgba(67,160,71,0.6)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: { x: { ticks: { autoSkip: false } } }
    }
  });

  if (window.payoutChart) window.payoutChart.destroy();
  window.payoutChart = new Chart(payoutCtx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Projected Payout For $100 (For)',
          data: payoutFor,
          borderColor: 'rgba(30,136,229,1)',
          backgroundColor: 'rgba(30,136,229,0.2)',
          fill: true
        },
        {
          label: 'Projected Payout For $100 (Against)',
          data: payoutAgainst,
          borderColor: 'rgba(67,160,71,1)',
          backgroundColor: 'rgba(67,160,71,0.2)',
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: { x: { ticks: { autoSkip: false } } }
    }
  });
}

function showWagerForm(betId) {
  clearError();
  const wagerFormContainer = document.getElementById("wager-form-container");
  if (!wagerFormContainer) return;
  wagerFormContainer.innerHTML = `
    <form id="wager-form">
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
  wagerForm.onsubmit = (e) => handleWagerSubmission(e, betId);
}

async function handleWagerSubmission(e, betId) {
  e.preventDefault();
  clearError();
  if (!currentUser) {
    showError("You must be signed in to place a wager.");
    return;
  }
  const choice = document.getElementById("bet-choice").value;
  const wagerAmountRaw = document.getElementById("wager-amount").value;
  const wagerAmount = Number(wagerAmountRaw);
  if (!wagerAmount || wagerAmount <= 0) {
    showError("Please enter a valid wager amount greater than 0.");
    return;
  }
  const betsCollection = collection(db, "bets");
  const selectedBetQuery = query(betsCollection, where("__name__", "==", betId));
  const betSnapshot = await getDocs(selectedBetQuery);
  if (!betSnapshot.empty) {
    const selectedBet = betSnapshot.docs[0].data();
    let oddsValue;
    if (choice === "For") {
      oddsValue = selectedBet.odds_for ?? selectedBet.odds?.for;
    } else {
      oddsValue = selectedBet.odds_against ?? selectedBet.odds?.against;
    }
    if (typeof oddsValue !== "number") {
      showError("Odds data is missing or invalid for this bet.");
      return;
    }
    const payout = oddsValue > 0
      ? wagerAmount * (oddsValue / 100)
      : wagerAmount / Math.abs(oddsValue) * 100;
    await addDoc(collection(db, "wagers"), {
      bet_id: betId,
      user: currentUser.displayName || currentUser.email,
      user_id: currentUser.uid,
      choice,
      wager: wagerAmount,
      payout,
      timestamp: new Date(),
    });
    alert(`Wager placed successfully! Potential payout: $${payout.toFixed(2)}`);
    fetchUserWagers();
    fetchAllWagers();
  } else {
    showError("Bet not found!");
  }
}

async function fetchUserWagers() {
  if (!currentUser) return;
  const userWagersQuery = query(collection(db, "wagers"), where("user_id", "==", currentUser.uid));
  const userWagersSnapshot = await getDocs(userWagersQuery);
  const userWagersContainer = document.getElementById("user-wagers-list");
  if (!userWagersContainer) return;
  userWagersContainer.innerHTML = "";
  userWagersSnapshot.forEach((doc) => {
    const wager = doc.data();
    const wagerElement = document.createElement("div");
    wagerElement.classList.add("wager-item");
    wagerElement.innerHTML = `
      <p><strong>Bet:</strong> ${wager.bet_id}</p>
      <p><strong>Choice:</strong> ${wager.choice}</p>
      <p><strong>Wager:</strong> $${wager.wager}</p>
      <p><strong>Payout:</strong> $${wager.payout.toFixed(2)}</p>
      <p><strong>Date:</strong> ${new Date(wager.timestamp.seconds * 1000).toLocaleString()}</p>
    `;
    userWagersContainer.appendChild(wagerElement);
  });
}

async function fetchAllWagers() {
  const wagersQuery = collection(db, "wagers");
  const wagersSnapshot = await getDocs(wagersQuery);
  wagersListCache = [];
  const wagersContainer = document.getElementById("wagers-list");
  if (!wagersContainer) return;
  wagersContainer.innerHTML = "";
  wagersSnapshot.forEach((doc) => {
    const wager = doc.data();
    wagersListCache.push(wager);
    const wagerElement = document.createElement("div");
    wagerElement.classList.add("wager-item");
    wagerElement.innerHTML = `
      <p><strong>User:</strong> ${wager.user}</p>
      <p><strong>Bet:</strong> ${wager.bet_id}</p>
      <p><strong>Choice:</strong> ${wager.choice}</p>
      <p><strong>Wager:</strong> $${wager.wager}</p>
      <p><strong>Payout:</strong> $${wager.payout.toFixed(2)}</p>
      <p><strong>Date:</strong> ${wager.timestamp && wager.timestamp.seconds ? new Date(wager.timestamp.seconds * 1000).toLocaleString() : ''}</p>
    `;
    wagersContainer.appendChild(wagerElement);
  });
  renderAnalyticsCharts();
  renderUserDashboard();
  renderLeaderboard();
  renderPayoutDistributionChart();
}
// Render analytics charts: wager history, top bets, user stats
function renderAnalyticsCharts() {
  if (typeof Chart === 'undefined' || wagersListCache.length === 0) return;
  // Wager History (line chart: wagers per day)
  const historyCtx = document.getElementById('wager-history-chart').getContext('2d');
  const dateCounts = {};
  wagersListCache.forEach(w => {
    if (w.timestamp && w.timestamp.seconds) {
      const dateStr = new Date(w.timestamp.seconds * 1000).toLocaleDateString();
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
    }
  });
  const historyLabels = Object.keys(dateCounts);
  const historyData = Object.values(dateCounts);
  if (window.wagerHistoryChart) window.wagerHistoryChart.destroy();
  window.wagerHistoryChart = new Chart(historyCtx, {
    type: 'line',
    data: {
      labels: historyLabels,
      datasets: [{
        label: 'Wagers per Day',
        data: historyData,
        borderColor: '#1e88e5',
        backgroundColor: 'rgba(30,136,229,0.2)',
        fill: true
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  });

  // Top Bets (bar chart: most wagered bets)
  const topBetsCtx = document.getElementById('top-bets-chart').getContext('2d');
  const betCounts = {};
  wagersListCache.forEach(w => {
    betCounts[w.bet_id] = (betCounts[w.bet_id] || 0) + 1;
  });
  const sortedBets = Object.entries(betCounts).sort((a,b) => b[1]-a[1]).slice(0,10);
  const topBetLabels = sortedBets.map(([bet]) => bet);
  const topBetData = sortedBets.map((entry) => entry[1]);
  if (window.topBetsChart) window.topBetsChart.destroy();
  window.topBetsChart = new Chart(topBetsCtx, {
    type: 'bar',
    data: {
      labels: topBetLabels,
      datasets: [{
        label: 'Number of Wagers',
        data: topBetData,
        backgroundColor: 'rgba(67,160,71,0.6)'
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  });

  // User Stats (pie chart: wagers per user)
  const userStatsCtx = document.getElementById('user-stats-chart').getContext('2d');
  const userCounts = {};
  wagersListCache.forEach(w => {
    userCounts[w.user] = (userCounts[w.user] || 0) + 1;
  });
  const userLabels = Object.keys(userCounts);
  const userData = Object.values(userCounts);
  if (window.userStatsChart) window.userStatsChart.destroy();
  window.userStatsChart = new Chart(userStatsCtx, {
    type: 'pie',
    data: {
      labels: userLabels,
      datasets: [{
        label: 'Wagers per User',
        data: userData,
        backgroundColor: userLabels.map((_,i) => `hsl(${i*40},70%,70%)`)
      }]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } } }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUserInfo(user);
    fetchBets();
    fetchUserWagers();
    fetchAllWagers();
  });
  const betSearch = document.getElementById("bet-search");
  if (betSearch) {
    betSearch.oninput = (e) => fetchBets(e.target.value);
  }
});
