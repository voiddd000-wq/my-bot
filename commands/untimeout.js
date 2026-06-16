const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a timeout from a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Who to remove the timeout from')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for removing the timeout')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason');
      const member = await interaction.guild.members.fetch(user.id);

      if (!member) {
        return interaction.editReply('I could not find that member in this server.');
      }

      if (!member.isCommunicationDisabled()) {
        return interaction.editReply(`**${user.tag}** is not currently timed out.`);
      }

      await member.timeout(null, reason);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Timeout Removed')
        .setDescription(`The timeout for **${user.tag}** has been removed.`)
        .addFields(
          { name: 'Reason', value: reason, inline: false },
          { name: 'Moderator', value: interaction.user.tag, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('I could not remove the timeout right now.');
    }
  },
};
