const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits } = require('discord.js');

const BANNER = process.env.BANNER_URL || '';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Send the SpiderWare ticket panel (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle('🕷️ SpiderWare Support Center')
      .setDescription('Need help? Choose a ticket type below and our team will assist you.')
      .setImage(BANNER)
      .setFooter({ text: 'SpiderWare Services', iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_type_select')
      .setPlaceholder('Select a ticket type...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Support')
          .setDescription('For help with issues/questions')
          .setValue('support')
          .setEmoji('🛠️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Purchase')
          .setDescription('For buying products/services')
          .setValue('purchase')
          .setEmoji('💳'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Partnership')
          .setDescription('For partnerships and collaborations')
          .setValue('partnership')
          .setEmoji('🤝'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Media')
          .setDescription('For content creators/media requests')
          .setValue('media')
          .setEmoji('🎥'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Team Apply')
          .setDescription('For staff/team applications')
          .setValue('teamapply')
          .setEmoji('👥')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: 'Ticket panel sent.', ephemeral: true });
  }
};
