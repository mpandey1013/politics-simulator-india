export function conductElection(seats) {
  return seats.map(seat => {
    const candidates = seat.candidates.map(candidate => ({
      ...candidate,
      votes: Math.max(
        0,
        Math.floor(Number(candidate.votes) || 0)
      )
    }));

    candidates.sort((a, b) => b.votes - a.votes);

    const winner = candidates[0];
    const runnerUp = candidates[1];

    return {
      ...seat,
      candidates,
      winnerId: winner ? winner.id : null,
      winningVotes: winner ? winner.votes : 0,
      margin: winner
        ? winner.votes - (runnerUp ? runnerUp.votes : 0)
        : 0
    };
  });
}
