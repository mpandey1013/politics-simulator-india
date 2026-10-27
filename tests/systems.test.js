import assert from "node:assert/strict";
import { createParty, validateParties }
  from "../src/core/party-manager.js";
import { createLedger, recordTransaction }
  from "../src/core/finance-ledger.js";

import { recordCampaignExpense }
  from "../src/core/campaign-finance.js";

import { allocateTicket, autoAllocateTickets }
  from "../src/core/ticket-allocation.js";

const party = createParty({
  id: "party-1",
  name: "Test Party"
});

assert.equal(party.fund, 1000);
assert.equal(validateParties([party]), true);

const ledger = createLedger(1000);
const afterExpense = recordTransaction(ledger, {
  type: "expense",
  amount: 100,
  description: "Campaign"
});

assert.equal(afterExpense.balance, 900);

assert.throws(() => recordTransaction(afterExpense, {
  type: "expense",
  amount: 2000
}));

const seats = [
  {
    id: "seat-001",
    candidates: [
      { id: "c1", popularity: 20 },
      { id: "c2", popularity: 80 },
      { id: "c3", popularity: 40 }
    ]
  },
  {
    id: "seat-002",
    candidates: [
      { id: "c4", popularity: 60 },
      { id: "c5", popularity: 30 },
      { id: "c6", popularity: 10 }
    ]
  }
];

allocateTicket(seats, "seat-001", "c1");
assert.equal(seats[0].ticketedCandidateId, "c1");

const automatic = autoAllocateTickets(seats, "party-1");
assert.equal(automatic.length, 2);
assert.equal(
  new Set(automatic.map(s => s.ticketedCandidateId)).size,
  2
);

const campaignResult = recordCampaignExpense(
  createLedger(1000),
  {},
  "seat-001",
  25,
  "Campaign advertising"
);

assert.equal(campaignResult.ledger.balance, 975);
assert.equal(campaignResult.campaign["seat-001"], 25);
assert.equal(campaignResult.ledger.transactions.length, 1);
assert.equal(
  campaignResult.ledger.transactions[0].type,
  "expense"
);

assert.throws(() =>
  recordCampaignExpense(
    createLedger(1000),
    {},
    "seat-001",
    2000,
    "Overspending"
  )
);

assert.throws(() =>
  recordCampaignExpense(
    createLedger(1000),
    {},
    "",
    25,
    "Missing constituency"
  )
);
                                      
console.log("PASS: party, ticket and finance tests");
