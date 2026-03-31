# Cloud Mail API 集成指南 (Full Developer Guide)

本指南旨在帮助开发者通过 API 快速集成 Cloud Mail 的核心功能，实现自动化接码、邮件收发及账号管理。

---

## 🚀 1. 基础配置
- **API 根路径**: `https://your-domain.com/api`
- **认证 Header**: `Authorization`
- **Content-Type**: `application/json`

---

## 🔐 2. 身份认证 (Auth)

| 功能 | 方法 | 路径 | 参数 (Body) | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| **用户登录** | `POST` | `/login` | `{ "email": "xx", "password": "xx" }` | 返回 JWT Token (有效期30天) |
| **用户注册** | `POST` | `/register` | `{ "email": "xx", "password": "xx", "regKey": "可选" }` | 注册新账户 |
| **退出登录** | `DELETE`| `/logout` | 无 | 废弃当前 Token |

> **💡 优化建议**：建议在脚本中持久化缓存 Token，仅在返回 `401 Unauthorized` 时重新登录，以节省 Cloudflare KV 写入额度。

---

## 📧 3. 邮箱账号管理 (Account)

| 功能 | 方法 | 路径 | 参数 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| **获取账号列表** | `GET` | `/account/list` | 无 | 获取当前用户下的所有临时邮箱 |
| **创建新邮箱** | `POST` | `/account/add` | `{ "email": "prefix@domain.com" }` | **⚠️ 必填完整地址**，参数名 `email` |
| **删除邮箱** | `DELETE`| `/account/delete`| `?id=ACCOUNT_ID` | 删除指定的临时邮箱 |
| **修改备注** | `PUT` | `/account/setName`| `{ "id": "xx", "name": "备注名" }` | 设置账号别名 |

---

## 📩 4. 邮件操作 (Email)

### 4.1 获取邮件列表
- **方法**: `GET`
- **路径**: `/email/list`
- **必选参数**:
  - `type`: `0` (收件箱) 或 `1` (已发送)
  - `emailId`: 分页游标，首页传 `0`
- **可选参数**: `page`, `size`, `accountId`
- **⚠️ 避坑**: 缺少 `type` 或 `emailId` 会导致后端数据库查询报错 (500 D1_TYPE_ERROR)。

### 4.2 发送邮件
- **方法**: `POST`
- **路径**: `/email/send`
- **Payload**:
  ```json
  {
    "from": "sender@your-domain.com",
    "receiveEmail": ["target@external.com"], 
    "subject": "Title",
    "content": "<h1>HTML内容</h1>",
    "text": "纯文本内容",
    "attachments": [] 
  }
  ```
- **⚠️ 注意**: 接收方参数名是 **`receiveEmail`** (数组)，必须提供 **`text`** 字段和 **`attachments: []`**。

---

## 🌐 5. 公共接口 (Public API - 适合长期自动化)
这类接口使用 **Public Token**，绕过 JWT 登录逻辑，适合 GitHub Actions。

### 5.1 生成 Public Token (手动一次性操作)
- **方法**: `POST`
- **路径**: `/public/genToken`
- **参数**: `{ "email": "admin@xx.com", "password": "xx" }`
- **说明**: 获取后存入环境变量，用于后续公共接口调用。

### 5.2 使用 Public Token 查询邮件
- **方法**: `POST`
- **路径**: `/public/emailList`
- **参数**: `{ "account": "target@your-domain.com" }`
- **Header**: `Authorization: <YOUR_PUBLIC_TOKEN>`

---

## 👑 6. 管理员功能 (Admin Only)

| 功能 | 方法 | 路径 | 参数 |
| :--- | :--- | :--- | :--- |
| **用户列表** | `GET` | `/user/list` | `?page=1&size=20` |
| **重置发送计数**| `PUT` | `/user/resetSendCount` | `{ "userId": "xx" }` |
| **全站邮件列表**| `GET` | `/allEmail/list` | `?page=1&size=20&type=0&emailId=0` |

---

## 🛠 7. 常见错误处理 (Troubleshooting)

- **500 D1_TYPE_ERROR (Email List)**: 检查是否漏传了 `type` 或 `emailId`。
- **500 Cannot read property 'every' (Email Send)**: 检查 `receiveEmail` 是否为数组。
- **500 D1_TYPE_ERROR (Email Send)**: 后端已知 Bug。保存已发送记录时漏掉了 `messageId`。不影响对方收信，但 API 会返回 500。
- **邮箱不能为空**: 请确保参数名为 `email` 而非 `account`。

---

## 📉 8. 额度限制 (Cloudflare Free Tier)
- **KV 写入 (1000次/天)**: 登录和刷新 Token 会消耗此额度。请务必复用 Token。
- **D1 写入 (9.5万次/天)**: 邮件收发主要消耗此额度，额度充足。
