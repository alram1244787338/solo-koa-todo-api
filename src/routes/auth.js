const Router = require('koa-router');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = new Router({ prefix: '/api' });
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

router.post('/register', async (ctx) => {
  const { username, password } = ctx.request.body;
  if (!username || !password) {
    ctx.throw(400, 'Username and password are required');
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    ctx.throw(400, 'Username already exists');
  }

  const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);

  ctx.status = 201;
  ctx.body = { id: result.lastInsertRowid, username };
});

router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body;
  if (!username || !password) {
    ctx.throw(400, 'Username and password are required');
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    ctx.throw(401, 'Invalid username or password');
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  ctx.body = { token, user: { id: user.id, username: user.username } };
});

module.exports = router;
