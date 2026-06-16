const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member for up to 28 days')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Who to timeout')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('Timeout duration in minutes (max 40320 = 28 days)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason');
      const member = await interaction.guild.members.fetch(user.id);

      if (!member) {
        return interaction.editReply('I could not find that member in this server.');
      }

      if (!member.moderatable) {
        return interaction.editReply('I cannot timeout that member because of role hierarchy or permissions.');
      }

      const durationMs = minutes * 60 * 1000;
      await member.timeout(durationMs, reason);

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('Member Timed Out')
        .setDescription(`**${user.tag}** has been timed out for **${minutes} minute(s)**.`)
        .addFields(
          { name: 'Reason', value: reason, inline: false },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Ends', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:F>`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('I could not apply the timeout right now.');
    }
  },
};
