const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('Who to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Why').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    if (!global.warnings[user.id]) global.warnings[user.id] = [];
    global.warnings[user.id].push({ reason, date: new Date().toLocaleString() });
    const count = global.warnings[user.id].length;

    const embed = new EmbedBuilder()
      .setColor(0xFFD166)
      .setTitle('Warning Recorded')
      .setDescription(`**${user.tag}** has been warned successfully.`)
      .addFields(
        { name: 'Reason', value: reason, inline: false },
        { name: 'Total Warnings', value: `${count}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};