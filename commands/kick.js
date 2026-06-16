const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(o => o.setName('user').setDescription('Who to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Why'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (!member) return interaction.editReply('User not found.');

      await member.kick(reason);
      const embed = new EmbedBuilder()
        .setColor(0xFFB703)
        .setTitle('Member Kicked')
        .setDescription(`**${user.tag}** has been kicked from the server.`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true }
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('I could not kick that user right now.');
    }
  }
};