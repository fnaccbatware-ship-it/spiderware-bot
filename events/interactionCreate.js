const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const { stmts } = require('../database');
const fs = require('fs');
const path = require('path');

const BANNER = process.env.BANNER_URL || '';

const ticketTypeConfig = {
  support: { emoji: '🛠️', label: 'Support', description: 'For help with issues/questions' },
  purchase: { emoji: '💳', label: 'Purchase', description: 'For buying products/services' },
  partnership: { emoji: '🤝', label: 'Partnership', description: 'For partnerships and collaborations' },
  media: { emoji: '🎥', label: 'Media', description: 'For content creators/media requests' },
  teamapply: { emoji: '👥', label: 'Team Apply', description: 'For staff/team applications' }
};

const vouchPending = new Map();

async function handleTicketSelect(interaction) {
  const typeKey = interaction.values[0];
  const config = ticketTypeConfig[typeKey];
  const guild = interaction.guild;
  const user = interaction.user;

  const settings = stmts.getSettings.get(guild.id);
  if (!settings || !settings.staff_role_id) {
    return interaction.reply({ content: 'Ticket system is not fully configured. Ask an admin to set the staff role.', ephemeral: true });
  }

  const openTickets = stmts.getOpenTicketsByUser.all(guild.id, user.id);
  if (openTickets.length >= 2) {
    return interaction.reply({ content: 'You already have 2 open tickets. Please close one first.', ephemeral: true });
  }

  const safeName = user.username.toLowerCase().replace(/[^a-z0-9_-]/g, '').substring(0, 80);
  const channelName = `${config.label.toLowerCase().replace(/\s/g, '-')}-${safeName}`.substring(0, 100);

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      },
      {
        id: settings.staff_role_id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      }
    ]
  });

  stmts.createTicket.run(guild.id, ticketChannel.id, user.id, config.label);

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🕷️ SpiderWare Ticket')
    .setDescription(`Welcome <@${user.id}>,\n\n**Type:** ${config.emoji} ${config.label}\n**Status:** 🟢 Open\n\nPlease describe your issue and our team will assist you shortly.`)
    .setImage(BANNER)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Ticket').setStyle(ButtonStyle.Success).setEmoji('👤'),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket_rename').setLabel('Rename Ticket').setStyle(ButtonStyle.Primary).setEmoji('📝')
  );

  await ticketChannel.send({
    content: `<@${user.id}> <@&${settings.staff_role_id}>`,
    embeds: [embed],
    components: [row]
  });

  return interaction.reply({ content: `Ticket created: <#${ticketChannel.id}>`, ephemeral: true });
}

