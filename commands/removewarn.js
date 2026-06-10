const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removewarn')
    .setDescription('Remove one or more warnings from a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Who to remove warnings from')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('How many warnings to remove (default: 1)')
        .setMinValue(1)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount') ?? 1;

    if (!global.warnings[user.id] || global.warnings[user.id].length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('No Warnings Found')
        .setDescription(`**${user.tag}** has no warnings to remove.`)
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    const removedCount = Math.min(amount, global.warnings[user.id].length);
    global.warnings[user.id].splice(0, removedCount);
    const remainingCount = global.warnings[user.id].length;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Warnings Removed')
      .setDescription(`Removed **${removedCount}** warning(s) from **${user.tag}**.`)
      .addFields(
        { name: 'Remaining Warnings', value: `${remainingCount}`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
