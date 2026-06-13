const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setvouchchannel')
    .setDescription('Set the channel where vouch embeds are posted (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The vouch channel')
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    stmts.setVouchChannel.run(interaction.guild.id, channel.id);
    return interaction.reply({ content: `Vouch channel set to <#${channel.id}>.`, ephemeral: true });
  }
};
