require('dotenv').config();
const { Client, GatewayIntentBits, Partials, REST, Routes, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
const giveaways = new Map();
module.exports = { giveaways };

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = [];

function scanCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      scanCommands(fullPath);
    } else if (file.name.endsWith('.js')) {
      commandFiles.push(fullPath);
    }
  }
}

scanCommands(commandsPath);

const slashCommands = [];
for (const filePath of commandFiles) {
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    slashCommands.push(command.data.toJSON());
  }
}

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);
    await rest.put(
      route,
      { body: slashCommands }
    );
    console.log('Slash commands registered successfully.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();

client.once('ready', () => {
  console.log(`SpiderWare Bot is online as ${client.user.tag}`);
  client.user.setActivity('SpiderWare Services', { type: 3 }); // Watching
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const reply = { content: 'There was an error executing this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  }

  // Handle select menus, buttons, modals via a centralized handler in events
  const eventHandler = require('./events/interactionCreate');
  await eventHandler(interaction, giveaways);
});

client.login(process.env.DISCORD_TOKEN);
