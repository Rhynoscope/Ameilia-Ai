# Amelia Assistant — Personal AI Relationship Companion & LDR Texting Coach

![Amelia Assistant](https://img.shields.io/badge/Amelia%20Assistant-v2.5.0-ff69b4.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.2.1-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-SDK%20v0.1-orange.svg)
![Render Ready](https://img.shields.io/badge/Render-Blueprint%20Ready-46E3B7.svg)

**Amelia Assistant** is an elegant, private, browser-based relationship companion built specifically for couples in **long-distance relationships (LDR)**. Built with Next.js 15, React 19, TypeScript, Tailwind CSS, and Google's official `@google/genai` JavaScript SDK.

It helps you stay close across the miles: starting genuine conversations, finding the right words when she texts you, responding to photos, videos, and voice notes she sends, planning creative virtual dates, and keeping emotional intimacy strong.

---

## 💖 Key Capabilities & Architecture

### 1. Unified Amelia AI Chat Interface
- **Centralized Experience**: Everything (texting advice, screenshot analysis, photo reactions, audio voice notes, video analysis, message drafting, apologies) is handled through one unified conversation.
- **3–5 Ready-to-Send Text Suggestions**: Whenever you ask what to text Amelia, the AI provides 3 to 5 realistic, natural messages you can directly copy and send, complete with tone badges and one-click variations (*Shorter, Longer, Sweeter, Funnier, More Affectionate*).
- **Multimodal Attachment System**: Drag-and-drop or attach:
  - 📸 **Photos & Screenshots**: PNG, JPG, JPEG, WEBP (with automatic client-side compression).
  - 🎙️ **Voice Notes & Audio**: MP3, WAV, M4A, AAC, OGG, FLAC.
  - 🎬 **Video Clips**: MP4, MOV, WEBM.

### 2. Complete Chat History & Management (Feature 1)
- **Sidebar History**: Browse past conversations with auto-generated contextual titles, last message previews, message counts, and relative timestamps (*"Just now"*, *"2h ago"*, *"Yesterday"*).
- **Search & Filter**: Search conversations by title or past message text in real time.
- **Active vs. Archived Tabs**: Organize ongoing conversations and archive older ones.
- **Three-Dot Menu (`...`) per Chat**:
  - ✏️ **Rename**: Inline or modal title editing.
  - 📦 **Archive / Restore**: Move conversations between Active and Archived views.
  - 🗑️ **Permanent Deletion**: Deletes conversations and messages from the database with confirmation; chats never reappear upon page refresh.
- **Global Actions**: Archive All, Restore All, and Purge All Conversations.

### 3. Extra Thinking Mode (Feature 2)
Directly beside the message input bar, toggle between three reasoning depths powered by Gemini's official `thinking_level` parameter:
1. ⚡ **Quick** (`minimal`): Ultra-fast replies with minimal overhead. Best for everyday texting ideas and quick replies.
2. 🧠 **Normal** (`medium`): Balanced contextual understanding. Perfect for everyday conversation advice.
3. 💡 **Extra Thinking** (`high`): In-depth analytical reasoning for complex emotional situations, multi-screenshot analysis, or resolving delicate relationship friction.
- User preference is automatically saved to `localStorage` and sent with every request.

### 4. Dual Database Persistence (Zero Configuration)
- **Local Development**: Runs natively with zero setup on SQLite (`node:sqlite`) stored at `./data/amelia.db`.
- **Render & Production**: Automatically connects to **Render PostgreSQL** when `DATABASE_URL` is detected, featuring connection pooling, automatic schema creation, and non-ephemeral storage.

### 5. Visual Identity & Accessibility
- Clean white background (`#FFFFFF`) with soft romantic pink accents and charcoal/black text for readability.
- Subtle heart accents, smooth transitions, mobile-responsive layout, and zero dark purple styling.

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js**: v20 or v22 (v24 supported)
- **pnpm** (recommended) or **npm**

### 2. Installation
```bash
git clone <your-repo-url>
cd amelia-assistant
pnpm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (or copy from `.env.example`):
```bash
cp .env.example .env
```

Edit `.env` and add your Google Gemini API Key:
```env
# Get your free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=3000
```
*(If no API key is set, the application operates in Demo Mode with realistic simulated responses so you can safely preview the UI).*

### 4. Run Development Server
```bash
pnpm dev
```
Open `http://localhost:3000` in your web browser.

### 5. Run Production Build Locally
```bash
pnpm build
pnpm start
```

---

## 🐙 Pushing to GitHub (Step-by-Step)

Follow these exact steps on your computer to push the project to your GitHub account:

### Step 1: Ensure Git is Installed
Download and install Git from [git-scm.com](https://git-scm.com/) if you haven't already.

### Step 2: Initialize Git & Verify Ignored Secrets
The project's `.gitignore` is already preconfigured to protect your private credentials and database files (`.env`, `data/*.db`, `node_modules/`, `.next/`).

In your terminal:
```bash
cd amelia-assistant

# Initialize git repository
git init

# Check that .env and data/ are ignored
git status
```
*(Verify that `.env` and any `.db` files do NOT appear under untracked files).*

### Step 3: Commit the Files
```bash
git add .
git commit -m "feat: complete Amelia Assistant with chat management, thinking modes, and Render support"
```

### Step 4: Create a Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Enter repository name: `amelia-assistant` (you can choose Public or Private).
3. Do **NOT** initialize with a README, .gitignore, or license (we already have them).
4. Click **Create repository**.

### Step 5: Link and Push
```bash
# Rename branch to main
git branch -M main

# Add your GitHub remote (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/amelia-assistant.git

# Push code to GitHub
git push -u origin main
```

---

## ☁️ Deploying to Render

You can deploy Amelia Assistant to [Render](https://render.com) using either the **Automated Blueprint (Recommended)** or **Manual Setup**.

### Method 1: Automated Deployment via `render.yaml` Blueprint (Recommended)

The repository includes a ready-to-deploy `render.yaml` Blueprint that provisions both a **Web Service** and a persistent **PostgreSQL Database** automatically:

1. Push your code to GitHub (as described in the GitHub section).
2. Log in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** in the top navigation and select **Blueprint**.
4. Connect your GitHub account and select your `amelia-assistant` repository.
5. Render will detect `render.yaml` and display the resources to create:
   - **Service**: `amelia-assistant` (Web Service, Node.js)
   - **Database**: `amelia-assistant-db` (PostgreSQL)
6. Under **Environment Variables**, Render will prompt you for:
   - `GEMINI_API_KEY`: Paste your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
7. Click **Apply**.
8. Render will build and deploy the app with automatic HTTPS, database connection, and health monitoring!

---

### Method 2: Manual Setup on Render Dashboard

If you prefer to configure services manually:

#### Step 1: Create PostgreSQL Database on Render
1. In Render Dashboard, click **New +** → **PostgreSQL**.
2. Name: `amelia-assistant-db`
3. Database: `amelia_assistant`
4. User: `amelia_user`
5. Plan: **Free** (or Starter)
6. Click **Create Database**.
7. Once created, copy the **Internal Database URL** (e.g., `postgresql://amelia_user:password@dpg-xxx:5432/amelia_assistant`).

#### Step 2: Create Web Service on Render
1. Click **New +** → **Web Service**.
2. Connect your GitHub repository `amelia-assistant`.
3. Configure the following settings:
   - **Name**: `amelia-assistant`
   - **Region**: Same region as your database (e.g., Oregon)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: `Free`
4. Scroll to **Environment Variables** and add:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: `<Your Google Gemini API Key>`
   - `GEMINI_MODEL`: `gemini-3.5-flash-lite`
   - `DATABASE_URL`: `<Paste your PostgreSQL Internal Database URL from Step 1>`
5. Under **Health Check Path**, enter: `/api/health`
6. Click **Create Web Service**.

---

## 🔍 Health Check & Monitoring

Amelia Assistant includes a dedicated health check endpoint:
```
GET /api/health
```
Response:
```json
{
  "status": "ok",
  "service": "amelia-assistant",
  "timestamp": "2026-11-04T02:00:00.000Z",
  "uptime": 142.5,
  "database": "postgresql",
  "gemini": {
    "configured": true,
    "model": "gemini-3.5-flash-lite"
  }
}
```

---

## 🔒 Security & Privacy Guarantees

- **Zero Secret Leaks**: `GEMINI_API_KEY` and `DATABASE_URL` are strictly server-side environment variables. They are never sent to client browsers or bundled in JavaScript chunks.
- **Strict `.gitignore`**: Database files (`*.db`, `*.sqlite`) and local environment files (`.env*`) are excluded from source control.
- **Permanent Data Erasure**: Deleting a conversation in the interface performs a real database `DELETE` query, ensuring erased conversations and attachments never reappear on refresh.
- **Private Communication**: We never link to third-party social media accounts. You maintain complete control over all data.

---

## 📁 Repository Structure

```
amelia-assistant/
├── .env.example              # Safe environment variable template
├── .gitignore                # Comprehensive exclusions (secrets, DBs, logs)
├── render.yaml               # Render Blueprint (Web service + PostgreSQL)
├── package.json              # Project dependencies (pg, @google/genai, lucide)
├── tsconfig.json             # TypeScript compiler settings
├── tailwind.config.ts        # White and romantic pink styling palette
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/         # Unified chat endpoint & multi-chat management
│   │   │   │   ├── route.ts      # GET (list/filter), POST (send), DELETE, PATCH
│   │   │   │   └── [id]/route.ts # GET messages, DELETE convo, PATCH rename/archive
│   │   │   ├── health/       # Render health check endpoint
│   │   │   ├── memories/     # Relationship memories CRUD
│   │   │   ├── dates/        # Important countdown dates
│   │   │   ├── reminders/    # Check-in tracker & notifications
│   │   │   └── settings/     # Authentic voice profile & configurations
│   │   ├── layout.tsx        # App root layout with Navbar
│   │   └── page.tsx          # Main Amelia AI chat interface (Sidebar + Chat)
│   ├── components/
│   │   ├── Navbar.tsx            # Header navigation & status badge
│   │   ├── ReplyCard.tsx         # 3-5 ready-to-send text suggestions with copy
│   │   ├── MediaPreview.tsx      # Multi-media preview & staging
│   │   ├── VirtualDatesModal.tsx # LDR virtual date idea generator
│   │   ├── MemoriesModal.tsx     # Relationship memories dialog
│   │   └── RemindersModal.tsx    # Scheduled reminders & desktop alerts
│   └── lib/
│       ├── db.ts             # Dual-database adapter (PostgreSQL & SQLite)
│       ├── gemini.ts         # Official @google/genai SDK client & thinking config
│       ├── media-handler.ts  # Audio/video/photo file processor
│       └── types.ts          # TypeScript type definitions
└── data/
    └── .gitkeep              # Local SQLite database directory
```

---

## 💡 Troubleshooting

### Conversations Not Saving on Free Render Restarts?
- Free Render web service disks are ephemeral. Ensure `DATABASE_URL` is configured to connect to **Render PostgreSQL** (provided automatically via `render.yaml`).
- Once `DATABASE_URL` is set, all conversations, messages, and memories persist indefinitely across redeploys.

### Gemini API Rate Limits or Errors?
- Ensure your API key has available quota at [Google AI Studio](https://aistudio.google.com/).
- In your settings or `.env`, you can use `gemini-3.5-flash-lite` for high throughput and fast responses.
