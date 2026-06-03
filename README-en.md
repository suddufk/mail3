<p align="center">
    <img src="doc/demo/logo.png" width="80px" />
    <h1 align="center">Cloud Mail</h1>
    <p align="center">A simple, responsive email service designed to run on Cloudflare Workers 🎉</p> 
    <p align="center">
       <a href="/README.md" style="margin-left: 5px">简体中文</a> | English 
    </p>
    <p align="center">
        <a href="https://github.com/maillab/cloud-mail/tree/main?tab=MIT-1-ov-file" target="_blank" >
            <img src="https://img.shields.io/badge/license-MIT-green" />
        </a>    
        <a href="https://github.com/maillab/cloud-mail/releases" target="_blank" >
            <img src="https://img.shields.io/github/v/release/maillab/cloud-mail" alt="releases" />
        </a>  
        <a href="https://github.com/maillab/cloud-mail/issues" >
            <img src="https://img.shields.io/github/issues/maillab/cloud-mail" alt="issues" />
        </a>  
        <a href="https://github.com/maillab/cloud-mail/stargazers" target="_blank">
            <img src="https://img.shields.io/github/stars/maillab/cloud-mail" alt="stargazers" />
        </a>  
        <a href="https://github.com/maillab/cloud-mail/forks" target="_blank" >
            <img src="https://img.shields.io/github/forks/maillab/cloud-mail" alt="forks" />
        </a>
    </p>
    <p align="center">
        <a href="https://trendshift.io/repositories/20459" target="_blank" >
            <img src="https://trendshift.io/api/badge/repositories/20459" alt="trendshift" >
        </a>
    </p>
</p>

## Description

