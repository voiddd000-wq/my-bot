require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { awardDaily, getBalance, getUser, startBlackjack, hitBlackjack, standBlackjack, formatHand } = require('./economy');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

client.once('ready', () => console.log(`✅ Bot is online as ${client.user.tag}`));

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const lower = content.toLowerCase();

  if (!lower.startsWith('zehd ') && !lower.startsWith('bj ')) return;

  const args = lower.startsWith('zehd ') ? content.slice(5).trim().split(/\s+/) : content.slice(3).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === 'daily') {
    const result = awardDaily(message.author.id, message.author.tag);
    if (!result.ok) {
      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('⏳ Daily reward is on cooldown')
        .setDescription(`Come back in **${result.nextTime}** for your next stack of coins.`)
        .addFields({ name: 'Current balance', value: `💰 ${result.balance} coins`, inline: true })
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Zehd Economy • Daily reward', iconURL: message.author.displayAvatarURL() });
      return message.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x22C55E)
      .setTitle('💸 Daily reward claimed')
      .setDescription(`You earned **${result.reward} coins**. Your vault is looking healthy.`)
      .addFields({ name: 'New balance', value: `💰 ${result.balance} coins`, inline: true }, { name: 'Next reward', value: '⏱️ 24 hours', inline: true })
      .setThumbnail(message.author.displayAvatarURL())
      .setFooter({ text: 'Zehd Economy • Fresh coins every day', iconURL: message.author.displayAvatarURL() });
    return message.reply({ embeds: [embed] });
  }

  if (command === 'balance') {
    const balance = getBalance(message.author.id, message.author.tag);
    const user = getUser(message.author.id, message.author.tag);
    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('💰 Zehd Wallet')
      .setDescription(`You currently hold **${balance} coins**.`)
      .addFields(
        { name: 'Daily status', value: user.lastDaily ? '🕒 Ready again after 24h' : '✅ Ready to claim now', inline: true },
        { name: 'Fast play', value: 'Use `bj start 25` or `zehd daily` to stack more.', inline: true },
      )
      .setThumbnail(message.author.displayAvatarURL())
      .setFooter({ text: 'Zehd Economy • Keep stacking!', iconURL: message.author.displayAvatarURL() });
    return message.reply({ embeds: [embed] });
  }

  if (command === 'blackjack' || command === 'bj' || (lower.startsWith('bj ') && ['hit', 'stand', 'start'].includes(command))) {
    const subcommand = lower.startsWith('bj ') ? command : args.shift()?.toLowerCase();
    if (subcommand === 'start') {
      const bet = Number(args[0] || 25);
      const result = startBlackjack(message.author.id, message.author.tag, bet);
      if (!result.ok) return message.reply(`❌ ${result.reason}`);

      const state = result.state;
      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🃏 Zehd Blackjack • Round Started')
        .setDescription('Fast play: `bj hit` or `bj stand`. Full style: `zehd blackjack hit` / `zehd blackjack stand`.')
        .addFields(
          { name: '🧠 Your hand', value: `${formatHand(state.playerHand)}\n**Total:** ${state.playerTotal}`, inline: false },
          { name: '🏦 Dealer hand', value: `${formatHand(state.dealerHand)}\n**Total:** ${state.dealerTotal}`, inline: false },
          { name: '💵 Bet', value: `${bet} coins`, inline: true },
          { name: '⚡ Quick controls', value: '`bj hit` • `bj stand`', inline: true },
        )
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Zehd Casino • Hit or stand to continue', iconURL: message.author.displayAvatarURL() });
      return message.reply({ embeds: [embed] });
    }

    if (subcommand === 'hit') {
      const result = hitBlackjack(message.author.id);
      if (!result.ok) return message.reply(`❌ ${result.reason}`);
      if (result.finalState) {
        const embed = new EmbedBuilder()
          .setColor(0x22C55E)
          .setTitle('🃏 Blackjack result')
          .setDescription(`${result.message} You received **${result.payout} coins** back.`)
          .setThumbnail(message.author.displayAvatarURL())
          .setFooter({ text: 'Zehd Casino • Good luck at the table', iconURL: message.author.displayAvatarURL() });
        return message.reply({ embeds: [embed] });
      }
      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🃏 Card drawn')
        .setDescription(`You drew another card. Current total is **${result.state.playerTotal}**.`)
        .addFields({ name: 'Next move', value: 'Use `bj hit` to draw again or `bj stand` to lock in your hand.', inline: false })
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Zehd Casino • Keep the streak going', iconURL: message.author.displayAvatarURL() });
      return message.reply({ embeds: [embed] });
    }

    if (subcommand === 'stand') {
      const result = standBlackjack(message.author.id);
      if (!result.ok) return message.reply(`❌ ${result.reason}`);
      const embed = new EmbedBuilder()
        .setColor(0x8B5CF6)
        .setTitle('🃏 Blackjack settled')
        .setDescription(`${result.message} You received **${result.payout} coins** back.`)
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: 'Zehd Casino • House always wins sometimes', iconURL: message.author.displayAvatarURL() });
      return message.reply({ embeds: [embed] });
    }

    return message.reply('Use `zehd blackjack start <bet>`, `zehd blackjack hit`, or `zehd blackjack stand`.');
  }
});

const AUTO_ROLE_ID = '1513946224955228223';

client.on('guildMemberAdd', async member => {
  try {
    const role = await member.guild.roles.fetch(AUTO_ROLE_ID);
    if (!role) return;

    await member.roles.add(role).catch(() => null);
  } catch (err) {
    console.error('Auto-role error:', err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error('Slash command error:', err);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'Something went wrong while running that command.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Something went wrong while running that command.', ephemeral: true });
      }
    } catch (replyErr) {
      console.error('Failed to send error reply:', replyErr);
    }
  }
});

// Reaction role: give role when user reacts
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  const map = global.reactionRoles?.[reaction.message.id];
  if (!map) return;
  const roleId = map[reaction.emoji.name];
  if (!roleId) return;
  const member = await reaction.message.guild.members.fetch(user.id);
  await member.roles.add(roleId);
});

// Reaction role: remove role when user un-reacts
client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  const map = global.reactionRoles?.[reaction.message.id];
  if (!map) return;
  const roleId = map[reaction.emoji.name];
  if (!roleId) return;
  const member = await reaction.message.guild.members.fetch(user.id);
  await member.roles.remove(roleId);
});

global.reactionRoles = {};
global.warnings = {};

client.login(process.env.TOKEN);