async function handleTicketButtons(interaction) {
  const ticket = stmts.getTicketByChannel.get(interaction.channel.id);

  if (interaction.customId === 'ticket_claim') {
    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: 'This is not an active ticket channel.', ephemeral: true });
    }
    stmts.claimTicket.run(interaction.user.id, interaction.channel.id);
    const embed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle('🕷️ Ticket Claimed')
      .setDescription(`This ticket has been claimed by <@${interaction.user.id}>.`)
      .setImage(BANNER);
    return interaction.reply({ embeds: [embed] });
  }

  if (interaction.customId === 'ticket_close') {
    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: 'This is not an active ticket channel.', ephemeral: true });
    }

    await interaction.reply({ content: 'Closing ticket and generating transcript...', ephemeral: true });

    const messages = [];
    let lastId;
    while (true) {
      const options = { limit: 100, before: lastId };
      const fetched = await interaction.channel.messages.fetch(options);
      if (fetched.size === 0) break;
      fetched.forEach(msg => {
        const time = new Date(msg.createdTimestamp).toISOString();
        messages.unshift(`[${time}] ${msg.author.tag}: ${msg.content || '(embed/attachment)'}`);
      });
      lastId = fetched.last().id;
    }

    const transcriptText = messages.join('\n');
    const transcriptPath = path.join(__dirname, '..', 'transcripts', `${interaction.channel.id}.txt`);
    fs.writeFileSync(transcriptPath, transcriptText, 'utf8');

    stmts.closeTicket.run(transcriptText, interaction.channel.id);

    const closeEmbed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle('🔒 Ticket Closed')
      .setDescription(`Ticket closed by <@${interaction.user.id}>.\nTranscript saved.`)
      .setImage(BANNER)
      .setTimestamp();

    await interaction.channel.send({ embeds: [closeEmbed] });

    setTimeout(() => {
      interaction.channel.delete('Ticket closed').catch(() => {});
      stmts.deleteTicket.run(interaction.channel.id);
    }, 5000);

    return;
  }

  if (interaction.customId === 'ticket_rename') {
    if (!ticket || ticket.status !== 'open') {
      return interaction.reply({ content: 'This is not an active ticket channel.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('ticket_rename_modal')
      .setTitle('Rename Ticket');

    const nameInput = new TextInputBuilder()
      .setCustomId('new_name')
      .setLabel('New channel name')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. urgent-support-john')
      .setRequired(true)
      .setMaxLength(100);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    return interaction.showModal(modal);
  }
}

async function handleVouchModal(interaction) {
  const targetId = vouchPending.get(interaction.user.id);
  if (!targetId) {
    return interaction.reply({ content: 'Vouch session expired. Please run the command again.', ephemeral: true });
  }
  vouchPending.delete(interaction.user.id);

  const ratingRaw = interaction.fields.getTextInputValue('vouch_rating');
  const review = interaction.fields.getTextInputValue('vouch_review');
  const rating = parseInt(ratingRaw, 10);

  if (isNaN(rating) || rating < 1 || rating > 5) {
    return interaction.reply({ content: 'Invalid rating. Please enter a number between 1 and 5.', ephemeral: true });
  }

  const guild = interaction.guild;
  const settings = stmts.getSettings.get(guild.id);
  if (!settings || !settings.vouch_channel_id) {
    return interaction.reply({ content: 'Vouch channel is not configured. Ask an admin to set it up.', ephemeral: true });
  }

  const vouchChannel = guild.channels.cache.get(settings.vouch_channel_id);
  if (!vouchChannel) {
    return interaction.reply({ content: 'Vouch channel not found. Ask an admin to reconfigure.', ephemeral: true });
  }

  stmts.incrementVouchCounter.run(guild.id);
  const counterRow = stmts.getVouchCounter.get(guild.id);
  const vouchNumber = counterRow ? counterRow.counter : 1;

  stmts.createVouch.run(guild.id, targetId, interaction.user.id, rating, review, vouchNumber);

  const targetMember = await guild.members.fetch(targetId).catch(() => null);
  const authorMember = await guild.members.fetch(interaction.user.id).catch(() => null);

  const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  const date = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const embed = new EmbedBuilder()
    .setColor(0x8B0000)
    .setTitle('🕷️ SpiderWare Vouch')
    .setDescription(
      `**Vouch #${String(vouchNumber).padStart(3, '0')}**\n\n` +
      `**Customer:** <@${targetId}>\n` +
      `**Vouched by:** <@${interaction.user.id}>\n` +
      `**Rating:** ${stars} (${rating}/5)\n` +
      `**Review:** ${review}\n` +
      `**Date:** ${date}`
    )
    .setImage(BANNER)
    .setThumbnail(authorMember ? authorMember.displayAvatarURL({ dynamic: true, size: 256 }) : null)
    .setTimestamp();

  await vouchChannel.send({ embeds: [embed] });
  return interaction.reply({ content: `Vouch submitted successfully! Posted in <#${settings.vouch_channel_id}>.`, ephemeral: true });
}

module.exports = async (interaction) => {
  if (!interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit()) return;

  try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type_select') {
      return await handleTicketSelect(interaction);
    }

    if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
      return await handleTicketButtons(interaction);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ticket_rename_modal') {
      const newName = interaction.fields.getTextInputValue('new_name');
      await interaction.channel.setName(newName).catch(() => {});
      return interaction.reply({ content: `Channel renamed to **${newName}**`, ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId === 'vouch_modal') {
      return await handleVouchModal(interaction);
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
