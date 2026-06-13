const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dadjoke')
    .setDescription('Get a random dad joke'),

  async execute(interaction) {
    try {
      const res = await fetch('https://icanhazdadjoke.com/', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'SpiderWareBot' }
      });
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setColor(0x8B0000)
        .setTitle('🕷️ SpiderWare Dad Joke')
        .setDescription(data.joke)
        .setFooter({ text: 'SpiderWare Bot' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch {
      return interaction.reply({ content: 'Could not fetch a dad joke right now. Try again later!', ephemeral: true });
    }
  }
};
