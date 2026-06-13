# 🕷️ SpiderWare Discord Bot

A premium Discord bot built for **SpiderWare** featuring a professional **Ticket System**, **Vouch/Review System**, and full **SQLite** persistence.

## Features

- 🎫 **Ticket System** — Dropdown ticket creation with private channels, claim/close/rename buttons, and transcript logging.
- ⭐ **Vouch System** — Modal-based reviews with star ratings, auto-incrementing vouch IDs, stats lookup, and professional embeds.
- 🎨 **SpiderWare Branding** — Red/black embeds, spider emojis, and custom banner support.
- 🛠️ **Admin Commands** — Configure ticket channel, vouch channel, and staff role.

## Tech Stack

- **Node.js**
- **discord.js v14**
- **better-sqlite3**
- **dotenv**

## Setup Guide

### 1. Install Node.js
Download and install the LTS version from [nodejs.org](https://nodejs.org/).

### 2. Create a Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it `SpiderWare`
3. Go to **Bot** → click **Reset Token** → copy the token
4. Enable these **Privileged Gateway Intents**:
   - `MESSAGE CONTENT INTENT`
   - `SERVER MEMBERS INTENT`
5. Go to **OAuth2** → **URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (or at least: Manage Channels, Send Messages, Manage Messages, Embed Links, Attach Files, Read Message History, Use Application Commands)
6. Copy the generated URL and invite the bot to your server.

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
DISCORD_TOKEN=YOUR_BOT_TOKEN_HERE
CLIENT_ID=YOUR_APPLICATION_CLIENT_ID_HERE
BANNER_URL=https://your-direct-image-link.com/banner.png
```

> **Note:** The banner URL must be a **direct image link** (ends in `.png`, `.jpg`, `.gif`, etc.). Discord embeds will not display URLs that require authentication or redirects. If the provided ChatGPT URL does not work, upload your banner to **Imgur** or **Discord** and use that direct link.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Bot

Development (auto-restart on file change):
```bash
npm run dev
```

Production:
```bash
npm start
```

## Usage

### Setup (Admin)
Run these commands first (requires `Manage Server` permission):

```
/setstaffrole @Staff
/setticketchannel #tickets
/setvouchchannel #vouches
```

Then post the ticket panel:
```
/ticketpanel
```

### Ticket System
- Users select a ticket type from the dropdown.
- A private channel is created.
- Staff are pinged automatically.
- Buttons available: **Claim**, **Close**, **Rename**.
- Closing generates a transcript saved to the `transcripts/` folder.

### Vouch System
```
/vouch @user
```
- A modal asks for a **1-5 star rating** and a **review**.
- The vouch is posted as a professional embed in the configured vouch channel.
- The avatar of the person leaving the vouch appears in the top-right thumbnail.

```
/vouches @user
```
- Shows total vouches, average rating, and recent reviews.

## Free 24/7 Hosting — Railway (Recommended)

Railway hosts Node.js apps for free with a simple drag-and-drop or GitHub deploy.

### Option A: ZIP Upload (Easiest)
1. Go to [railway.app](https://railway.app/) and sign up.
2. Click **New Project** → **Upload**.
3. ZIP your bot folder (make sure `node_modules` is NOT included — `.gitignore` handles this).
4. Upload the ZIP.
5. Railway will auto-detect Node.js.
6. Go to **Variables** → add these:
   - `DISCORD_TOKEN` = your bot token
   - `CLIENT_ID` = your application client ID
   - `BANNER_URL` = your banner image link
7. Click **Deploy**.
8. The bot will go online 24/7.

### Option B: GitHub
1. Create a new GitHub repo and upload all files (except `node_modules`, `.env`, `*.db` — `.gitignore` is already set).
2. In Railway, click **New Project** → **Deploy from GitHub repo**.
3. Select your repo.
4. Add the same environment variables as above in the **Variables** tab.
5. Click **Deploy**.

### Important Railway Notes
- **SQLite data persists** on Railway's disk between deploys unless you delete the service.
- **Transcripts** are saved to disk and will persist.
- If you redeploy from scratch, the database file is reset. For permanent data across full rebuilds, back up `spiderware.db` or switch to Railway's PostgreSQL later.

## Alternative Hosting Options

1. **Render.com** — Create a Web Service, set start command to `npm start`, add env vars.
2. **Replit** — Import the project, add secrets, and enable "Always On" (paid) or use UptimeRobot.
3. **Fly.io** — Good free tier for small bots.

## File Structure

```
spiderware-bot/
├── commands/
│   ├── ticket/
│   │   └── panel.js
│   ├── vouch/
│   │   ├── vouch.js
│   │   └── vouches.js
│   └── settings/
│       ├── setvouchchannel.js
│       ├── setticketchannel.js
│       └── setstaffrole.js
├── events/
│   └── interactionCreate.js
├── database.js
├── index.js
├── package.json
├── .env.example
├── spiderware.db (created automatically)
├── transcripts/ (created automatically)
└── README.md
```

## License

MIT — SpiderWare
