const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Give or remove a rank/role from a member')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Who should get the role changed')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('rank')
        .setDescription('The role/rank to add or remove (example: @Moderator)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Choose how to apply the role')
        .setRequired(true)
        .addChoices(
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' },
          { name: 'Toggle', value: 'toggle' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const member = await interaction.guild.members.fetch(interaction.options.getUser('user').id);
      const roleInput = interaction.options.getString('rank');
      const roleId = roleInput.match(/^<@&(\d+)>$/)?.[1] || roleInput.trim();
      const role = interaction.guild.roles.cache.get(roleId) || await interaction.guild.roles.fetch(roleId).catch(() => null);
      const mode = interaction.options.getString('mode');

      if (!member) {
        return interaction.editReply('I could not find that member in this server.');
      }

      if (!role) {
        return interaction.editReply('I could not find that role. You can use @Role or paste the role ID.');
      }

      if (member.id === interaction.guild.ownerId) {
        return interaction.editReply('You cannot change the owner’s roles.');
      }

      const hasRole = member.roles.cache.has(role.id);

      if (mode === 'toggle') {
        if (hasRole) {
          await member.roles.remove(role);
          return interaction.editReply(`🔄 Toggled **${role.name}** off for **${member.user.tag}**.`);
        }
        await member.roles.add(role);
        return interaction.editReply(`🔄 Toggled **${role.name}** on for **${member.user.tag}**.`);
      }

      if (mode === 'add') {
        if (hasRole) {
          return interaction.editReply(`ℹ️ **${member.user.tag}** already has **${role.name}**.`);
        }
        await member.roles.add(role);
        return interaction.editReply(`✅ Added **${role.name}** to **${member.user.tag}**.`);
      }

      if (!hasRole) {
        return interaction.editReply(`ℹ️ **${member.user.tag}** does not have **${role.name}**.`);
      }

      await member.roles.remove(role);
      return interaction.editReply(`🗑️ Removed **${role.name}** from **${member.user.tag}**.`);
    } catch (error) {
      console.error(error);
      return interaction.editReply('I could not update that role because of permissions or a bot hierarchy issue.');
    }
  },
};
