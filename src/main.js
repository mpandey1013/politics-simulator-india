
import { createParty } from "./core/party-manager.js";
import {
  createLedger,
  recordTransaction
} from "./core/finance-ledger.js";
import { recordCampaignExpense } from "./core/campaign-finance.js";
import { createPollingBoard } from "./features/polling-board.js";
const app = document.querySelector("#app");
const statusBox = document.querySelector("#status");

let seats = [];
let page = "dashboard";
let selectedSeat = "seat-001";
let results = null;
let pollingBoard = null;
let coalitionParties = [];
const defaults = () => ({
  party: {
    id: "party-player",
    name: "नई राजनीतिक पार्टी",
    ideology: "Unspecified"
  },
  ledger: createLedger(1000),

  tickets: {},
  campaign: {},
  results: null,
  government: null
});

let state = defaults();


function save() {
  state.coalitionParties = coalitionParties;

  localStorage.setItem(
    "politics-simulator-india-v1",
    JSON.stringify(state)
  );
}

function money(value) {
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function notice(message) {
  statusBox.textContent = message;
}

function metric(label, value) {
  return `<div class="metric">
    <div class="muted">${label}</div>
    <div class="value">${value}</div>
  </div>`;
}

function render() {
  if (!seats.length) {
    app.innerHTML = '<div class="card">सीट डेटा उपलब्ध नहीं है।</div>';
    return;
  }
 if (page !== "polling" && pollingBoard) {
  pollingBoard.destroy();
  pollingBoard = null;
}

if (page === "polling") {
  if (!pollingBoard) {
    pollingBoard = createPollingBoard({
      seats,
      root: app,
      onNotice: notice
    });
  } else {
    pollingBoard.render();
  }

  return;
      }
  if (page === "dashboard") renderDashboard();
  if (page === "party") renderParty();
  if (page === "tickets") renderTickets();
  if (page === "fund") renderFund();
  if (page === "results") renderResults();
}

function renderDashboard() {
  const assigned = Object.keys(state.tickets).length;

  app.innerHTML = `
    <h1>गेम डैशबोर्ड</h1>
    <p class="muted">चुनाव की तैयारी और अपनी राजनीतिक पार्टी प्रबंधित करो।</p>
    <div class="grid">
      ${metric("कुल निर्वाचन क्षेत्र", seats.length)}
      ${metric("टिकट आवंटित", assigned)}
      ${metric("शेष टिकट", seats.length - assigned)}
      ${metric("उपलब्ध फंड", "₹" + money(state.ledger.balance) + " करोड़")}
    </div>
    <div class="card">
      <h2>${escapeHTML(state.party.name)}</h2>
      <p>विचारधारा: ${escapeHTML(state.party.ideology)}</p>
      <p>चुनाव की स्थिति: ${state.results ? "नतीजे उपलब्ध" : "तैयारी जारी"}</p>
      <button data-go="party">पार्टी प्रबंधित करो</button>
      <button data-go="tickets">टिकट बाँटो</button>
      <button data-go="fund">फंड देखो</button>
    </div>
    <div class="card">
      <h3>अगला लक्ष्य</h3>
      <p>सभी 543 सीटों के लिए उम्मीदवार चुनो और फिर चुनाव सिमुलेशन चलाओ।</p>
      <p class="warning">सीटों और उम्मीदवारों के डेटा की आधिकारिक पुष्टि अभी बाकी है।</p>
    </div>`;
}

function renderParty() {
  app.innerHTML = `
    <h1>पार्टी प्रबंधन</h1>
    <div class="card">
      <label for="partyName">पार्टी का नाम</label>
      <input id="partyName" maxlength="80"
        value="${escapeHTML(state.party.name)}">

      <label for="ideology">विचारधारा</label>
      <select id="ideology">
        ${[
          "Unspecified", "Social Democratic", "Liberal",
          "Conservative", "Regional", "Green", "Centrist"
        ].map(item => `
          <option value="${item}" ${state.party.ideology === item ? "selected" : ""}>${item}</option>
        `).join("")}
      </select>

      <p>शुरुआती फंड: ₹1,000 करोड़</p>
      <button class="primary" id="saveParty">पार्टी सेव करो</button>
    </div>`;
}

function getStates() {
  return [...new Set(
    seats.map(seat => seat.state).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

function renderTickets() {
  const seat = seats.find(s => s.id === selectedSeat);
  if (!seat) {
    selectedSeat = seats[0].id;
    return renderTickets();
  }

  const ticket = state.tickets[selectedSeat];
  const selectedState = seat.state || "";
  const filteredSeats = selectedState
    ? seats.filter(s => s.state === selectedState)
    : seats;

  app.innerHTML = `
    <h1>टिकट आवंटन</h1>
    <div class="card">
      <label for="stateSelect">राज्य</label>
      <select id="stateSelect">
        ${getStates().map(st => `
          <option value="${escapeHTML(st)}" ${st === selectedState ? "selected" : ""}>${escapeHTML(st)}</option>
        `).join("")}
      </select>

      <label for="seatSelect">निर्वाचन क्षेत्र</label>
      <select id="seatSelect">
        ${filteredSeats.map(s => `
          <option value="${escapeHTML(s.id)}" ${s.id === selectedSeat ? "selected" : ""}>${escapeHTML(s.name)} (${escapeHTML(s.id)})</option>
        `).join("")}
      </select>

      <p class="muted">यहाँ प्रत्येक सीट के 3 उपलब्ध उम्मीदवारों में से एक चुनो।</p>

      <label for="candidateSelect">उम्मीदवार</label>
      <select id="candidateSelect">
        ${seat.candidates.map(c => `
          <option value="${escapeHTML(c.id)}" ${ticket === c.id ? "selected" : ""}>${escapeHTML(c.name)} — ${escapeHTML(c.id)}</option>
        `).join("")}
      </select>

      <button class="primary" id="assignTicket">टिकट आवंटित करो</button>
      <button id="autoTickets">बाकी सभी सीटों पर ऑटो आवंटन</button>
      <p>अभी आवंटित: ${Object.keys(state.tickets).length} / ${seats.length}</p>
    </div>

    <div class="card">
      <h3>नियम</h3>
      <p>एक सीट पर तुम्हारी पार्टी का केवल एक उम्मीदवार टिकट पाएगा। सभी उम्मीदवारों के लिए ID अलग है।</p>
    </div>`;
}

function renderFund() {
  app.innerHTML = `
    <h1>चुनावी फंड</h1>
    <div class="grid">
      ${metric("उपलब्ध राशि", "₹" + money(state.ledger.balance) + " करोड़")}
      ${metric("लेन-देन", state.ledger.transactions.length)}
    </div>

    <div class="card">
      <h2>सामान्य खर्च</h2>
      <label for="expense">खर्च (करोड़ रुपये में)</label>
      <input id="expense" type="number" min="0.01" step="0.01" placeholder="उदाहरण: 5">

      <label for="description">खर्च का विवरण</label>
      <input id="description" maxlength="120" placeholder="चुनावी खर्च">

      <button class="primary" id="spend">खर्च दर्ज करो</button>
    </div>

    <div class="card">
      <h2>चुनावी प्रचार का खर्च</h2>

      <label for="campaignSeat">निर्वाचन क्षेत्र</label>
      <select id="campaignSeat">
        ${seats.map(s => `
          <option value="${escapeHTML(s.id)}">${escapeHTML(s.name)} (${escapeHTML(s.id)})</option>
        `).join("")}
      </select>

      <label for="campaignExpense">प्रचार खर्च (करोड़ रुपये में)</label>
      <input id="campaignExpense" type="number" min="0.01" step="0.01" placeholder="उदाहरण: 2">

      <label for="campaignDescription">खर्च का विवरण</label>
      <input id="campaignDescription" maxlength="120" placeholder="रैली, पोस्टर आदि">

      <button class="primary" id="spendCampaign">प्रचार खर्च दर्ज करो</button>
    </div>

    <div class="card">
      <h2>सीटवार प्रचार खर्च</h2>
      ${seats.filter(s => Number(state.campaign[s.id] || 0) > 0).map(s => `
        <p>${escapeHTML(s.name)}: ₹${money(state.campaign[s.id])} करोड़</p>
      `).join("") || "<p>अभी कोई प्रचार खर्च दर्ज नहीं है।</p>"}
    </div>

    <div class="card">
      <h2>लेन-देन का रिकॉर्ड</h2>
      ${state.ledger.transactions.slice().reverse().map(t => `
        <p>${t.type === "expense" ? "खर्च" : "आय"}: ₹${money(t.amount)} करोड़ —
        ${escapeHTML(t.description)} <span class="muted">(${money(t.balanceAfter)})</span></p>
      `).join("") || "<p>अभी कोई लेन-देन नहीं है।</p>"}
    </div>`;
}

function renderResults() {
  if (!results) {
    app.innerHTML = `
      <h1>लोकसभा चुनाव</h1>
      <div class="card">
        <p>चुनाव सिमुलेशन अभी चलाया नहीं गया है।</p>
        <p>यह शुरुआती मॉडल है। नतीजे अस्थायी उम्मीदवार गुणों और सिमुलेशन स्कोर पर आधारित होंगे, वास्तविक चुनाव पूर्वानुमान नहीं।</p>
        <button class="primary" id="runElection">चुनाव सिमुलेशन चलाओ</button>
      </div>`;
    return;
  }

  const wins = results.filter(r => r.winnerIsPlayer).length;
  const majority = Math.floor(seats.length / 2) + 1;

  app.innerHTML = `
    <h1>चुनाव परिणाम</h1>
    <div class="grid">
      ${metric("कुल सीटें", results.length)}
      ${metric("तुम्हारी पार्टी की सीटें", wins)}
      ${metric("बहुमत का आँकड़ा", majority)}
    </div>
 
    <div class="card">
      <h2>${wins >= majority ? "बहुमत का आँकड़ा पूरा" : "बहुमत नहीं मिला"}</h2>
      <p>यह परिणाम केवल इस प्रोटोटाइप के सिमुलेशन का है।</p>
      <button class="primary" id="formGovernment">🏛️ सरकार गठन</button>
      <button id="resetResults">नतीजे हटाकर फिर तैयारी करो</button>
    </div>

    <div class="card">
      <h2>सभी 543 सीटों के नतीजे</h2>
      ${results.map(r => `
        <p>${escapeHTML(r.name)}: ${escapeHTML(r.winnerName)} — जीत का अंतर ${r.margin} वोट</p>
      `).join("")}
      <p class="muted">कुल ${results.length} सीटों के नतीजे सहेजे गए हैं।</p>
    </div>`;
}

function renderGovernment() {
  if (!results) {
    app.innerHTML = `
      <h1>🏛️ सरकार गठन</h1>
      <div class="card">
        <p>पहले चुनाव सिमुलेशन पूरा करें।</p>
        <button data-go="results">चुनाव परिणाम पर जाएँ</button>
      </div>`;
    return;
  }

  const majority = Math.floor(seats.length / 2) + 1;
  const partySeats = {};

  results.forEach(result => {
    const party = result.winnerParty || "Unknown";
    partySeats[party] = (partySeats[party] || 0) + 1;
  });

  const playerParty = state.party.name;
  const playerSeats = partySeats[playerParty] || 0;

  const coalitionSeats = playerSeats +
    coalitionParties.reduce(
      (total, party) => total + (partySeats[party] || 0),
      0
    );

  const partyRows = Object.entries(partySeats)
    .sort((a, b) => b[1] - a[1])
    .map(([party, count]) => {
      const isPlayer = party === playerParty;
      const selected = coalitionParties.includes(party);

      let actionButton = "";

      if (!isPlayer) {
        actionButton = selected
          ? `<button data-coalition-action="remove"
               data-party="${escapeHTML(party)}">गठबंधन से हटाएँ</button>`
          : `<button class="primary" data-coalition-action="add"
               data-party="${escapeHTML(party)}">गठबंधन में जोड़ें</button>`;
      }

      return `
        <tr>
          <td>${escapeHTML(party)}${isPlayer ? " (आपकी पार्टी)" : ""}</td>
          <td>${count}</td>
          <td>${actionButton}</td>
        </tr>
      `;
    }).join("");

  app.innerHTML = `
    <h1>🏛️ सरकार गठन</h1>

    <div class="grid">
      ${metric("कुल लोकसभा सीटें", results.length)}
      ${metric("बहुमत का आँकड़ा", majority)}
      ${metric("आपकी पार्टी की सीटें", playerSeats)}
      ${metric("गठबंधन की कुल सीटें", coalitionSeats)}
    </div>

    <div class="card">
      <h2>पार्टी चुनकर गठबंधन बनाएँ</h2>
      <p>अपनी पार्टी के अलावा उन पार्टियों को चुनें जिनके साथ आप सरकार बनाना चाहते हैं।</p>

      <table>
        <thead>
          <tr>
            <th>पार्टी</th>
            <th>जीती हुई सीटें</th>
            <th>कार्रवाई</th>
          </tr>
        </thead>
        <tbody>
          ${partyRows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>${coalitionSeats >= majority
        ? "बहुमत उपलब्ध है"
        : "अभी बहुमत नहीं है"}</h2>
      
      <p>गठबंधन के पास ${coalitionSeats} सीटें हैं। सरकार बनाने के लिए ${majority} सीटें चाहिए।</p>
      ${coalitionSeats >= majority && !state.government ? `
        <button class="primary" id="confirmGovernment">सरकार बनाओ और सेव करो</button>
      ` : ""}
      <button data-go="results">चुनाव परिणाम पर वापस जाएँ</button>
      
    </div>
  `;
  }

function allocateAllAutomatically() {
  const assigned = new Set(Object.values(state.tickets));

  for (const seat of seats) {
    if (state.tickets[seat.id]) continue;

    const candidate = seat.candidates.find(c => !assigned.has(c.id));
    if (!candidate) {
      throw new Error("कोई उम्मीदवार उपलब्ध नहीं: " + seat.id);
    }

    state.tickets[seat.id] = candidate.id;
    assigned.add(candidate.id);
  }

  save();
  notice("ऑटो आवंटन पूरा हुआ। सभी सीटों के टिकट जाँचो।");
  render();
}

function runElection() {
  results = seats.map(seat => {
    const ticketedId = state.tickets[seat.id];
    const campaignSpend = Number(state.campaign?.[seat.id] || 0);

    const candidateScores = seat.candidates.map(candidate => {
      const isPlayer = candidate.id === ticketedId;
      const base = 1000 + Math.floor(Math.random() * 9000);

      // Prototype-only effect. This is not a real-world prediction.
      const bonus = isPlayer
        ? Math.min(3000, Math.floor(campaignSpend * 5))
        : 0;

      return {
        id: candidate.id,
        name: candidate.name,
        score: base + bonus,
        winnerIsPlayer: isPlayer
      };
    }).sort((a, b) => b.score - a.score);

   
    const winningCandidate = seat.candidates.find(
      candidate => candidate.id === candidateScores[0].id
    );

    return {
      id: seat.id,
      name: seat.name,
      winnerName: candidateScores[0].name,
      winnerId: candidateScores[0].id,
      winnerParty: candidateScores[0].winnerIsPlayer
        ? state.party.name
        : winningCandidate?.party || "Unknown",
      winnerIsPlayer: candidateScores[0].winnerIsPlayer,
      margin: candidateScores[0].score - candidateScores[1].score
    };
      
  });

  state.results = results;
  save();
  render();
  notice("सिमुलेशन पूरा हुआ। नतीजे सेव कर दिए गए हैं।");
}

app.addEventListener("change", event => {
  if (event.target.id === "stateSelect") {
    const nextSeat = seats.find(
      seat => seat.state === event.target.value
    );

    if (nextSeat) {
      selectedSeat = nextSeat.id;
      render();
    }
  }

  if (event.target.id === "seatSelect") {
    selectedSeat = event.target.value;
    render();
  }
});

app.addEventListener("click", event => {
  const go = event.target.dataset.go;

  if (go) {
    page = go;
    render();
    return;
  }

  if (event.target.id === "saveParty") {
    const name = document.querySelector("#partyName").value.trim();
    if (!name) return notice("पार्टी का नाम खाली नहीं हो सकता।");

    state.party.name = name;
    state.party.ideology = document.querySelector("#ideology").value;

    save();
    notice("पार्टी सेव हो गई।");
    render();
  }

  if (event.target.id === "assignTicket") {
    const candidateId = document.querySelector("#candidateSelect").value;

    state.tickets[selectedSeat] = candidateId;

    save();
    notice("टिकट आवंटित हो गया।");
    render();
  }

  if (event.target.id === "autoTickets") {
    try {
      allocateAllAutomatically();
    } catch (error) {
      notice(error.message);
    }
  }

  if (event.target.id === "spend") {
    const amount = Number(document.querySelector("#expense").value);
    const description = document.querySelector("#description").value.trim();

    try {
      state.ledger = recordTransaction(state.ledger, {
        type: "expense",
        amount,
        description: description || "चुनावी खर्च"
      });

      save();
      notice("खर्च दर्ज हुआ।");
      render();
    } catch (error) {
      notice(error.message);
    }
  }

  if (event.target.id === "spendCampaign") {
    const seatId = document.querySelector("#campaignSeat").value;
    const amount = Number(document.querySelector("#campaignExpense").value);
    const description = document.querySelector("#campaignDescription").value.trim();
    const seat = seats.find(s => s.id === seatId);

    if (!seat) {
      return notice("निर्वाचन क्षेत्र नहीं मिला।");
    }

    try {
      const updated = recordCampaignExpense(
        state.ledger,
        state.campaign || {},
        seatId,
        amount,
        description
          ? `प्रचार - ${seat.name}: ${description}`
          : `प्रचार - ${seat.name}`
      );

      state.ledger = updated.ledger;
      state.campaign = updated.campaign;

      save();
      render();
      notice("प्रचार खर्च दर्ज हुआ: " + seat.name);
    } catch (error) {
      notice(error.message);
    }
  }

  if (event.target.id === "runElection") {
    runElection();
  }

  if (event.target.dataset.coalitionAction) {
    const party = event.target.dataset.party;

    if (event.target.dataset.coalitionAction === "add") {
      if (!coalitionParties.includes(party)) {
        coalitionParties.push(party);
      }
    }

    if (event.target.dataset.coalitionAction === "remove") {
      coalitionParties = coalitionParties.filter(
        item => item !== party
      );
    }

    save();
renderGovernment();
return;
          }
  
  if (event.target.id === "formGovernment") {
    page = "government";
    renderGovernment();
  }
  
  if (event.target.id === "resetResults") {
    results = null;
    state.results = null;

    save();
    render();
    notice("नतीजे रीसेट हो गए।");
  }
});

document.querySelector("#nav").addEventListener("click", event => {
  if (event.target.dataset.page) {
    page = event.target.dataset.page;
    render();
  }
});

async function start() {
  try {
    const response = await fetch("./src/data/constituencies.json");
    if (!response.ok) throw new Error("सीट डेटा लोड नहीं हुआ।");

    seats = await response.json();

    const saved = localStorage.getItem("politics-simulator-india-v1");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        if (
          parsed &&
          parsed.party &&
          parsed.ledger &&
          parsed.tickets &&
          Array.isArray(parsed.ledger.transactions)
        ) {
        
          state = {
            ...defaults(),
            ...parsed,
            campaign: parsed.campaign || {},
            results: parsed.results || null
          };

          coalitionParties = Array.isArray(parsed.coalitionParties)
            ? parsed.coalitionParties
            : [];
        }
      } catch {
        notice("पुराना सेव डेटा पढ़ नहीं पाए; नया गेम शुरू हुआ।");
      }
    }

    results = state.results;

    if (
      !Array.isArray(seats) ||
      seats.length !== 543 ||
      seats.some(s => !Array.isArray(s.candidates) || s.candidates.length !== 3)
    ) {
      throw new Error("सीट डेटा की जाँच असफल हुई।");
    }

    notice("डेटा सफलतापूर्वक लोड हुआ: 543 सीटें।");
    render();
  } catch (error) {
    notice(error.message);

    app.innerHTML = `
      <div class="card">
        <h2>लोडिंग त्रुटि</h2>
        <p>${escapeHTML(error.message)}</p>
        <p>गेम चलाने के लिए repository की root directory में index.html और src/data/constituencies.json मौजूद होने चाहिए।</p>
      </div>`;
  }
}

start();
