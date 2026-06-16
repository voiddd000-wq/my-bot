const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'economy.json');

function ensureDataFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '{}', 'utf8');
  }
}

function loadEconomy() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveEconomy(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getUser(userId, userTag) {
  const data = loadEconomy();
  if (!data[userId]) {
    data[userId] = {
      balance: 500,
      lastDaily: 0,
      tag: userTag || 'Unknown User',
      level: 1,
      xp: 0,
      messages: 0,
    };
    saveEconomy(data);
  }

  data[userId].tag = userTag || data[userId].tag || 'Unknown User';
  data[userId].level = data[userId].level || 1;
  data[userId].xp = data[userId].xp || 0;
  data[userId].messages = data[userId].messages || 0;

  if (!data[userId].balance) data[userId].balance = 500;
  saveEconomy(data);
  return data[userId];
}

function saveUser(userId, user) {
  const data = loadEconomy();
  data[userId] = user;
  saveEconomy(data);
}

function getBalance(userId, userTag) {
  return getUser(userId, userTag).balance;
}

function addCoins(userId, amount, userTag) {
  const user = getUser(userId, userTag);
  user.balance += amount;
  saveUser(userId, user);
  return user.balance;
}

function xpNeededForLevel(level) {
  return 120 + 80 * level;
}

function getLevelInfo(userId, userTag) {
  const user = getUser(userId, userTag);
  const level = user.level || 1;
  const xp = user.xp || 0;
  const needed = xpNeededForLevel(level);
  const progress = Math.min(100, Math.round((xp / needed) * 100));

  return {
    level,
    xp,
    needed,
    progress,
    remaining: Math.max(0, needed - xp),
  };
}

function addXp(userId, amount, userTag) {
  const user = getUser(userId, userTag);
  user.xp = (user.xp || 0) + amount;
  user.messages = (user.messages || 0) + 1;

  let leveledUp = false;
  while (user.xp >= xpNeededForLevel(user.level)) {
    user.xp -= xpNeededForLevel(user.level);
    user.level += 1;
    leveledUp = true;
  }

  saveUser(userId, user);
  return { user, leveledUp, ...getLevelInfo(userId, userTag) };
}

function removeCoins(userId, amount, userTag) {
  const user = getUser(userId, userTag);
  if (user.balance < amount) return false;
  user.balance -= amount;
  saveUser(userId, user);
  return true;
}

function awardDaily(userId, userTag) {
  const user = getUser(userId, userTag);
  const now = Date.now();
  const cooldownMs = 24 * 60 * 60 * 1000;
  const reward = 150 + Math.floor(Math.random() * 101);

  if (now - user.lastDaily < cooldownMs) {
    const remaining = cooldownMs - (now - user.lastDaily);
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return {
      ok: false,
      reward: 0,
      nextTime: `${hours}h ${mins}m`,
      balance: user.balance,
    };
  }

  user.balance += reward;
  user.lastDaily = now;
  saveUser(userId, user);

  return { ok: true, reward, nextTime: '24h', balance: user.balance };
}

function formatHand(cards) {
  return cards.map(card => `${card.rank}${card.suit}`).join(' • ');
}

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return Number(card.rank);
}

function handValue(cards) {
  let total = cards.reduce((sum, card) => sum + cardValue(card), 0);
  let aces = cards.filter(card => card.rank === 'A').length;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function drawCard() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return {
    suit: suits[Math.floor(Math.random() * suits.length)],
    rank: ranks[Math.floor(Math.random() * ranks.length)],
  };
}

function startBlackjack(userId, userTag, bet) {
  const user = getUser(userId, userTag);
  if (user.balance < bet) {
    return { ok: false, reason: 'You do not have enough coins for that bet.' };
  }

  if (!removeCoins(userId, bet, userTag)) {
    return { ok: false, reason: 'You do not have enough coins for that bet.' };
  }

  const playerHand = [drawCard(), drawCard()];
  const dealerHand = [drawCard(), drawCard()];
  const state = {
    bet,
    playerHand,
    dealerHand,
    playerTotal: handValue(playerHand),
    dealerTotal: handValue(dealerHand),
    status: 'playing',
  };

  global.blackjackGames = global.blackjackGames || {};
  global.blackjackGames[userId] = state;

  if (state.playerTotal === 21) {
    return finishBlackjack(userId, 'stand');
  }

  return {
    ok: true,
    state,
    message: 'Blackjack started! Hit or stand?',
  };
}

function hitBlackjack(userId) {
  global.blackjackGames = global.blackjackGames || {};
  const state = global.blackjackGames[userId];
  if (!state) return { ok: false, reason: 'No active blackjack game found. Start one with /blackjack or zehd blackjack start <bet>.' };

  state.playerHand.push(drawCard());
  state.playerTotal = handValue(state.playerHand);

  if (state.playerTotal > 21) {
    return finishBlackjack(userId, 'bust');
  }

  return { ok: true, state, message: 'You drew a card. Hit again or stand.' };
}

function standBlackjack(userId) {
  return finishBlackjack(userId, 'stand');
}

function finishBlackjack(userId, reason) {
  global.blackjackGames = global.blackjackGames || {};
  const state = global.blackjackGames[userId];
  if (!state) return { ok: false, reason: 'No active blackjack game found.' };

  let dealerTotal = state.dealerTotal;
  while (dealerTotal < 17) {
    state.dealerHand.push(drawCard());
    dealerTotal = handValue(state.dealerHand);
  }
  state.dealerTotal = dealerTotal;

  const playerTotal = state.playerTotal;
  let result = '';
  let payout = 0;

  if (reason === 'bust' || playerTotal > 21) {
    result = 'You busted. House wins.';
    payout = 0;
  } else if (dealerTotal > 21) {
    result = 'Dealer busted. You win!';
    payout = state.bet * 2;
    addCoins(userId, state.bet * 2, null);
  } else if (playerTotal > dealerTotal) {
    result = 'You win!';
    payout = state.bet * 2;
    addCoins(userId, state.bet * 2, null);
  } else if (playerTotal === dealerTotal) {
    result = 'Push — your bet is returned.';
    payout = state.bet;
    addCoins(userId, state.bet, null);
  } else {
    result = 'Dealer wins.';
    payout = 0;
  }

  const finalState = { ...state, result, payout };
  delete global.blackjackGames[userId];
  return { ok: true, finalState, message: result, payout };
}

module.exports = {
  getBalance,
  addCoins,
  removeCoins,
  awardDaily,
  getUser,
  getLevelInfo,
  addXp,
  xpNeededForLevel,
  startBlackjack,
  hitBlackjack,
  standBlackjack,
  formatHand,
  handValue,
  drawCard,
};
