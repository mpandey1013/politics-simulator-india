export function allocateTicket(seats, seatId, candidateId) {
  const seat = seats.find(s => s.id === seatId);

  if (!seat) throw new Error("Seat not found");

  const candidate = seat.candidates.find(
    c => c.id === candidateId
  );

  if (!candidate) {
    throw new Error("Candidate does not belong to this seat");
  }

  const alreadyUsed = seats.some(s =>
    s.id !== seatId &&
    s.candidates.some(c =>
      c.id === candidateId && c.ticketed === true
    )
  );

  if (alreadyUsed) {
    throw new Error("Candidate already has a ticket");
  }

  seat.candidates.forEach(c => {
    c.ticketed = c.id === candidateId;
  });

  seat.ticketedCandidateId = candidateId;
  return seat;
}

export function autoAllocateTickets(seats, partyId) {
  const used = new Set();

  return seats.map(seat => {
    const eligible = seat.candidates
      .filter(c => !used.has(c.id))
      .sort((a, b) =>
        (Number(b.popularity) || 0) -
        (Number(a.popularity) || 0)
      );

    const candidate = eligible[0];

    if (!candidate) {
      throw new Error(
        `No eligible candidate for ${seat.id}`
      );
    }

    used.add(candidate.id);

    return {
      ...seat,
      candidates: seat.candidates.map(c => ({
        ...c,
        ticketed: c.id === candidate.id
      })),
      ticketedCandidateId: candidate.id,
      ticketedPartyId: partyId
    };
  });
}
