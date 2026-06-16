require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { awardDaily, getBalance, getUser, getLevelInfo, addXp, startBlackjack, hitBlackjack, standBlackjack, formatHand } = require('./economy');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ]
});

const PREFIX = '-';

client.commands = new Collection();
for (const file of fs.readdirSync('./commands').filter(f => f.endsWith('.js'))) {
  const cmd = require(`./commands/${file}`);
  if (cmd?.data?.name) client.commands.set(cmd.data.name, cmd);
}

client.once('ready', () => console.log(`✅ Bot is online as ${client.user.tag}`));

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const xpGain = 4 + Math.floor(Math.random() * 5);
  addXp(message.author.id, xpGain, message.author.tag);

  const content = message.content.trim();
  const lower = content.toLowerCase();

  if (!lower.startsWith(PREFIX)) return;

  const rawArgs = tokenizeArgs(content.slice(PREFIX.length));
  if (rawArgs.length === 0) return;
  const command = rawArgs.shift()?.toLowerCase();

  if (command === 'blackjack' || command === 'bj') {
    const subcommand = rawArgs.shift()?.toLowerCase();
    if (subcommand === 'start') {
      const bet = Number(rawArgs[0] || 25);
      const result = startBlackjack(message.author.id, message.author.tag, bet);
      if (!result.ok) return message.reply(`❌ ${result.reason}`);

      const state = result.state;
      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('🃏 Zehd Blackjack • Round Started')
        .setDescription('Fast play: `-bj hit` or `-bj stand`.')
        .addFields(
          { name: '🧠 Your hand', value: `${formatHand(state.playerHand)}\n**Total:** ${state.playerTotal}`, inline: false },
          { name: '🏦 Dealer hand', value: `${formatHand(state.dealerHand)}\n**Total:** ${state.dealerTotal}`, inline: false },
          { name: '💵 Bet', value: `${bet} coins`, inline: true },
          { name: '⚡ Quick controls', value: '`-bj hit` • `-bj stand`', inline: true },
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
        .addFields({ name: 'Next move', value: 'Use `-bj hit` to draw again or `-bj stand` to lock in your hand.', inline: false })
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

    return message.reply('Use `-bj start <bet>`, `-bj hit`, or `-bj stand`.');
  }

  const cmd = client.commands.get(command);
  if (cmd) {
    try {
      return await runPrefixCommand(message, cmd, rawArgs);
    } catch (err) {
      console.error('Prefix command error:', err);
      return message.reply('Something went wrong while running that command.');
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const cmd = client.commands.get('ticket');
    if (cmd?.handleButtonInteraction) {
      try {
        return await cmd.handleButtonInteraction(interaction);
      } catch (err) {
        console.error('Button interaction error:', err);
        return interaction.reply({ content: 'Something went wrong while processing that button.', ephemeral: true });
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error('Slash command error:', err);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply('Something went wrong while running that command.');
    } else {
      await interaction.reply({ content: 'Something went wrong while running that command.', ephemeral: true });
    }
  }
});

function tokenizeArgs(input) {
  const tokens = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

function resolveUserId(input) {
  const mention = input.match(/^<@!?(\d+)>$/);
  return mention ? mention[1] : input.replace(/^@/, '').trim();
}

function resolveRoleId(input) {
  const mention = input.match(/^<@&(\d+)>$/);
  return mention ? mention[1] : input.replace(/^@/, '').trim();
}

async function runPrefixCommand(message, cmd, args) {
  const data = cmd.data?.toJSON?.() || {};
  const optionValues = {};
  let cursor = 0;

  for (const option of data.options || []) {
    if (cursor >= args.length) break;

    const rawValue = args[cursor];
    if (option.type === 3) {
      optionValues[option.name] = rawValue;
      cursor += 1;
    } else if (option.type === 4) {
      optionValues[option.name] = Number(rawValue);
      cursor += 1;
    } else if (option.type === 6) {
      const userId = resolveUserId(rawValue);
      const matchedUser = message.mentions?.users?.get(userId) || await message.client.users.fetch(userId).catch(() => null);
      optionValues[option.name] = matchedUser || null;
      cursor += 1;
    } else if (option.type === 8) {
      const roleId = resolveRoleId(rawValue);
      const matchedRole = message.mentions?.roles?.get(roleId) || await message.guild.roles.fetch(roleId).catch(() => null);
      optionValues[option.name] = matchedRole || null;
      cursor += 1;
    }
  }

  const interaction = {
    user: message.author,
    member: message.member,
    guild: message.guild,
    channel: message.channel,
    reply: async content => message.reply(content),
    deferReply: async () => {},
    editReply: async content => message.reply(content),
    followUp: async content => message.reply(content),
    options: {
      getUser(name) { return optionValues[name] || null; },
      getString(name) { return optionValues[name] || null; },
      getInteger(name) { return optionValues[name] || null; },
      getRole(name) { return optionValues[name] || null; },
      getMember(name) { return optionValues[name] || null; },
    },
  };

  return cmd.execute(interaction);
}

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