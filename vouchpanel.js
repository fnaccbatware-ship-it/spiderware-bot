const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { stmts } = require('../../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouchpanel')
    .setDescription('Create a vouch panel with a button to leave vouches (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the vouch panel to')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('vouch_channel')
        .setDescription('The channel where vouches will be posted (user will be redirected here)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const panelChannel = interaction.options.getChannel('channel');
    const vouchChannel = interaction.options.getChannel('vouch_channel');

    if (panelChannel.type !== 0 || vouchChannel.type !== 0) {
      return interaction.reply({ content: 'Both channels must be text channels.', ephemeral: true });
    }

    const bannerUrl = 'https://cdn.discordapp.com/attachments/1515335499563143178/1516357232818651176/143c7b40-7c11-43bb-a539-baa1ad2eb225.png?ex=6a325938&is=6a3107b8&hm=420409f31b3f1d6be5b41eee9448b7bdcc5999c1c54d2b2acdc766b030039779';

    stmts.setVouchChannel.run(interaction.guild.id, vouchChannel.id);

    const embed = new EmbedBuilder()
      .setColor(0x8B0000)
      .setTitle('🕷️ SpiderWare Vouches')
      .setDescription(
        'Welcome to the vouch system!\n\n' +
        'Click the button below to leave a vouch for someone.\n' +
        'You will be redirected to the vouch channel to submit your review.'
      )
      .setImage(bannerUrl)
      .setFooter({ text: 'SpiderWare Services' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`vouch_panel_${vouchChannel.id}`)
        .setLabel('Vouch')
        .setStyle(ButtonStyle.Success)
        .setEmoji('⭐')
    );

    await panelChannel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: `Vouch panel sent to <#${panelChannel.id}>. Vouch channel set to <#${vouchChannel.id}>.`, ephemeral: true });
  }
};