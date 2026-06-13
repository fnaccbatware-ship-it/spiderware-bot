const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Leave a vouch/review for a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to vouch for')
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot vouch for yourself.', ephemeral: true });
    }
    if (target.bot) {
      return interaction.reply({ content: 'You cannot vouch for a bot.', ephemeral: true });
    }

    const eventHandler = require('../../events/interactionCreate');
    eventHandler.vouchPending.set(interaction.user.id, target.id);

    const modal = new ModalBuilder()
      .setCustomId('vouch_modal')
      .setTitle('SpiderWare Vouch');

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
      new ActionRowBuilder().addComponents(ratingInput),
      new ActionRowBuilder().addComponents(reviewInput)
    );

    return interaction.showModal(modal);
  }
};