This project is forked from [maillab/cloud-mail](https://github.com/maillab/cloud-mail/tree/main). It keeps the Cloudflare Workers, D1, KV, R2, email receiving/sending, permission management, and system settings capabilities, while rebuilding the original Vue frontend as `mail-web`, a modern React + HeroUI + Tailwind CSS + Vite application.

With only one domain, you can create multiple different email addresses, similar to major email platforms. This project can be deployed on Cloudflare Workers to reduce server costs and build your own email service.

## Project Showcase

- [Live Demo](https://skymail.ink)<br>
- [Deployment Guide](https://doc.skymail.ink/en/)<br>


| ![](/doc/demo/demo1.png) | ![](/doc/demo/demo2.png) |
|--------------------------|--------------------------|
| ![](/doc/demo/demo3.png) | ![](/doc/demo/demo4.png) |

## Features

- **💰 Low-Cost Usage**: No server required — deploy to Cloudflare Workers to reduce costs.

- **💻 Responsive Design**: Automatically adapts to both desktop and most mobile browsers.

- **📧 Email Sending**: Integrated with Resend, supporting bulk email sending and attachments.

- **🛡️ Admin Features**: Admin controls for user and email management with RBAC-based access control.

- **📦 Attachment Support**: Send and receive attachments, stored and downloaded via R2 object storage.

- **🔔 Email Push**: Forward received emails to Telegram bots or other email providers.

- **📡 Open API**: Supports batch user creation via API and multi-condition email queries

- **🔢 Verification Code Recognition**: Auto-detect codes via Workers AI

- **📈 Data Visualization**: Use ECharts to visualize system data, including user email growth.

- **🎨 Personalization**: Customize website title, login background, and transparency.

- **🤖 CAPTCHA**: Integrated with Turnstile CAPTCHA to prevent automated registration.

- **📜 More Features**: Under development...

## Tech Stack

- **Platform**: [Cloudflare Workers](https://developers.cloudflare.com/workers/)

- **Web Framework**: [Hono](https://hono.dev/)

- **ORM**: [Drizzle](https://orm.drizzle.team/)

- **Frontend Framework**: [React](https://react.dev/)

- **UI Framework**: [HeroUI](https://www.heroui.com/)

- **Email Service**: [Resend](https://resend.com/)

- **Cache**: [Cloudflare KV](https://developers.cloudflare.com/kv/)

- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/)

- **File Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/)

## Project Structure

```
cloud-mail
├── mail-worker				    # Backend worker project
│   ├── src                  
│   │   ├── api	 			    # API layer
│   │   ├── const  			    # Project constants
│   │   ├── dao                 # Data access layer
│   │   ├── email			    # Email processing and handling
│   │   ├── entity			    # Database entities
│   │   ├── error			    # Custom exceptions
│   │   ├── hono			    # Web framework, middleware, error handling
│   │   ├── i18n			    # Internationalization
│   │   ├── init			    # Database and cache initialization
│   │   ├── model			    # Response data models
│   │   ├── security			# Authentication and authorization
│   │   ├── service			    # Business logic layer
│   │   ├── template			# Message templates
│   │   ├── utils			    # Utility functions
│   │   └── index.js			# Entry point
│   ├── package.json			# Project dependencies
│   └── wrangler.toml			# Project configuration
│
├─ mail-web				        # Frontend React project
│   ├── src
│   │   ├── api 			    # API client
│   │   ├── components			# Custom components
│   │   ├── i18n			    # Internationalization
│   │   ├── lib			    # Request, permission, and utility layer
│   │   ├── pages			    # Page components
│   │   ├── store			    # Global state management
│   │   ├── App.tsx			    # Root component
│   │   ├── main.tsx			    # Entry TSX file
│   │   └── styles.css			# Global styles
│   ├── package.json			# Project dependencies
└── └── .env.release			# Release environment configuration

```

## Local Development

### Prerequisites

The project is split into two directories: `mail-web` is the React + HeroUI frontend, and `mail-worker` is the Cloudflare Workers backend. Node.js 20+ and pnpm are recommended.

If pnpm is not installed, enable it with Corepack:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Install dependencies for both projects:

```bash
pnpm --prefix mail-web install
pnpm --prefix mail-worker install
```

Copy the private Wrangler config templates, then fill in your own Cloudflare resource IDs, domains, admin email, and `jwt_secret`:

```bash
cp mail-worker/wrangler-dev.example.toml mail-worker/wrangler-dev.toml
cp mail-worker/wrangler.example.toml mail-worker/wrangler.toml
cp mail-worker/wrangler-test.example.toml mail-worker/wrangler-test.toml
```

`mail-worker/wrangler.toml`, `mail-worker/wrangler-dev.toml`, and `mail-worker/wrangler-test.toml` are local private config files. They are ignored by `.gitignore`, so they can be used locally without being committed.

### Frontend Hot Reload

The frontend development environment reads `mail-web/.env.dev`, which points API requests to `http://127.0.0.1:8787/api` by default. Run the backend and frontend in two terminals:

```bash
pnpm --prefix mail-worker run dev
```

```bash
pnpm --prefix mail-web run dev
```

Open:

```text
http://localhost:3001
```

For the first local Worker startup, initialize the D1 schema. `<jwt_secret>` must match `[vars].jwt_secret` in `mail-worker/wrangler-dev.toml`:

```bash
curl http://127.0.0.1:8787/init/<jwt_secret>
```

After it returns `success`, open the frontend login page. The admin account is controlled by `[vars].admin` in `wrangler-dev.toml`.

### Worker Preview With Static Assets

To preview the deployed shape of “Worker + static frontend assets”, build the frontend first. `mail-web/.env.release` outputs the build to `../mail-worker/dist`:

```bash
pnpm --prefix mail-web run build
pnpm --prefix mail-worker run dev
```

Open:

```text
http://127.0.0.1:8787
```

In this mode, the frontend and `/api` are served from the same Worker origin, which is closer to the production environment on Cloudflare.

### Common Frontend Commands

```bash
# Local development, API defaults to 127.0.0.1:8787/api
pnpm --prefix mail-web run dev

# Use mail-web/.env.remote, API defaults to a remote service
pnpm --prefix mail-web run remote

# Production build, output defaults to mail-worker/dist
pnpm --prefix mail-web run build

# Preview the Vite build output
pnpm --prefix mail-web run preview
```

## Deploy to Cloudflare

### 1. Log in to Cloudflare

```bash
pnpm --prefix mail-worker exec wrangler login
```

### 2. Create Cloudflare Resources

Create D1, KV, and R2 resources as needed. You can change the resource names below. After creation, copy the returned IDs into `mail-worker/wrangler.toml`.

```bash
pnpm --prefix mail-worker exec wrangler d1 create cloud-mail
pnpm --prefix mail-worker exec wrangler kv namespace create kv
pnpm --prefix mail-worker exec wrangler r2 bucket create cloud-mail
```

If you do not need attachment storage yet, R2 can be skipped. Keep `[ai] binding = "ai"` if you plan to use Workers AI for verification code recognition.

### 3. Configure `mail-worker/wrangler.toml`

`mail-worker/wrangler.toml` should be copied from `mail-worker/wrangler.example.toml` and kept private locally. Do not commit the real config. Before deploying, check at least these fields:

- `name`: Worker name.
- `[[d1_databases]]`: set `database_name` and `database_id` from Cloudflare D1; keep `binding = "db"`.
- `[[kv_namespaces]]`: set the KV namespace `id`; keep `binding = "kv"`.
- `[[r2_buckets]]`: set `bucket_name`; keep `binding = "r2"`.
- `[vars].domain`: your receiving domains, for example `["example.com"]`.
- `[vars].admin`: admin email after initialization, for example `admin@example.com`.
- `[vars].jwt_secret`: secret used by initialization and login signing. Replace it with a long random string.
- `[assets]`: keep `directory = "./dist"`; frontend assets are built here during deployment.

If you deploy with an API Token, Wrangler may be unable to automatically discover your account. In that case, provide the Cloudflare Account ID in one of these ways:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id pnpm --prefix mail-worker run deploy
```

Or add it to the top level of the relevant Wrangler config:

```toml
account_id = "your-account-id"
```

To bind a custom domain, add a route to `wrangler.toml`:

```toml
[[routes]]
pattern = "mail.example.com"
custom_domain = true
```

### 4. Deploy

The `[build]` section in `mail-worker/wrangler.toml` automatically builds the frontend:

```toml
[build]
command = "pnpm --prefix ../mail-web install && pnpm --prefix ../mail-web run build"
```

So production deployment only needs:

```bash
pnpm --prefix mail-worker install
pnpm --prefix mail-worker run deploy
```

For the test config, use `deploy:test`. The `test` script is kept as a compatibility alias and also deploys the test environment; it is not a unit test command.

```bash
pnpm --prefix mail-worker run deploy:test
```

### 5. Initialize the Database

After the first successful deployment, call the initialization endpoint. `<jwt_secret>` must match `[vars].jwt_secret` in `wrangler.toml`:

```bash
curl https://your-domain/api/init/<jwt_secret>
```

A `success` response means the D1 schema, default settings, permissions, and admin account have been initialized.

### 6. Configure Email Receiving

Cloud Mail exposes an `email` handler from the Worker. To receive emails, enable Email Routing for your domain in the Cloudflare dashboard, then route the target address or Catch-all rule to this Worker.

After that, sign in with the admin email from `[vars].admin`, then continue configuring sending, attachments, forwarding, verification code recognition, and other features under “Settings / System Settings”.

## Sponsor

<a href="https://doc.skymail.ink/support.html">
<img width="170px" src="./doc/images/support.png" alt="">
</a>

## License

This project is licensed under the [MIT](LICENSE) license.

## Communication

[Telegram](https://t.me/cloud_mail_tg)
