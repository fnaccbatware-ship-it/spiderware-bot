const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstaffrole')
    .setDescription('Set the staff role that gets pinged in new tickets (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The staff role')
        .setRequired(true)
    ),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    stmts.setStaffRole.run(interaction.guild.id, role.id);
    return interaction.reply({ content: `Staff role set to <@&${role.id}>.`, ephemeral: true });
  }
};
