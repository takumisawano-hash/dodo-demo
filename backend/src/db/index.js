import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/dodo.db');

let db;

export function getDB() {
  if (!db) {
    // Ensure data directory exists
    const dataDir = dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export async function initDB() {
  const db = getDB();
  
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      language TEXT DEFAULT 'ja',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Conversations table (messages)
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_type TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // User data table (agent-specific data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      agent_type TEXT NOT NULL,
      data_key TEXT NOT NULL,
      data_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_user_agent 
    ON conversations(user_id, agent_type);
    
    CREATE INDEX IF NOT EXISTS idx_user_data_user_agent 
    ON user_data(user_id, agent_type);
  `);
  
  return db;
}

// ============= User Operations =============

export function createUser(email, passwordHash, displayName = null) {
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO users (email, password_hash, display_name)
    VALUES (?, ?, ?)
  `).run(email, passwordHash, displayName);
  
  return db.prepare('SELECT id, email, display_name, language, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
}

export function getUserByEmail(email) {
  const db = getDB();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function getUserById(id) {
  const db = getDB();
  return db.prepare('SELECT id, email, display_name, language, created_at FROM users WHERE id = ?').get(id);
}

export function updateUser(id, updates) {
  const db = getDB();
  const { displayName, language } = updates;
  db.prepare(`
    UPDATE users 
    SET display_name = COALESCE(?, display_name),
        language = COALESCE(?, language),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(displayName, language, id);
  
  return getUserById(id);
}

// ============= Conversation Operations =============

export function addMessage(userId, agentType, role, content) {
  const db = getDB();
  const result = db.prepare(`
    INSERT INTO conversations (user_id, agent_type, role, content)
    VALUES (?, ?, ?, ?)
  `).run(userId, agentType, role, content);
  
  return result.lastInsertRowid;
}

export function getRecentMessages(userId, agentType, limit = 20) {
  const db = getDB();
  return db.prepare(`
    SELECT id, role, content, created_at FROM conversations 
    WHERE user_id = ? AND agent_type = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(userId, agentType, limit).reverse();
}

export function getConversationHistory(userId, agentType, offset = 0, limit = 50) {
  const db = getDB();
  const messages = db.prepare(`
    SELECT id, role, content, created_at FROM conversations 
    WHERE user_id = ? AND agent_type = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(userId, agentType, limit, offset);
  
  const countRow = db.prepare(`
    SELECT COUNT(*) as total FROM conversations 
    WHERE user_id = ? AND agent_type = ?
  `).get(userId, agentType);
  
  return {
    messages: messages.reverse(),
    total: countRow.total,
    offset,
    limit
  };
}

export function clearConversation(userId, agentType) {
  const db = getDB();
  db.prepare(`
    DELETE FROM conversations WHERE user_id = ? AND agent_type = ?
  `).run(userId, agentType);
}

// ============= User Data Operations =============

export function setUserData(userId, agentType, key, value) {
  const db = getDB();
  db.prepare(`
    INSERT OR REPLACE INTO user_data (user_id, agent_type, data_key, data_value)
    VALUES (?, ?, ?, ?)
  `).run(userId, agentType, key, JSON.stringify(value));
}

export function getUserData(userId, agentType, key) {
  const db = getDB();
  const row = db.prepare(`
    SELECT data_value FROM user_data
    WHERE user_id = ? AND agent_type = ? AND data_key = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, agentType, key);
  
  return row ? JSON.parse(row.data_value) : null;
}

export function getAllUserData(userId, agentType) {
  const db = getDB();
  const rows = db.prepare(`
    SELECT DISTINCT data_key, data_value FROM user_data
    WHERE user_id = ? AND agent_type = ?
    ORDER BY created_at DESC
  `).all(userId, agentType);
  
  const data = {};
  for (const row of rows) {
    if (!(row.data_key in data)) {
      data[row.data_key] = JSON.parse(row.data_value);
    }
  }
  return data;
}
