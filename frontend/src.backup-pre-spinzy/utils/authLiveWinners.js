import {
  cloneGuestWinnerRows,
  parseWinnerPrize,
  tickGuestWinnerRows,
} from './guestWinnersLeaderboard';

const PLATFORM_STYLES = {
  juwa: { ic: '🎰', bg: 'linear-gradient(135deg,#d97706,#7c2d12)' },
  orionstars: { ic: '⭐', bg: 'linear-gradient(135deg,#ed3a53,#951d2d)' },
  pandamaster: { ic: '🐼', bg: 'linear-gradient(135deg,#e9b20e,#755c15)' },
  pandamasters: { ic: '🐼', bg: 'linear-gradient(135deg,#e9b20e,#755c15)' },
  milkyway: { ic: '✨', bg: 'linear-gradient(135deg,#ec6048,#831843)' },
  'ultra panda': { ic: '🅿️', bg: 'linear-gradient(135deg,#16a34a,#065f46)' },
  'fortune gods': { ic: '🏛️', bg: 'linear-gradient(135deg,#f59e0b,#78350f)' },
  'golden dragon': { ic: '🐉', bg: 'linear-gradient(160deg,#eab308,#78350f)' },
  firekirin: { ic: '🔥', bg: 'linear-gradient(135deg,#f43f5e,#7f1d1d)' },
  vblink: { ic: '⚡', bg: 'linear-gradient(135deg,#f1de63,#81772e)' },
  gameroom: { ic: '🎲', bg: 'linear-gradient(135deg,#b88314,#5e4611)' },
};

export function platformStyleForGame(gameName) {
  const normalized = String(gameName || '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (const [key, style] of Object.entries(PLATFORM_STYLES)) {
    if (normalized.includes(key)) return style;
  }
  return { ic: '🎰', bg: 'linear-gradient(135deg,#ed3a53,#951d2d)' };
}

export function buildAuthLiveWinners(tab = 'today') {
  return cloneGuestWinnerRows(tab).map((row) => {
    const style = platformStyleForGame(row.game);
    return {
      id: row._id,
      name: row.player,
      amount: parseWinnerPrize(row.prize),
      platform: row.game,
      ic: row.avatar || style.ic,
      bg: style.bg,
    };
  });
}

export function tickAuthLiveWinners(rows, tab = 'today') {
  const nextRows = tickGuestWinnerRows(
    rows.map((row) => ({
      player: row.name,
      game: row.platform,
      prize: `${Math.round(row.amount).toLocaleString('en-US')} SC`,
      avatar: row.ic,
      _id: row.id,
      location: '',
      trend: 'up',
    })),
    tab
  );

  return nextRows.map((row) => {
    const style = platformStyleForGame(row.game);
    return {
      id: row._id,
      name: row.player,
      amount: parseWinnerPrize(row.prize),
      platform: row.game,
      ic: row.avatar || style.ic,
      bg: style.bg,
    };
  });
}
