const daily = require('./commands/daily');
const balance = require('./commands/balance');
const blackjack = require('./commands/blackjack');

(async () => {
  const calls = [];
  const interaction = {
    user: { id: 'mock-user', tag: 'Mock#0001' },
    options: { getUser: () => null, getInteger: () => 25 },
    deferReply: async () => calls.push('defer'),
    editReply: async (msg) => calls.push(['edit', msg]),
  };

  try {
    await daily.execute(interaction);
    await balance.execute(interaction);
    await blackjack.execute(interaction);
    console.log('MOCK_TEST_OK', calls.length, JSON.stringify(calls).slice(0, 500));
  } catch (e) {
    console.error('MOCK_TEST_FAIL', e);
    process.exitCode = 1;
  }
})();
