const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('How many minutes should it last?').setRequired(true))
    .addIntegerOption(o => o.setName('winners').setDescription('How many winners?').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  async execute(interaction) {
    const prize = interaction.options.getString('prize');
    const minutes = interaction.options.getInteger('minutes');
    const winnerCount = interaction.options.getInteger('winners');
    const endsAt = Math.floor((Date.now() + minutes * 60000) / 1000);

    const msg = await interaction.reply({
      content: `🎉 **GIVEAWAY** 🎉\n**Prize:** ${prize}\n**Winners:** ${winnerCount}\n**Ends:** <t:${endsAt}:R>\n\nReact with 🎉 to enter!`,
      fetchReply: true
    });
    await msg.react('🎉');

    setTimeout(async () => {
      const fetched = await msg.fetch();
      const reaction = fetched.reactions.cache.get('🎉');
      const users = await reaction.users.fetch();
      const entries = [...users.filter(u => !u.bot).values()];
      if (entries.length === 0) return msg.channel.send('No valid entries. Giveaway cancelled.');
      const winners = entries.sort(() => Math.random() - 0.5).slice(0, winnerCount).map(u => `<@${u.id}>`).join(', ');
      msg.channel.send(`🎊 Congratulations ${winners}! You won **${prize}**!`);
    }, minutes * 60000);
  }
};