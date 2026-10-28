
/*
 * Constituency Polling Board
 * यह चुनाव का सिमुलेशन है, वास्तविक चुनावी पूर्वानुमान नहीं।
 */

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || 0));

function stableValue(text) {
  let hash = 2166136261;

  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000) / 1000;
}

function percent(value) {
  return `${Number(value).toFixed(1)}%`;
}

/*
 * उम्मीदवारों के लिए तुलनात्मक स्कोर बनाता है।
 * लोकप्रियता और पार्टी की ताकत मॉडल के अनुमान हैं।
 */
export function calculateCandidateScores(seat, settings = {}) {
  if (!seat || !Array.isArray(seat.candidates)) {
    return [];
  }

  const campaign = clamp(settings.campaign, 0, 100);
  const localIssues = clamp(settings.localIssues, -20, 20);
  const uncertainty = clamp(settings.uncertainty, 0, 15);
  const selectedParty = String(settings.selectedParty || "");

  const candidates = seat.candidates.map((candidate, index) => {
    const party = String(candidate.party || "निर्दलीय");
    const isSelectedParty = party === selectedParty;

    const partyStrength =
      40 + stableValue(`${seat.id}-${party}`) * 30;

    const popularity =
      35 + stableValue(`${seat.id}-${candidate.id}-popularity`) * 35;

    const campaignEffect = isSelectedParty
      ? Math.log1p(campaign) * 4
      : 0;

    const issueEffect = localIssues * (
      isSelectedParty ? 1 : 0.4
    );

    const uncertaintyEffect =
      (stableValue(`${seat.id}-${candidate.id}-uncertainty`) - 0.5)
      * 2 * uncertainty;

    const score = Math.max(
      1,
      partyStrength * 0.45 +
      popularity * 0.40 +
      campaignEffect +
      issueEffect +
      uncertaintyEffect
    );

    return {
      id: candidate.id,
      name: candidate.name || `उम्मीदवार ${index + 1}`,
      party,
      partyStrength,
      popularity,
      campaignEffect,
      issueEffect,
      score
    };
  });

  const totalScore = candidates.reduce(
    (sum, candidate) => sum + candidate.score,
    0
  );

  const maxScore = Math.max(
    ...candidates.map(candidate => candidate.score)
  );

  const weights = candidates.map(candidate =>
    Math.exp((candidate.score - maxScore) / 12)
  );

  const totalWeight = weights.reduce(
    (sum, weight) => sum + weight,
    0
  );

  return candidates.map((candidate, index) => ({
    ...candidate,
    voteShare: totalScore
      ? candidate.score / totalScore * 100
      : 0,
    winProbability: totalWeight
      ? weights[index] / totalWeight * 100
      : 0
  })).sort((a, b) => b.voteShare - a.voteShare);
}

/*
 * पोलिंग बोर्ड UI तैयार करता है।
 *
 * इस्तेमाल:
 * createPollingBoard({
 *   seats,
 *   root: document.querySelector("#app")
 * });
 */
