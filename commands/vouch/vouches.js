const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');

const BANNER = process.env.BANNER_URL || '';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouches')
    .setDescription('View vouches and stats for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to look up')
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    const vouches = stmts.getVouchesByUser.all(guildId, target.id);
    const countRow = stmts.getVouchCount.get(guildId, target.id);
    const avgRow = stmts.getAverageRating.get(guildId, target.id);

    const totalVouches = countRow ? countRow.count : 0;
    const averageRating = avgRow && avgRow.avg ? parseFloat(avgRow.avg).toFixed(2) : '0.00';

    const embed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle(`🕷️ SpiderWare Vouches — ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .setImage(BANNER)
      .addFields(
        { name: 'Total Vouches', value: `${totalVouches}`, inline: true },
        { name: 'Average Rating', value: `⭐ ${averageRating} / 5`, inline: true }
      )
      .setTimestamp();

    if (vouches.length > 0) {
      const recent = vouches.slice(0, 5).map(v => {
        const stars = '⭐'.repeat(v.rating);
        const date = new Date(v.created_at * 1000).toLocaleDateString();
        return `**#${String(v.vouch_number).padStart(3, '0')}** — ${stars} — <@${v.vouched_by_id}>\n${v.review.substring(0, 60)}${v.review.length > 60 ? '...' : ''}\n*${date}*`;
      }).join('\n\n');
      embed.setDescription(`Recent Reviews:\n\n${recent}`);
    } else {
      embed.setDescription('No vouches yet.');
    }

    return interaction.reply({ embeds: [embed] });
  }
};
