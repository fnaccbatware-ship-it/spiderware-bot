const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return val * multipliers[unit];
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 1h, 30m, 2d)').setRequired(true))
    .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1).setMaxValue(50))
    .addStringOption(opt => opt.setName('prize').setDescription('What are they winning?').setRequired(true)),

  async execute(interaction) {
    const durationStr = interaction.options.getString('duration');
    const winnerCount = interaction.options.getInteger('winners');
    const prize = interaction.options.getString('prize');
    const durationMs = parseDuration(durationStr);

    if (!durationMs || durationMs < 10000) {
      return interaction.reply({ content: 'Invalid duration. Use format like `1h`, `30m`, `2d`. Minimum 10 seconds.', ephemeral: true });
    }

    const endsAt = Date.now() + durationMs;

    const embed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle('🕷️ SpiderWare Giveaway')
      .setDescription(
        `**Prize:** ${prize}\n` +
        `**Winners:** ${winnerCount}\n` +
        `**Ends:** <t:${Math.floor(endsAt / 1000)}:R>\n\n` +
        `Click **Join** below to enter!`
      )
      .setFooter({ text: `Hosted by ${interaction.user.tag}` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_join`)
        .setLabel('Join 🎉')
        .setStyle(ButtonStyle.Success)
    );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const { giveaways } = require('../../index');
    giveaways.set(msg.id, {
      messageId: msg.id,
      channelId: msg.channel.id,
      hostId: interaction.user.id,
      prize,
      winnerCount,
      endsAt,
      entries: new Set()
    });

    setTimeout(async () => {
      const gw = giveaways.get(msg.id);
      if (!gw) return;
      giveaways.delete(msg.id);

      const channel = await interaction.client.channels.fetch(gw.channelId).catch(() => null);
      if (!channel) return;

      const message = await channel.messages.fetch(gw.messageId).catch(() => null);
      if (!message) return;

      const entries = Array.from(gw.entries);
      let winners = [];
      if (entries.length === 0) {
        winners = ['No entries'];
      } else {
        const count = Math.min(gw.winnerCount, entries.length);
        const shuffled = entries.sort(() => Math.random() - 0.5);
        winners = shuffled.slice(0, count).map(id => `<@${id}>`);
      }

      const endEmbed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle('🕷️ SpiderWare Giveaway Ended')
        .setDescription(
          `**Prize:** ${gw.prize}\n` +
          `**Winners:** ${winners.join(', ')}\n` +
          `**Total Entries:** ${entries.length}`
        )
        .setFooter({ text: `Hosted by ${interaction.user.tag}` })
        .setTimestamp();

      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_join')
          .setLabel('Ended 🎉')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await message.edit({ embeds: [endEmbed], components: [disabledRow] });
      await channel.send({
        content: winners[0] === 'No entries' ? `🎉 Giveaway ended! No one entered for **${gw.prize}**.` : `🎉 Congratulations ${winners.join(', ')}! You won **${gw.prize}**!`,
        allowedMentions: { parse: ['users'] }
      });
    }, durationMs);
  }
};
