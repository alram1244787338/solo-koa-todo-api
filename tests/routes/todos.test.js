const request = require('supertest');
const app = require('../../app');
const db = require('../../src/db');

async function registerAndLogin(username, password) {
  await request(app.callback())
    .post('/api/register')
    .send({ username, password });
  const res = await request(app.callback())
    .post('/api/login')
    .send({ username, password });
  return res.body.token;
}

describe('routes/todos.js', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM todos').run();
    db.prepare('DELETE FROM users').run();
  });

  describe('鉴权测试', () => {
    test('无 token 访问 POST /api/todos 返回 401', async () => {
      const res = await request(app.callback())
        .post('/api/todos')
        .send({ title: 'test' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    test('无 token 访问 GET /api/todos 返回 401', async () => {
      const res = await request(app.callback()).get('/api/todos');
      expect(res.status).toBe(401);
    });

    test('无 token 访问 PUT /api/todos/:id 返回 401', async () => {
      const res = await request(app.callback())
        .put('/api/todos/999')
        .send({ title: 'x' });
      expect(res.status).toBe(401);
    });

    test('无 token 访问 DELETE /api/todos/:id 返回 401', async () => {
      const res = await request(app.callback()).delete('/api/todos/999');
      expect(res.status).toBe(401);
    });
  });

  describe('CRUD 完整链路', () => {
    let token;
    beforeEach(async () => {
      token = await registerAndLogin('cruduser', 'password123');
    });

    test('POST 创建 todo 成功返回 201 + 待办对象', async () => {
      const res = await request(app.callback())
        .post('/api/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '学习测试', content: '写 Jest 测试用例' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('学习测试');
      expect(res.body.content).toBe('写 Jest 测试用例');
      expect(res.body.completed).toBe(false);
    });

    test('POST 创建 todo title 缺失返回 400', async () => {
      const res = await request(app.callback())
        .post('/api/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'no title' });
      expect(res.status).toBe(400);
    });

    test('GET 列表按用户过滤，空数据返回空数组', async () => {
      const res = await request(app.callback())
        .get('/api/todos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    test('GET 列表返回自己创建的待办', async () => {
      const createRes1 = await request(app.callback())
        .post('/api/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'todo1' });
      const createRes2 = await request(app.callback())
        .post('/api/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'todo2' });

      const res = await request(app.callback())
        .get('/api/todos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      const titles = res.body.map(t => t.title).sort();
      expect(titles).toEqual(['todo1', 'todo2']);
    });

    test('PUT 更新 todo 成功', async () => {
      const createRes = await request(app.callback())
        .post('/api/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '旧标题', content: '旧内容', completed: false });
      const todoId = createRes.body.id;

      const res = await request(app.callback())
        .put(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '新标题', completed: true });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('新标题');
      expect(res.body.content).toBe('旧内容');
      expect(res.body.completed).toBe(true);
    });

    test('PUT 更新不存在的 todo 返回 404', async () => {
      const res = await request(app.callback())
        .put('/api/todos/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'x' });
      expect(res.status).toBe(404);
    });

    test('DELETE 删除 todo 成功返回 204', async () => {
      const createRes = await request(app.callback())
        .post('/api/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '待删除' });
      const todoId = createRes.body.id;

      const delRes = await request(app.callback())
        .delete(`/api/todos/${todoId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(204);

      const listRes = await request(app.callback())
        .get('/api/todos')
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.body.length).toBe(0);
    });

    test('DELETE 删除不存在的 todo 返回 404', async () => {
      const res = await request(app.callback())
        .delete('/api/todos/99999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('跨用户隔离', () => {
    let tokenA, tokenB;
    let todoOfA;

    beforeEach(async () => {
      tokenA = await registerAndLogin('userA', 'passA');
      tokenB = await registerAndLogin('userB', 'passB');

      const createRes = await request(app.callback())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'A的私人待办', content: '仅A可见' });
      todoOfA = createRes.body.id;
    });

    test('用户B看不到用户A的待办', async () => {
      await request(app.callback())
        .post('/api/todos')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'B的待办' });

      const listA = await request(app.callback())
        .get('/api/todos')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(listA.body.length).toBe(1);
      expect(listA.body[0].title).toBe('A的私人待办');

      const listB = await request(app.callback())
        .get('/api/todos')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(listB.body.length).toBe(1);
      expect(listB.body[0].title).toBe('B的待办');
    });

    test('用户B尝试更新用户A的 todo 返回 403', async () => {
      const res = await request(app.callback())
        .put(`/api/todos/${todoOfA}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: '篡改' });
      expect(res.status).toBe(403);
    });

    test('用户B尝试删除用户A的 todo 返回 403', async () => {
      const res = await request(app.callback())
        .delete(`/api/todos/${todoOfA}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
    });

    test('用户A仍能操作自己的 todo', async () => {
      const res = await request(app.callback())
        .put(`/api/todos/${todoOfA}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'A更新自己的待办', completed: true });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('A更新自己的待办');
      expect(res.body.completed).toBe(true);
    });
  });
});
