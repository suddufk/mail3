# Cloud Mail API 调用手册 (v1.0)

本文档用于指导第三方脚本或自动化工具直接调用 `Cloud Mail` 后端接口。

## 1. 基础配置
- **API 根路径**: `https://your-domain.com/api`
- **认证 Header**: `Authorization`
- **Content-Type**: `application/json`

---

## 2. 身份认证 (Auth)

### 2.1 用户登录
用于获取后续请求所需的 JWT Token。

- **方法**: `POST`
- **路径**: `/login`
- **请求体 (JSON)**:
  ```json
  {
    "email": "admin@example.com",
    "password": "your_password"
  }
  ```
- **成功响应**:
  ```json
  {
    "code": 200,
    "data": { "token": "eyJhbGciOiJIUzI1..." },
    "msg": "success"
  }
  ```
- **脚本用法**: 获取 `data.token` 并存入变量，后续请求带在 `Authorization` Header 中。

### 2.2 用户注册
- **方法**: `POST`
- **路径**: `/register`
- **请求体**: `{ "email": "user@example.com", "password": "password", "regKey": "optional_key" }`

---

## 3. 邮箱账号管理 (Account)
管理你名下的临时邮箱地址。

### 3.1 获取账号列表
- **方法**: `GET`
- **路径**: `/account/list`
- **Header**: `Authorization: YOUR_TOKEN`
- **响应**: 返回当前用户拥有的所有临时邮箱（如 `test@your-domain.com`）。

### 3.2 创建新邮箱 (Prefix)
- **方法**: `POST`
- **路径**: `/account/add`
- **请求体**: `{ "account": "new_prefix" }` (只需填前缀)

### 3.3 删除邮箱
- **方法**: `DELETE`
- **路径**: `/account/delete`
- **查询参数**: `?id=ACCOUNT_ID`

---

## 4. 邮件操作 (Email)

### 4.1 邮件列表 (收件箱)
- **方法**: `GET`
- **路径**: `/email/list`
- **查询参数**:
  - `page`: 页码 (默认1)
  - `size`: 每页数量 (默认20)
  - `accountId`: 可选，指定查看某个邮箱账号的邮件
- **Header**: `Authorization: YOUR_TOKEN`

### 4.2 发送邮件
- **方法**: `POST`
- **路径**: `/email/send`
- **请求体**:
  ```json
  {
    "from": "sender@your-domain.com",
    "to": "target@external.com",
    "subject": "Email Subject",
    "content": "<h1>HTML Content</h1>",
    "attIds": [] 
  }
  ```

### 4.3 彻底删除邮件
- **方法**: `DELETE`
- **路径**: `/email/delete`
- **参数**: `?id=EMAIL_ID`

---

## 5. 公共接口 (Public API) - 适合 GitHub Actions/自动化
这类接口使用 **Public Token**，无需频繁登录，适合长期脚本。

### 5.1 生成/获取 Public Token (手动一次性操作)
由于 UI 界面目前未提供配置入口，需手动调用 API 生成：

- **方法**: `POST`
- **路径**: `/public/genToken`
- **参数 (JSON)**:
  ```json
  {
    "email": "admin@example.com",
    "password": "your_password"
  }
  ```
- **获取方式 (浏览器控制台 F12)**:
  ```javascript
  fetch('/api/public/genToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password' })
  }).then(res => res.json()).then(console.log);
  ```
- **注意**: 生成后的 Token (UUID 格式) 会持久化在 KV 中，后续请求带在 `Authorization` Header 中即可。

### 5.2 使用 Public Token 获取指定邮箱邮件列表
- **方法**: `POST`
- **路径**: `/public/emailList`
- **请求体**: `{ "account": "target@your-domain.com" }`
- **Header**: `Authorization: YOUR_PUBLIC_TOKEN`

---

## 6. 非管理员账户登录说明
本系统支持多用户体系，非管理员账户的调用流程与管理员完全一致：

1.  **登录**: 调用 `POST /api/login`，传入非管理员的账号和密码。
2.  **权限限制**: 非管理员无法访问 `/api/user/**` 或 `/api/allEmail/**` 等管理类接口，但可以正常管理自己名下的临时邮箱地址和接收邮件。
3.  **注册**: 如果系统开启了注册功能，可以通过 `POST /api/register` 创建非管理员账户。

| 功能 | 方法 | 路径 | 参数 |
| :--- | :--- | :--- | :--- |
| 获取所有用户 | `GET` | `/user/list` | `?page=1&size=20` |
| 设置用户密码 | `PUT` | `/user/setPwd` | `{ "userId": "xx", "password": "xx" }` |
| 重置发送计数 | `PUT` | `/user/resetSendCount` | `{ "userId": "xx" }` |
| 查看全站邮件 | `GET` | `/allEmail/list` | `?page=1` |

---

## 7. 脚本调用示例 (JavaScript)

```javascript
const API_BASE = "https://your-domain.com/api";
const TOKEN = "YOUR_JWT_OR_PUBLIC_TOKEN";

// 示例：获取收件箱第一封邮件的内容
async function getLatestEmail() {
    const response = await fetch(`${API_BASE}/email/list?page=1&size=1`, {
        headers: { "Authorization": TOKEN }
    });
    const result = await response.json();
    if (result.code === 200 && result.data.list.length > 0) {
        console.log("Subject:", result.data.list[0].subject);
        console.log("Content:", result.data.list[0].content);
    }
}
```

---

## 8. 性能优化与额度建议 (针对 Cloudflare 免费版)

为了防止触发 Cloudflare 的日限额（尤其是 KV 写入 1000 次/天的限制），请遵循以下脚本编写原则：

### 8.1 优先使用 Public Token
- **原因**: 验证 Public Token 只消耗 **KV 读取** (10万次/天)，而登录/刷新 JWT 可能会消耗 **KV 写入** (1000次/天)。
- **场景**: 自动化接码、查询邮件、批量监控。

### 8.2 Token 复用策略 (关键)
**不要在脚本的每次循环中都调用 `/login`！**
- **逻辑**: 脚本启动时尝试读取本地缓存的 Token，只有当 API 返回 `401 Unauthorized` 时，才重新执行登录流程并更新缓存。
- **有效期**: 本系统 JWT Token 默认有效期为 **30 天**，足以长期复用。

### 8.3 额度风险避坑
- **D1 数据库**: 批量创建账号、收发邮件、删除邮件主要消耗 D1 写入额度 (**9.5万次/天**)，额度充足，适合大规模作业。
- **KV 写入**: 频繁登录、修改系统设置、上传背景图会消耗此额度。若额度耗尽，会导致无法登录。

### 8.4 批量接码伪代码逻辑
```python
# 推荐的自动化逻辑
token = load_from_disk()
try:
    emails = fetch_emails(token)
except Unauthorized:
    token = login_and_save_to_disk()
    emails = fetch_emails(token)
```
