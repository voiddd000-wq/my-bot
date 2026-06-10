const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { awardDaily } = require('../economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily Zehd coins!'),

  async execute(interaction) {
    await interaction.deferReply();
    const result = awardDaily(interaction.user.id, interaction.user.tag);

    if (!result.ok) {
      const embed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('⏳ Daily cooldown is active')
        .setDescription(`You can claim again in **${result.nextTime}**. Stay patient, the vault is still open.`)
        .addFields(
          { name: 'Current balance', value: `💰 ${result.balance} coins`, inline: true },
          { name: 'Next reward', value: '⏱️ 24 hours', inline: true },
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: 'Zehd Economy • Daily reward', iconURL: interaction.user.displayAvatarURL() });
      return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x22C55E)
      .setTitle('💸 Daily reward claimed')
      .setDescription(`You just picked up **${result.reward} coins**. Nice start to the day.`)
      .addFields(
        { name: 'New balance', value: `💰 ${result.balance} coins`, inline: true },
        { name: 'Next reward', value: '⏱️ 24 hours', inline: true },
        { name: 'Quick tip', value: 'Use `bj start 25` for a fast casino round.', inline: false },
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Zehd Economy • Fresh coins every day', iconURL: interaction.user.displayAvatarURL() });

    await interaction.editReply({ embeds: [embed] });
  },
};