export function createPollingBoard({
  seats,
  root,
  onNotice = () => {}
} = {}) {
  if (!Array.isArray(seats) || !root) {
    throw new Error("सीट डेटा और स्क्रीन एलिमेंट देना आवश्यक है।");
  }

  const validSeats = seats.filter(seat =>
    seat &&
    seat.id &&
    seat.name &&
    Array.isArray(seat.candidates) &&
    seat.candidates.length > 0
  );

  if (!validSeats.length) {
    root.innerHTML =
      '<div class="card">निर्वाचन क्षेत्र का डेटा उपलब्ध नहीं है।</div>';

    return { render() {}, destroy() {} };
  }

  const states = [...new Set(
    validSeats.map(seat => seat.state).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  let selectedState = states[0] || "";
  let selectedSeatId = (
    validSeats.find(seat => seat.state === selectedState) ||
    validSeats[0]
  ).id;

  let selectedCandidateId = "";
  let selectedParty = "";
  let campaign = 0;
  let localIssues = 0;
  let uncertainty = 5;

  function getSeat() {
    return validSeats.find(
      seat => seat.id === selectedSeatId
    ) || validSeats[0];
  }

  function getStateSeats() {
    return validSeats.filter(
      seat => !selectedState || seat.state === selectedState
    );
  }

  function getParties(seat) {
    return [...new Set(
      seat.candidates.map(candidate => candidate.party).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }

  function getScores(seat) {
    return calculateCandidateScores(seat, {
      campaign,
      localIssues,
      uncertainty,
      selectedParty
    });
  }

  function render() {
    const seat = getSeat();

    if (!seat) {
      root.innerHTML =
        '<div class="card">सीट नहीं मिली।</div>';
      return;
    }

    const stateSeats = getStateSeats();

    if (!stateSeats.some(item => item.id === seat.id)) {
      selectedSeatId = stateSeats[0]?.id || validSeats[0].id;
      render();
      return;
    }

    const parties = getParties(seat);

    if (!parties.includes(selectedParty)) {
      selectedParty = parties[0] || "";
    }

    const scores = getScores(seat);

    if (!scores.some(item => item.id === selectedCandidateId)) {
      selectedCandidateId = scores[0]?.id || "";
    }

    const chosen = scores.find(
      item => item.id === selectedCandidateId
    );

    root.innerHTML = `
      <h1>निर्वाचन क्षेत्र पोलिंग बोर्ड</h1>

      <p class="muted">
        यह मॉडल सिमुलेशन के लिए है। इसके अनुमान वास्तविक सर्वेक्षण
        या प्रमाणित चुनावी आँकड़े नहीं हैं।
      </p>

      <div class="card">
        <h2>राज्य और निर्वाचन क्षेत्र</h2>

        <label for="pollState">राज्य / केंद्रशासित प्रदेश</label>
        <select id="pollState">
          ${states.map(state => `
            <option value="${escapeHTML(state)}"
              ${state === selectedState ? "selected" : ""}>
              ${escapeHTML(state)}
            </option>
          `).join("")}
        </select>

        <label for="pollSeat">निर्वाचन क्षेत्र</label>
        <select id="pollSeat">
          ${stateSeats.map(item => `
            <option value="${escapeHTML(item.id)}"
              ${item.id === seat.id ? "selected" : ""}>
              ${escapeHTML(item.name)}
            </option>
          `).join("")}
        </select>

        <label for="pollParty">विश्लेषण के लिए पार्टी</label>
        <select id="pollParty">
          ${parties.map(party => `
            <option value="${escapeHTML(party)}"
              ${party === selectedParty ? "selected" : ""}>
              ${escapeHTML(party)}
            </option>
          `).join("")}
        </select>

        <label for="pollCandidate">उम्मीदवार</label>
        <select id="pollCandidate">
          ${seat.candidates.map(candidate => `
            <option value="${escapeHTML(candidate.id)}"
              ${candidate.id === selectedCandidateId ? "selected" : ""}>
              ${escapeHTML(candidate.name)} — ${escapeHTML(candidate.party || "निर्दलीय")}
            </option>
          `).join("")}
        </select>
      </div>

      <div class="card">
        <h2>सिमुलेशन सेटिंग</h2>

        <label for="pollCampaign">
          प्रचार प्रभाव: ${campaign}
        </label>
        <input id="pollCampaign" type="range"
          min="0" max="100" value="${campaign}">

        <label for="pollIssues">
          स्थानीय मुद्दों का प्रभाव: ${localIssues}
        </label>
        <input id="pollIssues" type="range"
          min="-20" max="20" value="${localIssues}">

        <label for="pollUncertainty">
          चुनावी अनिश्चितता: ${uncertainty}
        </label>
        <input id="pollUncertainty" type="range"
          min="0" max="15" value="${uncertainty}">

        <button id="pollReset">सेटिंग रीसेट करें</button>
      </div>

      <div class="card">
        <h2>उम्मीदवार का विस्तृत विश्लेषण</h2>

        ${chosen ? `
          <h3>${escapeHTML(chosen.name)}</h3>
          <p>पार्टी: ${escapeHTML(chosen.party)}</p>

          <div class="grid">
            <div class="metric">
              <div class="muted">अनुमानित वोट शेयर</div>
              <div class="value">${percent(chosen.voteShare)}</div>
            </div>

            <div class="metric">
              <div class="muted">जीतने की संभावना</div>
              <div class="value">${percent(chosen.winProbability)}</div>
            </div>

            <div class="metric">
              <div class="muted">पार्टी की मॉडल ताकत</div>
              <div class="value">${percent(chosen.partyStrength)}</div>
            </div>

            <div class="metric">
              <div class="muted">उम्मीदवार की मॉडल लोकप्रियता</div>
              <div class="value">${percent(chosen.popularity)}</div>
            </div>

            <div class="metric">
              <div class="muted">प्रचार प्रभाव</div>
              <div class="value">${percent(chosen.campaignEffect)}</div>
            </div>

            <div class="metric">
              <div class="muted">स्थानीय मुद्दे का प्रभाव</div>
              <div class="value">${chosen.issueEffect.toFixed(1)}</div>
            </div>
          </div>
        ` : "<p>उम्मीदवार उपलब्ध नहीं है।</p>"}
      </div>

      <div class="card">
        <h2>सभी उम्मीदवारों की तुलना</h2>

        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>उम्मीदवार</th>
                <th>पार्टी</th>
                <th>लोकप्रियता</th>
                <th>प्रचार प्रभाव</th>
                <th>वोट शेयर</th>
                <th>जीत की संभावना</th>
              </tr>
            </thead>

            <tbody>
              ${scores.map(candidate => `
                <tr>
                  <td>${escapeHTML(candidate.name)}</td>
                  <td>${escapeHTML(candidate.party)}</td>
                  <td>${percent(candidate.popularity)}</td>
                  <td>${percent(candidate.campaignEffect)}</td>
                  <td>${percent(candidate.voteShare)}</td>
                  <td>${percent(candidate.winProbability)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <p class="muted">
          सभी संख्याएँ मॉडल के अनुमान हैं। वास्तविक उम्मीदवारों की
          लोकप्रियता या वास्तविक चुनाव परिणाम के रूप में इनका उपयोग न करें।
        </p>
      </div>
    `;
  }

  function handleChange(event) {
    const target = event.target;

    if (target.id === "pollState") {
      selectedState = target.value;
      const firstSeat = getStateSeats()[0];

      if (firstSeat) selectedSeatId = firstSeat.id;

      selectedCandidateId = "";
      selectedParty = "";
      render();
      return;
    }

    if (target.id === "pollSeat") {
      selectedSeatId = target.value;
      selectedCandidateId = "";
      selectedParty = "";
      render();
      return;
    }

    if (target.id === "pollParty") {
      selectedParty = target.value;
      render();
      return;
    }

    if (target.id === "pollCandidate") {
      selectedCandidateId = target.value;
      render();
      return;
    }

    if (target.id === "pollCampaign") {
      campaign = Number(target.value);
      render();
      return;
    }

    if (target.id === "pollIssues") {
      localIssues = Number(target.value);
      render();
      return;
    }

    if (target.id === "pollUncertainty") {
      uncertainty = Number(target.value);
      render();
    }
  }

  function handleClick(event) {
    if (event.target.id !== "pollReset") return;

    campaign = 0;
    localIssues = 0;
    uncertainty = 5;

    render();
    onNotice("पोलिंग बोर्ड की सेटिंग रीसेट हो गई।");
  }

  root.addEventListener("change", handleChange);
  
  root.addEventListener("click", handleClick);

  render();

  return {
    render,

    destroy() {
      root.removeEventListener("change", handleChange);
      root.removeEventListener("input", handleChange);
      root.removeEventListener("click", handleClick);
      root.innerHTML = "";
    }
  };
  }
    
