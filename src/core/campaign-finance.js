
import { recordTransaction } from "./finance-ledger.js";

export function recordCampaignExpense(
  ledger,
  campaign,
  seatId,
  amount,
  description = ""
) {
  if (!seatId || typeof seatId !== "string") {
    throw new Error("A constituency is required");
  }

  const updatedLedger = recordTransaction(ledger, {
    type: "expense",
    amount,
    description: description || "Campaign expense"
  });

  return {
    ledger: updatedLedger,
    campaign: {
      ...campaign,
      [seatId]: (Number(campaign?.[seatId]) || 0) + amount
    }
  };
}
