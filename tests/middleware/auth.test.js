const Koa = require('koa');
const Router = require('koa-router');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const auth = require('../../src/middleware/auth');
const errorHandler = require('../../src/middleware/error');

describe('middleware/auth.js', () => {
  let app;

  beforeEach(() => {
    app = new Koa();
    errorHandler(app);
    const router = new Router();
    router.get('/protected', auth, async (ctx) => {
      ctx.body = { userId: ctx.state.userId, ok: true };
    });
    app.use(router.routes());
    app.use(router.allowedMethods());
  });

  test('缺少 Authorization header 返回 401', async () => {
    const res = await request(app.callback()).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  test('Authorization 格式错误（非 Bearer）返回 401', async () => {
    const res = await request(app.callback())
      .get('/protected')
      .set('Authorization', 'Basic abcdef');
    expect(res.status).toBe(401);
  });

  test('空 token 返回 401', async () => {
    const res = await request(app.callback())
      .get('/protected')
      .set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });

  test('无效 token 返回 401', async () => {
    const res = await request(app.callback())
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  test('过期 token 返回 401', async () => {
    const expiredToken = jwt.sign(
      { userId: 1 },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '-1h' }
    );
    const res = await request(app.callback())
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  test('有效 token 解析出 userId 挂到 ctx.state', async () => {
    const token = jwt.sign(
      { userId: 42 },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    const res = await request(app.callback())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.userId).toBe(42);
  });
});
