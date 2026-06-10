const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check a member\'s warnings')
    .addUserOption(o => o.setName('user').setDescription('Who to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const list = global.warnings[user.id];
    if (!list || list.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Warnings Check')
        .setDescription(`**${user.tag}** has no warnings on record.`)
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    const text = list.map((w, i) => `**${i + 1}.** ${w.reason} \n*${w.date}*`).join('\n\n');
    const embed = new EmbedBuilder()
      .setColor(0xFFB703)
      .setTitle('Warning History')
      .setDescription(`Warnings for **${user.tag}**`)
      .addFields({ name: 'Details', value: text })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};