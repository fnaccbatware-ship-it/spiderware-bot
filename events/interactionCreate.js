  vouchChannel.send({ embeds: [embed] });
  return interaction.reply({ content: `Vouch submitted successfully! Posted in <#${settings.vouch_channel_id}>.`, ephemeral: true });
}

module.exports = async (interaction, giveaways) => {
  if (!interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit()) return;

  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type_select') {
      return await handleTicketSelect(interaction);
    }

    if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
      return await handleTicketButtons(interaction);
    }

    if (interaction.isButton() && interaction.customId === 'giveaway_join') {
      const gw = giveaways.get(interaction.message.id);
      if (!gw) {
        return interaction.reply({ content: 'This giveaway has ended.', ephemeral: true });
      }
      if (Date.now() > gw.endsAt) {
        return interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
      }
      if (gw.entries.has(interaction.user.id)) {
        gw.entries.delete(interaction.user.id);
        return interaction.reply({ content: 'You left the giveaway.', ephemeral: true });
      }
      gw.entries.add(interaction.user.id);
      return interaction.reply({ content: `You entered the giveaway for **${gw.prize}**! Good luck!`, ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ticket_rename_modal') {
      const newName = interaction.fields.getTextInputValue('new_name');
      await interaction.channel.setName(newName).catch(() => {});
      return interaction.reply({ content: `Channel renamed to **${newName}**`, ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId === 'vouch_modal') {
      return await handleVouchModal(interaction);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('vouch_panel_modal_')) {
      const vouchChannelId = interaction.customId.replace('vouch_panel_modal_', '');
      const vouchChannel = interaction.guild.channels.cache.get(vouchChannelId);
      if (!vouchChannel) {
        return interaction.reply({ content: 'Vouch channel not found.', ephemeral: true });
      }

      const targetInput = interaction.fields.getTextInputValue('vouch_target');
      const ratingRaw = interaction.fields.getTextInputValue('vouch_rating');
      const review = interaction.fields.getTextInputValue('vouch_review');
      const rating = parseInt(ratingRaw, 10);

      if (isNaN(rating) || rating < 1 || rating > 5) {
        return interaction.reply({ content: 'Invalid rating. Please enter a number between 1 and 5.', ephemeral: true });
      }

      let targetId = targetInput.trim();
      if (targetId.startsWith('<@') && targetId.endsWith('>')) {
        targetId = targetId.slice(2, -1);
        if (targetId.startsWith('!')) targetId = targetId.slice(1);
      }

      const target = await interaction.guild.members.fetch(targetId).catch(() => null);
      if (!target) {
        return interaction.reply({ content: 'User not found. Please provide a valid user mention or ID.', ephemeral: true });
      }

      if (target.id === interaction.user.id) {
        return interaction.reply({ content: 'You cannot vouch for yourself.', ephemeral: true });
      }
      if (target.user.bot) {
        return interaction.reply({ content: 'You cannot vouch for a bot.', ephemeral: true });
      }

      const settings = stmts.getSettings.get(interaction.guild.id);
      if (!settings || !settings.vouch_channel_id) {
        return interaction.reply({ content: 'Vouch channel is not configured. Ask an admin to set it up.', ephemeral: true });
      }

      const actualVouchChannel = interaction.guild.channels.cache.get(settings.vouch_channel_id);
      if (!actualVouchChannel) {
        return interaction.reply({ content: 'Vouch channel not found. Ask an admin to reconfigure.', ephemeral: true });
      }

      stmts.incrementVouchCounter.run(interaction.guild.id);
      const counterRow = stmts.getVouchCounter.get(interaction.guild.id);
      const vouchNumber = counterRow ? counterRow.counter : 1;

      stmts.createVouch.run(interaction.guild.id, target.id, interaction.user.id, rating, review, vouchNumber, null);

      const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
      const authorMember = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

      const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
      const date = new Date().toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle('🕷️ SpiderWare Vouch')
        .setDescription(
          `**Vouch #${String(vouchNumber).padStart(3, '0')}**\n\n` +
          `**Customer:** <@${target.id}>\n` +
          `**Vouched by:** <@${interaction.user.id}>\n` +
          `**Rating:** ${stars} (${rating}/5)\n` +
          `**Review:** ${review}\n` +
          `**Date:** ${date}`
        )
        .setImage(BANNER)
        .setThumbnail(authorMember ? authorMember.displayAvatarURL({ dynamic: true, size: 256 }) : null)
        .setTimestamp();

      await actualVouchChannel.send({ embeds: [embed] });
      return interaction.reply({ content: `Vouch submitted successfully! Posted in <#${settings.vouch_channel_id}>.`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId.startsWith('vouch_panel_')) {
      const vouchChannelId = interaction.customId.replace('vouch_panel_', '');
      const vouchChannel = interaction.guild.channels.cache.get(vouchChannelId);
      if (!vouchChannel) {
        return interaction.reply({ content: 'Vouch channel not found.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`vouch_panel_modal_${vouchChannelId}`)
        .setTitle('SpiderWare Vouch');

      const userInput = new TextInputBuilder()
        .setCustomId('vouch_target')
        .setLabel('User to vouch for (mention or ID)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('@username or 123456789012345678')
        .setRequired(true)
        .setMaxLength(50);

      const ratingInput = new TextInputBuilder()
        .setCustomId('vouch_rating')
        .setLabel('Rating (1-5 stars)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a number 1-5')
        .setRequired(true)
        .setMaxLength(1);

      const reviewInput = new TextInputBuilder()
        .setCustomId('vouch_review')
        .setLabel('Review / Comment')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Write your experience...')
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(userInput),
        new ActionRowBuilder().addComponents(ratingInput),
        new ActionRowBuilder().addComponents(reviewInput)
      );

      return interaction.showModal(modal);
    }
  } catch (err) {
    console.error(err);
    const reply = { content: 'An error occurred while processing your interaction.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
};

module.exports.vouchPending = vouchPending;
