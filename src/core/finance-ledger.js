export function createLedger(initialBalance = 1000) {
  if (!Number.isFinite(initialBalance) ||
      initialBalance < 0) {
    throw new Error("Invalid initial balance");
  }

  return {
    balance: initialBalance,
    transactions: []
  };
}

export function recordTransaction(
  ledger,
  { type, amount, description }
) {
  if (!["income", "expense"].includes(type)) {
    throw new Error("Type must be income or expense");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be positive");
  }

  if (type === "expense" && amount > ledger.balance) {
    throw new Error("Insufficient funds");
  }

  const change = type === "income" ? amount : -amount;

  return {
    balance: ledger.balance + change,
    transactions: [
      ...ledger.transactions,
      {
        type,
        amount,
        description: description || "",
        balanceAfter: ledger.balance + change,
        timestamp: new Date().toISOString()
      }
    ]
  };
}
