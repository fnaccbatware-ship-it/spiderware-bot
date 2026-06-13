const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setticketchannel')
    .setDescription('Set the channel where the ticket panel is posted (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The ticket panel channel')
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    stmts.setTicketChannel.run(interaction.guild.id, channel.id);
    return interaction.reply({ content: `Ticket channel set to <#${channel.id}>. Use /ticketpanel there.`, ephemeral: true });
  }
};
