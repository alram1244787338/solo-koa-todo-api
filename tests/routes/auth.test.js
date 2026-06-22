const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const db = require('../../src/db');

describe('routes/auth.js', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM todos').run();
    db.prepare('DELETE FROM users').run();
  });

  describe('POST /api/register', () => {
    test('注册成功返回 201 + { id, username }', async () => {
      const res = await request(app.callback())
        .post('/api/register')
        .send({ username: 'testuser', password: 'secret123' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(typeof res.body.id).toBe('number');
      expect(res.body.username).toBe('testuser');
    });

    test('密码用 bcrypt 加密存储', async () => {
      await request(app.callback())
        .post('/api/register')
        .send({ username: 'hashuser', password: 'mypassword' });

      const row = db.prepare('SELECT password FROM users WHERE username = ?').get('hashuser');
      expect(row).toBeDefined();
      expect(bcrypt.compareSync('mypassword', row.password)).toBe(true);
    });

    test('用户名缺失返回 400', async () => {
      const res = await request(app.callback())
        .post('/api/register')
        .send({ password: 'secret123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('密码缺失返回 400', async () => {
      const res = await request(app.callback())
        .post('/api/register')
        .send({ username: 'noname' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('重复用户名返回 400', async () => {
      await request(app.callback())
        .post('/api/register')
        .send({ username: 'dup', password: 'pass1' });

      const res = await request(app.callback())
        .post('/api/register')
        .send({ username: 'dup', password: 'pass2' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('用户名已存在');
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      await request(app.callback())
        .post('/api/register')
        .send({ username: 'loginuser', password: 'rightpass' });
    });

    test('登录成功返回 { token, user }', async () => {
      const res = await request(app.callback())
        .post('/api/login')
        .send({ username: 'loginuser', password: 'rightpass' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.length).toBeGreaterThan(0);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('loginuser');
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
    });

    test('用户不存在返回 401 "用户不存在"', async () => {
      const res = await request(app.callback())
        .post('/api/login')
        .send({ username: 'nouser', password: 'anypass' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('用户不存在');
    });

    test('密码错误返回 401 "密码错误"', async () => {
      const res = await request(app.callback())
        .post('/api/login')
        .send({ username: 'loginuser', password: 'wrongpass' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('密码错误');
    });

    test('用户名或密码缺失返回 400', async () => {
      const res = await request(app.callback())
        .post('/api/login')
        .send({ username: 'loginuser' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
