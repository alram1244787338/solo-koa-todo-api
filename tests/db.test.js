const fs = require('fs');
const os = require('os');
const path = require('path');
const { createDb } = require('../src/db');

function tmpDbPath() {
  return path.join(os.tmpdir(), `test-db-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
}

describe('db/index.js', () => {
  describe(':memory: 模式 - 建表', () => {
    let db;
    beforeEach(() => {
      db = createDb(':memory:');
    });
    afterEach(() => {
      db.close();
    });

    test('users 表存在', () => {
      const rows = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).all();
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('users');
    });

    test('todos 表存在', () => {
      const rows = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='todos'"
      ).all();
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('todos');
    });

    test('users 表字段正确', () => {
      const cols = db.prepare('PRAGMA table_info(users)').all();
      const names = cols.map(c => c.name);
      expect(names).toContain('id');
      expect(names).toContain('username');
      expect(names).toContain('password');
      expect(names).toContain('created_at');
    });

    test('todos 表字段正确且有 user_id 外键', () => {
      const cols = db.prepare('PRAGMA table_info(todos)').all();
      const names = cols.map(c => c.name);
      expect(names).toContain('id');
      expect(names).toContain('user_id');
      expect(names).toContain('title');
      expect(names).toContain('content');
      expect(names).toContain('completed');
      expect(names).toContain('created_at');
      expect(names).toContain('updated_at');
    });
  });

  describe('文件模式 - journal_mode=WAL', () => {
    let db, dbPath;

    beforeEach(() => {
      dbPath = tmpDbPath();
      db = createDb(dbPath);
    });

    afterEach(() => {
      db.close();
      try {
        fs.unlinkSync(dbPath);
        fs.unlinkSync(dbPath + '-wal');
        fs.unlinkSync(dbPath + '-shm');
      } catch (e) {}
    });

    test('db.pragma(\'journal_mode=WAL\') 设置正确', () => {
      const row = db.pragma('journal_mode', { simple: true });
      expect(row).toBe('wal');
    });
  });
});
