const Router = require('koa-router');
const db = require('../db');
const auth = require('../middleware/auth');

const router = new Router({ prefix: '/api/todos' });

router.use(auth);

router.post('/', async (ctx) => {
  const { title, content, completed } = ctx.request.body;
  if (!title) {
    ctx.throw(400, 'Title is required');
  }

  const userId = ctx.state.userId;
  const result = db.prepare(
    'INSERT INTO todos (user_id, title, content, completed) VALUES (?, ?, ?, ?)'
  ).run(userId, title, content || null, completed ? 1 : 0);

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);
  todo.completed = !!todo.completed;

  ctx.status = 201;
  ctx.body = todo;
});

router.get('/', async (ctx) => {
  const userId = ctx.state.userId;
  const todos = db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  ctx.body = todos.map(todo => ({ ...todo, completed: !!todo.completed }));
});

router.put('/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const userId = ctx.state.userId;
  const { title, content, completed } = ctx.request.body;

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!todo) {
    ctx.throw(404, 'Todo not found');
  }

  if (Number(todo.user_id) !== Number(userId)) {
    ctx.throw(403, 'Forbidden');
  }

  db.prepare(`
    UPDATE todos
    SET title = COALESCE(?, title),
        content = COALESCE(?, content),
        completed = COALESCE(?, completed),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title !== undefined ? title : null,
    content !== undefined ? content : null,
    completed !== undefined ? (completed ? 1 : 0) : null,
    id
  );

  const updated = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  updated.completed = !!updated.completed;
  ctx.body = updated;
});

router.delete('/:id', async (ctx) => {
  const id = parseInt(ctx.params.id, 10);
  const userId = ctx.state.userId;

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);
  if (!todo) {
    ctx.throw(404, 'Todo not found');
  }

  if (Number(todo.user_id) !== Number(userId)) {
    ctx.throw(403, 'Forbidden');
  }

  db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  ctx.status = 204;
});

module.exports = router;
