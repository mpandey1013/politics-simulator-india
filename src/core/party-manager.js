export function createParty({
  id,
  name,
  ideology = "Unspecified",
  fund = 1000
}) {
  if (!id || !name?.trim()) {
    throw new Error("Party ID and name are required");
  }

  if (!Number.isFinite(fund) || fund < 0) {
    throw new Error("Invalid party fund");
  }

  return {
    id,
    name: name.trim(),
    ideology,
    fund,
    seatsWon: 0
  };
}

export function validateParties(parties) {
  const ids = parties.map(p => p.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate party IDs");
  }

  return true;
}
