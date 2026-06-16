const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getBalance, getUser } = require('../economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your Zehd wallet balance')
    .addUserOption(option => option.setName('user').setDescription('Whose balance to check')), 

  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const balance = getBalance(target.id, target.tag);
    const user = getUser(target.id, target.tag);

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle('💰 Zehd Wallet')
      .setDescription(`${target.tag} currently holds **${balance} coins** in the vault.`)
      .addFields(
        { name: 'Daily status', value: user.lastDaily ? '🕒 Ready again after 24h' : '✅ Ready to claim now', inline: true },
        { name: 'Current total', value: `💸 ${balance} coins`, inline: true },
        { name: 'Fast play', value: 'Try `bj start 25` or `zehd daily` for more chips.', inline: false },
      )
      .setThumbnail(target.displayAvatarURL())
      .setFooter({ text: 'Zehd Economy • Keep stacking!', iconURL: interaction.user.displayAvatarURL() });

    await interaction.editReply({ embeds: [embed] });
  },
};
