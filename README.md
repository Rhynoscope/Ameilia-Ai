# Amelia Assistant — Personal AI Relationship Companion & LDR Texting Coach

![Amelia Assistant](https://img.shields.io/badge/Amelia%20Assistant-Cloudflare%20Edition-ff69b4.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.5.29-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%26%20D1%20%26%20R2-F38020.svg)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-SDK%20v2.32-orange.svg)

**Amelia Assistant** is an elegant, private, browser-based relationship companion built specifically for couples in **long-distance relationships (LDR)**. Powered by Next.js 15, React 19, TypeScript, Tailwind CSS, Google's official `@google/genai` JavaScript SDK, and architected natively for **Cloudflare Workers, D1, and R2 (100% Free Tier)**.

It helps you stay emotionally close across the miles: starting authentic conversations, crafting the perfect text replies, reacting thoughtfully to photos, videos, and voice notes she sends, planning virtual dates, and keeping communication loving and effortless.

---

## 💖 Key Features & Capabilities

### 1. Unified "Amelia AI" Chat Interface
- **Centralized Experience**: All tools (texting advice, screenshot analysis, photo reactions, audio voice notes, video analysis, message drafting, apologies) are integrated into one continuous conversation.
- **3–5 Ready-to-Send Text Suggestions**: Whenever you ask what to text Amelia, the AI provides 3 to 5 realistic, natural messages you can directly copy and send, complete with tone badges and one-click variations (*Shorter, Longer, Sweeter, Funnier, More Affectionate*).
- **Multimodal Attachment System**:
  - 📸 **Photos & Screenshots**: PNG, JPG, JPEG, WEBP (stored in private Cloudflare R2 bucket).
  - 🎙️ **Voice Notes & Audio**: MP3, WAV, M4A, AAC, OGG, FLAC.
  - 🎬 **Video Clips**: MP4, MOV, WEBM.

### 2. Complete Conversation History & Management
- **Sidebar History**: Browse past conversations with auto-generated titles, message previews, message counts, and timestamps (*"Just now"*, *"2h ago"*, *"Yesterday"*).
- **Search & Filter**: Search conversations by title or past message text in real time.
- **Active vs. Archived Tabs**: Organize ongoing conversations and archive older ones.
- **Three-Dot Menu (`...`) per Chat**:
  - ✏️ **Rename**: Inline or modal title editing.
  - 📦 **Archive / Restore**: Move conversations between Active and Archived views.
  - 🗑️ **Permanent Deletion**: Permanently deletes conversations, messages, and associated R2 media assets from storage. Chats never reappear upon page refresh.
- **Global Actions**: Archive All, Restore All, and Purge All Conversations.

### 3. Extra Thinking Mode (Reasoning Depth)
Directly beside the message input bar, toggle between three reasoning depths powered by Gemini's official `thinking_level` parameter:
1. ⚡ **Quick** (`minimal`): Ultra-fast replies with minimal latency. Best for everyday texting ideas and quick replies.
2. 🧠 **Normal** (`medium`): Balanced contextual understanding. Perfect for everyday conversation advice.
3. 💡 **Extra Thinking** (`high`): In-depth analytical reasoning for complex emotional situations, multi-screenshot analysis, or resolving delicate relationship friction.

### 4. Cloudflare Serverless Architecture (Zero Cost)
- **Edge Compute**: Cloudflare Workers via `@opennextjs/cloudflare`. Instant global cold starts, running across 300+ edge locations worldwide.
- **Database (Cloudflare D1)**: Serverless SQLite database (`amelia-assistant-db`) with full transactional persistence.
- **Media Storage (Cloudflare R2)**: Zero-egress S3-compatible storage (`amelia-assistant-media`) with a secure private streaming proxy (`/api/media/[key]`).
- **Scheduled Reminders (Cloudflare Cron Triggers)**: Background cron jobs (`0 14,18,21 * * *`) that trigger check-in reminders even when your browser tab is closed.
- **Local Fallback**: Automatically switches to local SQLite (`./data/amelia.db`) during local development so you never need to connect to cloud services just to test UI changes.

---

## ☁️ Cloudflare Deployment Guide (Beginner Friendly)

Deploying Amelia Assistant to Cloudflare is 100% free using Cloudflare's generous Free Tier. Follow these step-by-step instructions.

### Prerequisites
1. A **Cloudflare Account**: Sign up free at [dash.cloudflare.com](https://dash.cloudflare.com/).
2. A **Google Gemini API Key**: Generate a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
3. **Node.js** (v20 or v22+) and **pnpm** installed on your computer.

---

### Step 1: Install Wrangler CLI & Authenticate
Open your local terminal and log in to Cloudflare:
```bash
npx wrangler login
```
*A browser window will open asking you to authorize Wrangler. Click **Allow**.*

---

### Step 2: Cloudflare D1 Database (Configured & Migrated)
The production serverless SQLite database has already been created in your Cloudflare account:
- Database Name: `amelia-assistant-db`
- Database ID: `8ad25e3b-a6e7-48ef-b251-61c19c91fc11`
- Status: Initialized with all 7 schema tables (`conversations`, `messages`, `memories`, `important_dates`, `reminder_logs`, `push_subscriptions`, `settings`).

The binding is configured directly in `wrangler.json`:
```json
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "amelia-assistant-db",
      "database_id": "8ad25e3b-a6e7-48ef-b251-61c19c91fc11"
    }
  ]
```

To run future migrations:
```bash
npm run d1:migrate:remote
```

---

### Step 3: Cloudflare R2 Media Bucket (Optional)
If you wish to store photos, videos, and voice notes in Cloudflare R2:
1. Navigate to your [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Storage & Databases** → **R2** and click **Enable R2** (free tier includes 10 GB/month).
2. Create your media bucket:
```bash
npx wrangler r2 bucket create amelia-assistant-media
```
*(Note: If R2 is not yet enabled, the app automatically falls back to secure inline media storage without throwing errors).*

---

### Step 4: Set Your Encrypted Worker Secrets
Set your Google Gemini API key securely in Cloudflare:
```bash
npx wrangler secret put GEMINI_API_KEY
```
*When prompted, paste your Google Gemini API key and hit Enter.*

---

### Step 5: Connect to Cloudflare Workers Builds (GitHub Auto-Deployment)

> **Why Cloudflare Pages Returned 404:**
> Cloudflare Pages is designed for static websites and legacy `/functions`. Raw Next.js 15 App Router dynamic API routes cannot run on static Pages without an edge worker runtime. Cloudflare Workers (Workers Builds) compiles the entire application into `.open-next/worker.js`, giving you full server-side API execution (`/api/chat`, `/api/settings`, etc.) and fast asset streaming via the `ASSETS` binding.

To deploy via Cloudflare Workers Builds:
1. Push your updated code to your GitHub repository:
   ```bash
   git add .
   git commit -m "fix(cloudflare): migrate from Pages to Workers with OpenNext"
   git push origin main
   ```
2. Navigate to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Compute (Workers & Pages)**.
3. If you previously created a **Pages** project that gave 404, delete or disconnect it.
4. Click **Create** → select **Workers** → **Connect to Git** (Workers Builds).
5. Select your repository: `Rhynoscope/Ameilia-Ai`.
6. Configure the build settings:
   - **Build command**: `npm run build:worker`
   - **Deploy command**: `npx opennextjs-cloudflare deploy` *(or `npx wrangler deploy`)*
   - **Root directory**: `/`
7. Under **Settings → Variables and Secrets**:
   - Add Secret: `GEMINI_API_KEY` with your Gemini API key.
   - Add Variable: `GEMINI_MODEL` with value `gemini-3.5-flash-lite`.
8. Click **Save and Deploy**!

---

### Alternative: One-Command CLI Deployment
You can deploy directly to Cloudflare Workers from your terminal right now:
```bash
npm run deploy
```
This runs `opennextjs-cloudflare build` followed by `opennextjs-cloudflare deploy`, publishing your Worker instantly.

---

## 💻 Local Development

You can run Amelia Assistant locally on your machine with full functionality:

```bash
# 1. Install dependencies
npm install

# 2. Copy the development variables template
cp .dev.vars.example .dev.vars

# 3. Add your Gemini API key inside .dev.vars
# GEMINI_API_KEY=your_key_here

# 4. Start the Next.js development server
npm run dev
```
Open `http://localhost:3000` in your web browser. Local data is automatically persisted to `./data/amelia.db` using Node.js SQLite with zero setup.

---

## 🎁 Cloudflare Free Tier Capacity & Limits

Amelia Assistant is specifically engineered to fit comfortably within Cloudflare's **100% Free Plan**:

| Resource | Free Tier Monthly / Daily Limit | Amelia Assistant Typical Usage | Free Tier Cost |
| :--- | :--- | :--- | :--- |
| **Cloudflare Workers** | 100,000 requests / day | 50 – 500 requests / day | **$0.00** |
| **Cloudflare D1** | 5,000,000 row reads / day<br>100,000 row writes / day<br>5 GB total storage | ~2,000 reads / day<br>~100 writes / day<br>< 50 MB storage | **$0.00** |
| **Cloudflare R2** | 10 GB total storage<br>1,000,000 Class A operations / mo<br>10,000,000 Class B operations / mo<br>**$0.00 Egress Fees** | < 2 GB storage<br>~500 operations / mo | **$0.00** |
| **Cloudflare KV** | 100,000 reads / day<br>1,000 writes / day | < 50 reads / day | **$0.00** |
| **Total Estimated Cost** | — | — | **$0.00 / month** |

---

## 🔐 Security Notice: Rotate Your Gemini API Key

> [!WARNING]
> Because your previous commit `c874b7e` on GitHub contained a `.env` file with a live API key, GitHub may have made that key visible in git history.
>
> We have completely removed `.env` from tracking in Git and added strict exclusion patterns in `.gitignore` so your private keys are never committed again.
>
> **Recommended Action**:
> 1. Visit [Google AI Studio API Keys](https://aistudio.google.com/app/apikey).
> 2. Delete the previously exposed key and generate a brand-new API key.
> 3. Store the new key securely using `npx wrangler secret put GEMINI_API_KEY` on Cloudflare and in your local `.dev.vars`.

---

## 🔍 Health Check & Diagnostics

Amelia Assistant includes a real-time health check endpoint:
```
GET /api/health
```

Sample JSON response:
```json
{
  "status": "ok",
  "service": "amelia-assistant",
  "timestamp": "2026-11-04T06:30:00.000Z",
  "runtime": {
    "platform": "cloudflare",
    "node_version": "v22.13.5",
    "uptime": 24.1
  },
  "database": {
    "type": "d1",
    "connected": true
  },
  "storage": {
    "type": "r2",
    "configured": true
  },
  "gemini": {
    "configured": true,
    "model": "gemini-2.5-flash"
  }
}
```

---

## 📁 Project Structure

```
Ameilia-Ai/
├── .dev.vars.example         # Template for local Cloudflare Worker secrets
├── .env.example              # Template for standard environment variables
├── .gitignore                # Protects secrets, build outputs, and local DBs
├── cloudflare-env.d.ts       # TypeScript bindings for D1, R2, and KV
├── migrations/
│   └── 0001_initial_schema.sql # D1 database schema for all 7 application tables
├── next.config.mjs           # Next.js config with OpenNext dev bindings
├── open-next.config.ts       # OpenNext Cloudflare adapter configuration
├── package.json              # Cloudflare & Next.js dependencies and scripts
├── pnpm-workspace.yaml       # Monorepo and native build approvals
├── public/                   # Static icons and service worker
├── render.yaml.bak           # Archived Render blueprint (safe backup)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/         # Unified chat endpoint & conversation management
│   │   │   ├── cron/         # Cloudflare Cron Trigger endpoint (/api/cron/reminders)
│   │   │   ├── health/       # Health diagnostic endpoint
│   │   │   ├── media/        # R2 upload & private streaming (/api/media/[key])
│   │   │   ├── memories/     # Relationship memories CRUD
│   │   │   ├── dates/        # Countdown dates & milestones
│   │   │   └── settings/     # Voice customization & user preferences
│   │   ├── layout.tsx        # App root layout with romantic pink theme
│   │   └── page.tsx          # Main Amelia AI chat interface & sidebar
│   ├── components/           # UI components (cards, dialogs, modals, previews)
│   └── lib/
│       ├── db.ts             # Triple database adapter (Cloudflare D1, SQLite, PG)
│       ├── gemini.ts         # Google GenAI SDK client & thinking depth logic
│       ├── r2.ts             # Cloudflare R2 upload, fetch, and cleanup
│       └── types.ts          # Core TypeScript types
├── tailwind.config.ts        # Romantic white & soft pink design system
├── tsconfig.json             # TypeScript compiler settings
└── wrangler.jsonc            # Cloudflare Workers, D1, R2, and Cron configuration
```

---

## 💖 Need Help?
If you run into any issues during deployment, check your Cloudflare Dashboard deployment logs under **Compute (Workers & Pages)** → **Your Worker** → **Deployments**.
