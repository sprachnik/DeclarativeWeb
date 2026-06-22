# VibeFeed Developer Guide

**Technical setup, architecture, and deployment guide for VibeFeed**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Configuration](#configuration)
5. [Architecture Deep Dive](#architecture-deep-dive)
6. [API Reference](#api-reference)
7. [Deployment](#deployment)
8. [Development Workflow](#development-workflow)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

---

## Quick Start

### Prerequisites

- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)
- Supabase account (free tier works)
- Anthropic API key (for Claude AI)
- Git

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/RenderJS.git
cd RenderJS/vibefeed

# 2. Set up Supabase
# - Create project at supabase.com
# - Run schema.sql in SQL editor
# - Copy credentials

# 3. Configure environment
# Create supabase-config.js in js/ folder
cat > js/supabase-config.js << 'EOF'
window.SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key'
}
window.ANTHROPIC_API_KEY = 'your-anthropic-api-key'
EOF

# 4. Open in browser
# No build step needed!
open index.html
```

**You're ready to go!** Sign up, create your first vibe, and explore.

---

## Environment Setup

### 1. Supabase Project Setup

**Create a new Supabase project:**

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and project name
4. Select region (closest to your users)
5. Generate strong database password
6. Wait for project to initialize (~2 minutes)

**Get your credentials:**

1. Go to Settings → API
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

### 2. Database Schema Setup

**Option A: Use SQL Editor (Recommended)**

1. Open SQL Editor in Supabase dashboard
2. Copy entire contents of `supabase/schema.sql`
3. Paste and run
4. Verify all 8 tables created

**Option B: Use Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push schema
supabase db push
```

**Verify setup:**

```sql
-- Run in SQL Editor
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Should return:
-- comments, follows, generation_usage, likes,
-- notifications, user_plans, users, vibes
```

### 3. Enable Row-Level Security

**The schema includes RLS policies, but verify:**

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All should show rowsecurity = true
```

**Test RLS policies:**

```sql
-- As authenticated user, should only see own profile
SELECT * FROM users WHERE id = auth.uid();

-- Should only see public vibes or own vibes
SELECT * FROM vibes WHERE is_public = true OR user_id = auth.uid();
```

### 4. Anthropic API Key

**Get API key:**

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to API Keys
4. Create new key
5. Copy key (starts with `sk-ant-...`)

**Cost considerations:**

- Free tier: $5 credit
- Pay-as-you-go: ~$3 per MTok (input), ~$15 per MTok (output)
- Average vibe generation: ~1000 input tokens, ~500 output tokens
- Estimated cost per vibe: ~$0.01

**Rate limits:**

- Free tier: 5 requests/minute
- Paid: 50-4000 requests/minute (depending on tier)

### 5. Configuration File

Create `vibefeed/js/supabase-config.js`:

```javascript
// Supabase configuration
window.SUPABASE_CONFIG = {
  url: 'https://your-project-ref.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}

// Anthropic API key
window.ANTHROPIC_API_KEY = 'sk-ant-api03-...'

// Optional: Custom configuration
window.VIBEFEED_CONFIG = {
  // AI model selection
  aiModel: 'claude-sonnet-4-5-20250929',

  // Generation settings
  maxTokens: 4000,
  temperature: 0.7,

  // Rate limiting
  enableClientRateLimit: true,

  // Feature flags
  enableRemixing: true,
  enableNotifications: true,
  enableAnalytics: false
}
```

**Security note:** This file contains secrets and should NOT be committed to git.

Add to `.gitignore`:

```
vibefeed/js/supabase-config.js
```

---

## Database Setup

### Schema Overview

**8 tables with relationships:**

```
users (1) ←──┬── (∞) vibes
             ├── (∞) likes
             ├── (∞) comments
             ├── (∞) follows (as follower)
             ├── (∞) follows (as following)
             ├── (1) user_plans
             ├── (∞) generation_usage
             └── (∞) notifications

vibes (1) ←──┬── (∞) likes
             ├── (∞) comments
             └── (∞) vibes (remixes)
```

### Table Details

#### `users` - User Profiles

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraints
ALTER TABLE users ADD CONSTRAINT username_length
  CHECK (char_length(username) >= 3 AND char_length(username) <= 30);
ALTER TABLE users ADD CONSTRAINT bio_length
  CHECK (char_length(bio) <= 500);
```

#### `vibes` - Content Posts

```sql
CREATE TABLE vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  chat_history JSONB,
  parent_vibe_id UUID REFERENCES vibes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_vibes_user_id ON vibes(user_id);
CREATE INDEX idx_vibes_created_at ON vibes(created_at DESC);
CREATE INDEX idx_vibes_tags ON vibes USING GIN(tags);
CREATE INDEX idx_vibes_public ON vibes(is_public) WHERE is_public = true;
```

#### `likes` - Like Tracking

```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe_id UUID REFERENCES vibes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vibe_id, user_id)  -- One like per user per vibe
);

-- Indexes
CREATE INDEX idx_likes_vibe_id ON likes(vibe_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
```

#### `comments` - Comments on Vibes

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe_id UUID REFERENCES vibes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_vibe_id ON comments(vibe_id);
```

#### `follows` - User Relationships

```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),  -- Can't follow twice
  CHECK (follower_id != following_id) -- Can't follow yourself
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

#### `user_plans` - Subscription Management

```sql
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'premium')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `generation_usage` - Daily Generation Tracking

```sql
CREATE TABLE generation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_generation_usage_user_date ON generation_usage(user_id, date);
```

#### `notifications` - Activity Alerts

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'new_post')),
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
```

### Row-Level Security (RLS) Policies

**Users table:**

```sql
-- Can view all users
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT USING (true);

-- Can only update own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

-- Can insert own profile
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);
```

**Vibes table:**

```sql
-- Can view public vibes or own vibes
CREATE POLICY "Public vibes are viewable by all"
  ON vibes FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

-- Can insert own vibes
CREATE POLICY "Users can create vibes"
  ON vibes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Can update own vibes
CREATE POLICY "Users can update own vibes"
  ON vibes FOR UPDATE
  USING (user_id = auth.uid());

-- Can delete own vibes
CREATE POLICY "Users can delete own vibes"
  ON vibes FOR DELETE
  USING (user_id = auth.uid());
```

**Likes table:**

```sql
-- Can view all likes
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT USING (true);

-- Can create own likes
CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Can delete own likes
CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (user_id = auth.uid());
```

**Similar policies exist for comments, follows, notifications, etc.**

### Database Functions

**Get like count for vibe:**

```sql
CREATE OR REPLACE FUNCTION get_like_count(vibe_id_param UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM likes WHERE vibe_id = vibe_id_param;
$$ LANGUAGE SQL STABLE;
```

**Check if user has liked vibe:**

```sql
CREATE OR REPLACE FUNCTION has_liked(vibe_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM likes
    WHERE vibe_id = vibe_id_param AND user_id = user_id_param
  );
$$ LANGUAGE SQL STABLE;
```

**Get follower count:**

```sql
CREATE OR REPLACE FUNCTION get_follower_count(user_id_param UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM follows WHERE following_id = user_id_param;
$$ LANGUAGE SQL STABLE;
```

---

## Architecture Deep Dive

### Frontend Architecture

**No build step, pure HTML/CSS/JS:**

```
┌─────────────────────────────────────────────┐
│           Browser (Client-Side)             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  HTML Pages (10 files)                │ │
│  │  - index, login, app, create, vibe... │ │
│  └───────────────────────────────────────┘ │
│                    │                        │
│                    ▼                        │
│  ┌───────────────────────────────────────┐ │
│  │  DeclarativeWeb (render.js)           │ │
│  │  - Block rendering                    │ │
│  │  - State management                   │ │
│  │  - Template interpolation             │ │
│  └───────────────────────────────────────┘ │
│                    │                        │
│                    ▼                        │
│  ┌───────────────────────────────────────┐ │
│  │  Supabase Client (supabase.js)        │ │
│  │  - Auth, CRUD operations              │ │
│  │  - 944 lines of API wrappers          │ │
│  └───────────────────────────────────────┘ │
│           │                    │            │
│           ▼                    ▼            │
│  ┌─────────────┐      ┌────────────────┐   │
│  │ Supabase    │      │ Claude API     │   │
│  │ (Backend)   │      │ (AI)           │   │
│  └─────────────┘      └────────────────┘   │
└─────────────────────────────────────────────┘
```

### AI Generation Flow

**Complete flow for creating a vibe:**

```
1. User Input (create.html)
   │
   ├─ Text description
   └─ Image upload (optional)
       │
       ▼
2. Check Limits (client-side)
   │
   ├─ Daily generation limit (10 free, 100 premium)
   └─ Monthly post limit (30 free, 350 premium)
       │
       ▼
3. Build AI Prompt
   │
   ├─ System prompt (optimized for DeclarativeWeb)
   ├─ User message
   ├─ Image (base64 encoded)
   └─ Chat history (last 4 exchanges)
       │
       ▼
4. Stream to Claude API
   │
   ├─ Model: claude-sonnet-4-5
   ├─ Max tokens: 4000
   ├─ Temperature: 0.7
   └─ Streaming: true
       │
       ▼
5. Parse Streaming JSON
   │
   ├─ Incremental parsing (streaming-json-parser.js)
   ├─ Auto-completion of incomplete JSON
   └─ Progressive updates
       │
       ▼
6. Extract & Sanitize
   │
   ├─ Parse { blocks: [...], tags: [...] }
   ├─ Filter allowed block types
   ├─ Remove dangerous properties
   ├─ Sanitize strings (XSS prevention)
   └─ Enforce block limits (2 free, 5 premium)
       │
       ▼
7. Render Preview
   │
   ├─ Inject blocks into preview panel
   ├─ Handle render errors
   └─ Show "Fix This" button on error
       │
       ▼
8. User Review
   │
   ├─ Refine (go back to step 1)
   └─ Post (continue to step 9)
       │
       ▼
9. Save to Database
   │
   ├─ Check monthly post limit
   ├─ Store content as JSONB
   ├─ Store chat_history
   ├─ Auto-generate tags
   └─ Set visibility (public/private)
       │
       ▼
10. Display in Feed
    │
    └─ Appears in user's profile
    └─ Appears in public feed (if public)
```

### State Management

**Global state in each page:**

```javascript
// create.html
let isGenerating = false
let currentVibeContent = []
let currentTags = []
let currentUser = null
let lastUserMessage = ''
let chatHistory = []
let currentPlan = null
let errorTracker = {
  lastError: null,
  consoleErrors: [],
  renderErrors: []
}

// app.html
let currentUser = null
let currentView = 'feed'
let feedVibes = []
let currentPage = 1
let hasMore = true

// vibe.html
let currentVibe = null
let comments = []
let currentUser = null
```

**No framework, just vanilla JS:**
- Manual DOM updates
- Event listeners for interactivity
- LocalStorage for preferences
- Supabase for persistence

### Security Layers

**1. Client-Side Sanitization**

```javascript
// Remove dangerous block properties
function sanitizeBlock(block) {
  const sanitized = { ...block }

  // Remove code execution capabilities
  delete sanitized.action
  delete sanitized.onClick
  delete sanitized.init
  delete sanitized.watch

  // Sanitize all strings
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key])
    }
  }

  return sanitized
}

function sanitizeString(str) {
  return str
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}
```

**2. Database RLS (Server-Side)**

All CRUD operations go through Supabase RLS:

```javascript
// Example: User can only see their own notifications
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)  // RLS enforces this automatically
```

**3. P5.js Sandboxing**

```javascript
// Runs in sandboxed iframe
const iframe = document.createElement('iframe')
iframe.sandbox = 'allow-scripts'  // No allow-same-origin!
iframe.srcdoc = `
  <!DOCTYPE html>
  <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/p5@1.7.0/lib/p5.min.js"></script>
    </head>
    <body>
      <script>${sanitizedCode}</script>
    </body>
  </html>
`
```

**4. API Key Security**

- API keys in `supabase-config.js` (not committed)
- Supabase RLS prevents unauthorized access
- Anthropic API key rate-limited on server
- Consider backend proxy for production

---

## API Reference

See `vibefeed/js/supabase.js` for complete implementation.

### Authentication

```javascript
// Sign up
const { user, error } = await api.auth.signUp('email@example.com', 'password')

// Sign in
const { user, error } = await api.auth.signIn('email@example.com', 'password')

// Sign out
await api.auth.signOut()

// Get current user
const user = await api.auth.getUser()

// Reset password
await api.auth.resetPassword('email@example.com')
```

### Vibes CRUD

```javascript
// Create vibe
const vibe = await api.vibes.create({
  content: [{ type: 'hero', headline: 'Hello!' }],
  tags: ['greeting', 'example'],
  is_public: true,
  chat_history: [...]
})

// Get vibe by ID
const vibe = await api.vibes.getById('uuid')

// Get user's vibes
const vibes = await api.vibes.getUserVibes('user-uuid')

// Get feed (paginated)
const vibes = await api.vibes.getFeed(20, 0)  // limit, offset

// Update vibe
await api.vibes.update('vibe-uuid', {
  content: [...],
  tags: [...]
})

// Delete vibe
await api.vibes.delete('vibe-uuid')
```

### Likes

```javascript
// Toggle like
await api.likes.toggle('vibe-uuid')

// Get like count
const count = await api.likes.count('vibe-uuid')

// Check if user liked
const hasLiked = await api.likes.hasLiked('vibe-uuid', 'user-uuid')
```

### Comments

```javascript
// Add comment
await api.comments.create('vibe-uuid', 'Great vibe!')

// Get comments for vibe
const comments = await api.comments.getForVibe('vibe-uuid')

// Delete comment
await api.comments.delete('comment-uuid')
```

### Follows

```javascript
// Follow user
await api.follows.follow('user-uuid')

// Unfollow user
await api.follows.unfollow('user-uuid')

// Check follow status
const isFollowing = await api.follows.isFollowing('follower-uuid', 'following-uuid')

// Get followers
const followers = await api.follows.getFollowers('user-uuid')

// Get following
const following = await api.follows.getFollowing('user-uuid')
```

### User Management

```javascript
// Get user by ID
const user = await api.users.getById('uuid')

// Get user by username
const user = await api.users.getByUsername('johndoe')

// Update profile
await api.users.update('uuid', {
  display_name: 'John Doe',
  bio: 'I love creating vibes!'
})

// Search users
const users = await api.users.search('john')
```

### Plan Management

```javascript
// Get user's plan
const plan = await api.plans.get('user-uuid')

// Update plan
await api.plans.update('user-uuid', 'premium')

// Check if can create vibe
const canCreate = await api.plans.canCreateVibe()  // Checks daily limit

// Check if can post vibe
const canPost = await api.plans.canPostVibe()  // Checks monthly limit

// Increment generation count
await api.plans.incrementGeneration()
```

### Notifications

```javascript
// Get notifications for user
const notifications = await api.notifications.getForUser('user-uuid')

// Mark as read
await api.notifications.markAsRead('notification-uuid')

// Create notification (internal use)
await api.notifications.create({
  user_id: 'uuid',
  type: 'like',
  message: 'User liked your vibe',
  link: '/vibe/uuid'
})
```

---

## Deployment

### Option 1: Netlify (Recommended)

**Pros:**
- Free tier generous
- Auto HTTPS
- Instant deployments
- Git integration

**Steps:**

```bash
# 1. Create netlify.toml
cat > netlify.toml << 'EOF'
[build]
  publish = "vibefeed"
  command = "echo 'No build needed'"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF

# 2. Deploy
npx netlify-cli deploy --prod

# 3. Set environment variables in Netlify UI
# Settings → Build & Deploy → Environment
# Add SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY
```

### Option 2: Vercel

```bash
# 1. Create vercel.json
cat > vercel.json << 'EOF'
{
  "buildCommand": "echo 'No build'",
  "outputDirectory": "vibefeed",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
EOF

# 2. Deploy
npx vercel --prod

# 3. Set env vars in Vercel dashboard
```

### Option 3: GitHub Pages

**Limitation:** GitHub Pages doesn't support client-side routing well, so use hash routing.

```bash
# 1. Enable GitHub Pages in repo settings
# Settings → Pages → Source: main branch

# 2. Add base path to links
# Update all href="/" to href="/repo-name/"

# 3. Push to main
git push origin main

# Site will be at: https://username.github.io/repo-name/
```

### Option 4: Self-Hosted

**Requirements:**
- Web server (nginx, Apache, Caddy)
- HTTPS certificate
- Node.js (optional, for running local server)

**Nginx configuration:**

```nginx
server {
  listen 80;
  server_name vibefeed.example.com;
  root /var/www/vibefeed;
  index index.html;

  # SPA routing
  location / {
    try_files $uri $uri/ /index.html;
  }

  # CORS headers (if needed)
  add_header Access-Control-Allow-Origin *;
}
```

### Environment Variables

**For production, use environment variables instead of config file:**

```javascript
// Update js/supabase.js to use env vars
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || window.SUPABASE_CONFIG?.url
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || window.SUPABASE_CONFIG?.anonKey
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || window.ANTHROPIC_API_KEY
```

**Set in deployment platform:**

- Netlify: Settings → Environment Variables
- Vercel: Settings → Environment Variables
- GitHub Actions: Secrets

---

## Development Workflow

### Local Development

```bash
# No build needed, just open in browser
python3 -m http.server 8000
# or
npx serve vibefeed

# Open http://localhost:8000
```

### Testing

**Manual testing checklist:**

- [ ] Sign up new user
- [ ] Create vibe with AI
- [ ] Edit profile
- [ ] Like/unlike vibes
- [ ] Comment on vibes
- [ ] Follow/unfollow users
- [ ] Check notifications
- [ ] Remix vibe
- [ ] Test error recovery ("Fix This" button)
- [ ] Upgrade to premium
- [ ] Test generation limits
- [ ] Test post limits
- [ ] Test P5.js blocks (premium)

**Browser testing:**

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Debugging

**Enable debug mode:**

```javascript
// Add to any page
window.DEBUG = true

// Logs all API calls
console.log('API call:', method, endpoint, data)
```

**Common issues:**

| Issue | Solution |
|-------|----------|
| CORS errors | Check Supabase CORS settings, enable `*` for local dev |
| Auth errors | Verify anon key, check RLS policies |
| Generation fails | Check Anthropic API key, verify rate limits |
| Vibes don't render | Check console for errors, verify block types |
| Notifications not showing | Check polling interval, verify database triggers |

---

## Troubleshooting

### Database Issues

**Problem:** "relation does not exist"

```sql
-- Check if table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- If missing, re-run schema.sql
```

**Problem:** "permission denied for table"

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

**Problem:** "new row violates row-level security policy"

```sql
-- Check if user is authenticated
SELECT auth.uid();  -- Should return UUID, not null

-- Verify policy allows operation
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### AI Generation Issues

**Problem:** "Generation failed"

- Check Anthropic API key is valid
- Verify not hitting rate limits (5/min free tier)
- Check network connection
- Look for errors in browser console

**Problem:** "Invalid JSON response"

- AI sometimes generates malformed JSON
- Streaming parser should auto-fix
- Use "Fix This" button to retry

**Problem:** "Blocks not rendering"

- Check block types are allowed
- Verify not exceeding block limit (2 free, 5 premium)
- Look for sanitization warnings in console

### Performance Issues

**Problem:** Feed loads slowly

```javascript
// Implement pagination
const vibes = await api.vibes.getFeed(10, page * 10)

// Add infinite scroll
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    loadMoreVibes()
  }
})
```

**Problem:** Rendering lags

- Reduce block complexity
- Limit P5.js sketches per page
- Use lazy loading for images

---

## Contributing

### Code Style

**JavaScript:**
- 2-space indentation
- Semicolons required
- `const` over `let`, avoid `var`
- Descriptive variable names
- Comments for complex logic

**HTML:**
- 2-space indentation
- Semantic elements
- Accessibility attributes (aria-*)

**SQL:**
- UPPERCASE keywords
- Snake_case identifiers
- Proper indexing

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes
4. Test thoroughly
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open Pull Request

### Areas for Contribution

**High Priority:**
- [ ] Backend API proxy (hide API keys)
- [ ] Real-time notifications (WebSockets)
- [ ] Remix chain visualization
- [ ] Search improvements
- [ ] Mobile app (PWA)

**Medium Priority:**
- [ ] Component marketplace
- [ ] Analytics dashboard
- [ ] Export functionality
- [ ] Visual editor
- [ ] Multi-language support

**Nice to Have:**
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements
- [ ] Performance optimizations
- [ ] Documentation improvements

---

## Resources

**Documentation:**
- [Supabase Docs](https://supabase.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [DeclarativeWeb Guide](../DEVELOPER_GUIDE.md)

**Community:**
- GitHub Issues (bug reports)
- GitHub Discussions (feature requests)
- Discord (coming soon)

**Tools:**
- [Supabase Studio](https://app.supabase.com) - Database management
- [Anthropic Console](https://console.anthropic.com) - API keys and usage
- [JSON Validator](https://jsonlint.com) - Validate JSON

---

**Ready to build? Start with `vibefeed/README.md` for quick setup!**
