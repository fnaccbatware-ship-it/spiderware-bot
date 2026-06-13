const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'spiderware.db'));

db.pragma('journal_mode = WAL');

// Guild settings
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    guild_id TEXT PRIMARY KEY,
    ticket_channel_id TEXT,
    vouch_channel_id TEXT,
    staff_role_id TEXT
  )
`);

// Tickets
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ticket_type TEXT NOT NULL,
    claimed_by TEXT,
    status TEXT DEFAULT 'open',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    transcript TEXT
  )
`);

// Vouches
db.exec(`
  CREATE TABLE IF NOT EXISTS vouches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    vouched_user_id TEXT NOT NULL,
    vouched_by_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    review TEXT NOT NULL,
    vouch_number INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  )
`);

// Vouch counter per guild
db.exec(`
  CREATE TABLE IF NOT EXISTS vouch_counters (
    guild_id TEXT PRIMARY KEY,
    counter INTEGER DEFAULT 0
  )
`);

// Prepared statements
const stmts = {
  // Settings
  getSettings: db.prepare('SELECT * FROM settings WHERE guild_id = ?'),
  setTicketChannel: db.prepare('INSERT INTO settings (guild_id, ticket_channel_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET ticket_channel_id = excluded.ticket_channel_id'),
  setVouchChannel: db.prepare('INSERT INTO settings (guild_id, vouch_channel_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET vouch_channel_id = excluded.vouch_channel_id'),
  setStaffRole: db.prepare('INSERT INTO settings (guild_id, staff_role_id) VALUES (?, ?) ON CONFLICT(guild_id) DO UPDATE SET staff_role_id = excluded.staff_role_id'),

  // Tickets
  createTicket: db.prepare('INSERT INTO tickets (guild_id, channel_id, user_id, ticket_type) VALUES (?, ?, ?, ?)'),
  getTicketByChannel: db.prepare('SELECT * FROM tickets WHERE channel_id = ?'),
  getOpenTicketsByUser: db.prepare('SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = \'open\''),
  claimTicket: db.prepare('UPDATE tickets SET claimed_by = ? WHERE channel_id = ?'),
  renameTicket: db.prepare('UPDATE tickets SET ticket_type = ? WHERE channel_id = ?'),
  closeTicket: db.prepare('UPDATE tickets SET status = \'closed\', transcript = ? WHERE channel_id = ?'),
  deleteTicket: db.prepare('DELETE FROM tickets WHERE channel_id = ?'),

  // Vouches
  createVouch: db.prepare('INSERT INTO vouches (guild_id, vouched_user_id, vouched_by_id, rating, review, vouch_number) VALUES (?, ?, ?, ?, ?, ?)'),
  getVouchesByUser: db.prepare('SELECT * FROM vouches WHERE guild_id = ? AND vouched_user_id = ? ORDER BY created_at DESC'),
  getVouchCount: db.prepare('SELECT COUNT(*) as count FROM vouches WHERE guild_id = ? AND vouched_user_id = ?'),
  getAverageRating: db.prepare('SELECT AVG(rating) as avg FROM vouches WHERE guild_id = ? AND vouched_user_id = ?'),
  getVouchCounter: db.prepare('SELECT counter FROM vouch_counters WHERE guild_id = ?'),
  incrementVouchCounter: db.prepare('INSERT INTO vouch_counters (guild_id, counter) VALUES (?, 1) ON CONFLICT(guild_id) DO UPDATE SET counter = counter + 1')
};

module.exports = {
  db,
  stmts
};
