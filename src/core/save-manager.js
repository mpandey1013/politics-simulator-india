const SAVE_KEY = "politics-simulator-india-v1";

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame() {
  const saved = localStorage.getItem(SAVE_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}
