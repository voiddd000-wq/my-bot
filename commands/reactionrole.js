const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Set up a reaction role message')
    .addStringOption(o => o.setName('message').setDescription('The message to post').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true))
    .addStringOption(o => o.setName('emoji').setDescription('Emoji to react with (e.g. 🎮)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const text = interaction.options.getString('message');
    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji');
    const msg = await interaction.reply({ content: text, fetchReply: true });
    await msg.react(emoji);
    if (!global.reactionRoles[msg.id]) global.reactionRoles[msg.id] = {};
    global.reactionRoles[msg.id][emoji] = role.id;
    await interaction.followUp({ content: `✅ Done! React with ${emoji} to get the **${role.name}** role.`, ephemeral: true });
  }
};