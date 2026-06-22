# Todo API

Koa + JWT 认证 + SQLite 的任务管理 RESTful API

## 技术栈

- **框架**: Koa 2
- **数据库**: better-sqlite3（SQLite）
- **密码加密**: bcryptjs
- **身份认证**: jsonwebtoken（JWT）
- **测试**: Jest + supertest

## 目录结构

```
.
├── app.js                    # 应用入口
├── package.json
├── data.db                   # SQLite 数据文件（运行时生成）
├── src/
│   ├── db/
│   │   └── index.js          # SQLite 初始化 + 建表
│   ├── middleware/
│   │   ├── error.js          # 全局错误处理（app.on('error')）
│   │   └── auth.js           # JWT 认证中间件
│   └── routes/
│       ├── auth.js           # 注册 / 登录路由
│       └── todos.js          # 待办 CRUD 路由
└── tests/
    ├── db.test.js            # 数据库初始化测试
    ├── middleware/
    │   └── auth.test.js      # JWT 中间件测试
    └── routes/
        ├── auth.test.js      # 注册 / 登录路由测试
        └── todos.test.js     # 待办 CRUD + 鉴权 + 隔离测试
```

## 安装与运行

```bash
# 安装依赖
npm install

# 启动服务（默认监听 3000 端口）
npm start
```

启动后访问 `http://localhost:3000`，返回 `{ "message": "ok" }` 表示服务正常。

## API 文档

所有接口响应统一采用 JSON 格式。错误响应格式为：

```json
{ "error": "错误描述" }
```

### 1. 健康检查

```
GET /
```

响应示例：

```json
{ "message": "ok" }
```

---

### 2. 用户注册

```
POST /api/register
Content-Type: application/json
```

请求体：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名，唯一 |
| password | string | 是 | 密码 |

请求示例：

```json
{ "username": "alice", "password": "mysecret" }
```

成功响应（201）：

```json
{ "id": 1, "username": "alice" }
```

失败响应（400）：

- `{ "error": "用户名和密码不能为空" }`
- `{ "error": "用户名已存在" }`

---

### 3. 用户登录

```
POST /api/login
Content-Type: application/json
```

请求体：

| 字段 | 类型 | 必填 |
|------|------|------|
| username | string | 是 |
| password | string | 是 |

请求示例：

```json
{ "username": "alice", "password": "mysecret" }
```

成功响应（200）：

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "username": "alice" }
}
```

失败响应：

- 401 `{ "error": "用户不存在" }`
- 401 `{ "error": "密码错误" }`
- 400 `{ "error": "用户名和密码不能为空" }`

---

### 4. 待办事项（以下所有接口需要鉴权）

在请求头中携带 JWT：

```
Authorization: Bearer <token>
```

未携带或 token 无效 / 过期时返回 401 `{ "error": "Unauthorized" }`。

---

#### 4.1 创建待办

```
POST /api/todos
Content-Type: application/json
Authorization: Bearer <token>
```

请求体：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 标题 |
| content | string | 否 | 内容 |
| completed | boolean | 否 | 是否完成，默认 false |

请求示例：

```json
{ "title": "学习 Koa", "content": "搭建 RESTful API", "completed": false }
```

成功响应（201）：

```json
{
  "id": 1,
  "user_id": 1,
  "title": "学习 Koa",
  "content": "搭建 RESTful API",
  "completed": false,
  "created_at": "2026-06-22 00:00:00",
  "updated_at": "2026-06-22 00:00:00"
}
```

---

#### 4.2 获取待办列表（按当前用户过滤）

```
GET /api/todos
Authorization: Bearer <token>
```

成功响应（200）：

```json
[
  {
    "id": 1,
    "user_id": 1,
    "title": "学习 Koa",
    "content": "搭建 RESTful API",
    "completed": false,
    "created_at": "2026-06-22 00:00:00",
    "updated_at": "2026-06-22 00:00:00"
  }
]
```

---

#### 4.3 更新待办

```
PUT /api/todos/:id
Content-Type: application/json
Authorization: Bearer <token>
```

路径参数：`id` — 待办 ID

请求体（所有字段可选，只传要更新的字段即可）：

| 字段 | 类型 |
|------|------|
| title | string |
| content | string |
| completed | boolean |

请求示例：

```json
{ "title": "完成 Koa API", "completed": true }
```

成功响应（200）：返回更新后的完整待办对象

失败响应：

- 404 `{ "error": "Todo not found" }`
- 403 `{ "error": "Forbidden" }`（尝试操作他人待办）

---

#### 4.4 删除待办

```
DELETE /api/todos/:id
Authorization: Bearer <token>
```

成功响应（204，无响应体）

失败响应：

- 404 `{ "error": "Todo not found" }`
- 403 `{ "error": "Forbidden" }`（尝试操作他人待办）

## 测试

使用 Jest + supertest，数据库以 `:memory:` 模式隔离运行，每个测试用例独立。

```bash
npm test
```

共 **36 个测试用例**，覆盖：

| 模块 | 用例数 | 覆盖点 |
|------|--------|--------|
| db | 6 | users/todos 表存在、字段完整、WAL 模式设置 |
| middleware/auth | 6 | 缺 header / 格式错误 / 空 token / 无效 / 过期 / 有效 token 解析 userId |
| routes/auth | 10 | 注册成功、bcrypt 加密、参数缺失、重复注册；登录成功、用户不存在、密码错误、参数缺失 |
| routes/todos | 14 | 4 个接口鉴权 401；CRUD 成功链路 + 404；跨用户列表隔离、越权更新 / 删除 403 |

运行结果：

```
Test Suites: 4 passed, 4 total
Tests:       36 passed, 36 total
```
