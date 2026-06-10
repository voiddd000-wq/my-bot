const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('Who to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Why'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (!member) return interaction.editReply('User not found.');

      await member.ban({ reason });
      const embed = new EmbedBuilder()
        .setColor(0xF04A47)
        .setTitle('Member Banned')
        .setDescription(`**${user.tag}** has been successfully banned from the server.`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true }
        )
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('I could not ban that user right now.');
    }
  }
};