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
    ctx.throw(400, '用户名和密码不能为空');
  }

  const row = db.prepare('SELECT COUNT(*) AS count FROM users WHERE username = ?').get(username);
  if (row.count > 0) {
    ctx.throw(400, '用户名已存在');
  }

  const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);

  ctx.status = 201;
  ctx.body = { id: result.lastInsertRowid, username };
});

router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body;
  if (!username || !password) {
    ctx.throw(400, '用户名和密码不能为空');
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    ctx.throw(401, '用户不存在');
  }

  if (!bcrypt.compareSync(password, user.password)) {
    ctx.throw(401, '密码错误');
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  ctx.body = { token, user: { id: user.id, username: user.username } };
});

module.exports = router;
