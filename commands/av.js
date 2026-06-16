const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLevelInfo, getUser } = require('../economy');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('av')
    .setDescription('Show a stylish profile card with avatar, level, and XP info')
    .addUserOption(option => option.setName('user').setDescription('Whose profile do you want to view?')),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const profile = getUser(target.id, target.tag);
    const levelInfo = getLevelInfo(target.id, target.tag);
    const progress = Math.max(0, Math.min(10, Math.floor(levelInfo.progress / 10)));
    const progressBar = '█'.repeat(progress) + '░'.repeat(10 - progress);

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6)
      .setTitle(`🪪 ${target.tag}'s Profile`)
      .setDescription('A sleek overview of their avatar, level, and progress in the Zehd economy system.')
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setImage(target.displayAvatarURL({ size: 1024 }))
      .addFields(
        { name: 'Level', value: `🌟 ${levelInfo.level}`, inline: true },
        { name: 'Coins', value: `💰 ${profile.balance}`, inline: true },
        { name: 'Messages', value: `💬 ${profile.messages || 0}`, inline: true },
        { name: 'XP Progress', value: `${levelInfo.xp} / ${levelInfo.needed} XP`, inline: false },
        { name: 'Next Level', value: `⏳ ${levelInfo.remaining} XP to go`, inline: true },
        { name: 'Bar', value: `\`${progressBar}\` ${levelInfo.progress}%`, inline: true },
      )
      .setFooter({ text: 'Zehd Profile • Keep chatting to level up!', iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
