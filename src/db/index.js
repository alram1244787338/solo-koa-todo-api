const Database = require('better-sqlite3');
const path = require('path');

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

function createDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  return db;
}

let instance;

if (process.env.DB_PATH) {
  instance = createDb(process.env.DB_PATH);
} else if (process.env.NODE_ENV === 'test') {
  instance = createDb(':memory:');
} else {
  const defaultPath = path.join(__dirname, '..', '..', 'data.db');
  instance = createDb(defaultPath);
}

module.exports = instance;
module.exports.createDb = createDb;
module.exports.SCHEMA_SQL = SCHEMA_SQL;
