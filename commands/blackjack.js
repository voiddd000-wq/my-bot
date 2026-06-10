const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { startBlackjack, formatHand, handValue } = require('../economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Start a fun blackjack round with Zehd coins')
    .addIntegerOption(option =>
      option.setName('bet').setDescription('How many coins to wager').setRequired(true).setMinValue(10).setMaxValue(5000)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const bet = interaction.options.getInteger('bet');
    const result = startBlackjack(interaction.user.id, interaction.user.tag, bet);

    if (!result.ok) {
      return interaction.editReply(`❌ ${result.reason}`);
    }

    const state = result.state;
    const player = formatHand(state.playerHand);
    const dealer = formatHand(state.dealerHand);
    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('🃏 Zehd Blackjack • Round Started')
      .setDescription('You are in the house now. Use `bj hit` or `bj stand` for a quick play, or `zehd blackjack hit` / `zehd blackjack stand` if you prefer the full command style.')
      .addFields(
        { name: '🧠 Your hand', value: `${player}  \n**Total:** ${state.playerTotal}`, inline: false },
        { name: '🏦 Dealer hand', value: `${dealer}  \n**Total:** ${state.dealerTotal}`, inline: false },
        { name: '💵 Wager', value: `${bet} coins`, inline: true },
        { name: '⚡ Quick controls', value: '`bj hit` • `bj stand`', inline: true },
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Zehd Casino • Hit or stand to continue', iconURL: interaction.user.displayAvatarURL() });

    await interaction.editReply({ embeds: [embed] });
  },
};
