const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const errorHandler = require('./src/middleware/error');
const authRoutes = require('./src/routes/auth');
const todoRoutes = require('./src/routes/todos');

require('./src/db');

const app = new Koa();
const router = new Router();

errorHandler(app);
app.use(bodyParser());

router.get('/', async (ctx) => {
  ctx.body = { message: 'ok' };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

app.use(todoRoutes.routes());
app.use(todoRoutes.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
