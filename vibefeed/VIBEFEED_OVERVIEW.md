# VibeFeed: Social Network Documentation

**The TikTok of web apps - Create, share, and remix interactive experiences through AI**

---

## What is VibeFeed?

VibeFeed is a **social platform for creating and sharing interactive web components** (called "vibes"). Think of it as a hybrid between:
- **TikTok** - Short-form, scrollable content with social features
- **CodePen** - Shareable web components and code
- **Instagram** - Visual feed with likes, comments, and follows
- **ChatGPT** - AI-powered creation through conversation

Built on top of DeclarativeWeb, VibeFeed demonstrates how JSON-based web components can be **created by AI, shared socially, and remixed by others** - all without writing code.

---

## Vision & Philosophy

### The Big Idea

**Democratize web development through AI-powered creativity.**

Traditional web development requires:
- Learning HTML, CSS, JavaScript
- Understanding frameworks and build tools
- Hours of debugging and iteration
- Technical expertise to create anything interactive

VibeFeed removes these barriers by letting users:
1. **Describe what they want** in plain English
2. **AI generates the component** in real-time
3. **Preview and refine** through conversation
4. **Publish and share** instantly
5. **Others discover and remix** your creations

### Core Principles

**1. Conversation-First Creation**
Users don't write code - they chat with AI to describe their vision. The AI generates DeclarativeWeb JSON blocks that render instantly.

**2. Social by Default**
Every vibe is shareable, likeable, and remixable. Discover trending vibes, follow creators, get notified of activity.

**3. Safe AI Generation**
All AI-generated content is sanitized and sandboxed. No XSS attacks, no malicious code - just safe, declarative components.

**4. Freemium Model**
Free tier for casual users, premium for power users:
- **Free**: 10 generations/day, 30 posts/month, basic blocks
- **Premium**: 100 generations/day, 350 posts/month, advanced blocks (p5.js)

**5. Attribution & Remixing**
When you remix someone's vibe, they get credit. Discovery is built on a graph of remixes and inspirations.

---

## Key Features

### 1. AI-Powered Creation (`/create`)

**How it works:**
- User describes what they want (text or image upload)
- Claude AI streams JSON blocks in real-time
- Preview updates live as JSON is generated
- User can refine through follow-up messages
- AI remembers conversation context

**Example conversation:**
```
User: "Create a quiz about space exploration with 3 questions"

AI: *generates quiz block with questions*

User: "Make it harder and add a scoring system"

AI: *refines quiz with harder questions and score display*

User: "Add a rocket animation when they pass"

AI: *adds hero block with celebration message*
```

**Supported Block Types:**
- **Free users**: markdown, hero, section, table, mermaid, frappe-chart, quiz, button
- **Premium users**: All free blocks + p5.js (creative coding)

**Generation Limits:**
- Free: 10 generations/day
- Premium: 100 generations/day

### 2. Social Feed (`/app`)

**Feed View:**
- Infinite scroll feed of vibes
- Like, comment, and share actions
- User avatars and attribution
- "Remixed from" attribution chain
- Real-time rendering of all block types

**Discover Page:**
- Browse by trending tags
- See popular vibes
- Filter by block type
- Search functionality

**Profile Pages:**
- User's published vibes
- Follower/following counts
- Bio and avatar
- Activity history

### 3. Individual Vibe Pages (`/vibe`)

**Features:**
- Full vibe rendering with all blocks
- Comments section
- Like counter
- Share button (embeds, social media)
- Remix button (fork to your account)
- Author attribution

**Privacy Controls:**
- Public vibes (appear in feed)
- Private vibes (only you can see)

### 4. User System

**Authentication (Supabase):**
- Email/password signup and login
- Password reset flow
- Email verification
- Secure session management

**User Profiles:**
- Username (unique)
- Display name
- Bio (max 500 chars)
- Avatar URL
- Plan tier (free/premium)

**Onboarding:**
- Welcome message explaining the platform
- Plan selection (free or premium)
- Profile setup
- First vibe creation walkthrough

### 5. Freemium Tier System

**Free Plan:**
- 10 generations per day
- 30 published vibes per month
- Basic block types (8 types)
- Max 2 blocks per vibe
- All social features

**Premium Plan:**
- 100 generations per day
- 350 published vibes per month
- All block types including p5.js
- Max 5 blocks per vibe
- Priority support
- Early access to new features

**Billing:**
- Monthly subscription
- Stripe integration (placeholder for future)
- Usage tracking dashboard
- Auto-reset at midnight (generations) and monthly (posts)

### 6. Social Features

**Likes:**
- One like per user per vibe
- Like counter display
- Unlike functionality
- Real-time updates

**Comments:**
- Threaded comments (future)
- Rich text support
- Edit/delete own comments
- Moderation tools

**Follows:**
- Follow/unfollow users
- Follower count display
- Following feed (future feature)
- Mutual follow detection

**Notifications:**
- New follower alerts
- Comment notifications
- Like notifications
- New post from followed users
- Real-time delivery (polling)

**Remixing:**
- Fork any public vibe to your account
- Attribution to original creator
- Remix chain visualization (future)
- Discover remix networks

### 7. Error Recovery (NEW)

**Problem:** AI-generated vibes sometimes fail to render due to:
- Invalid JSON structure
- Unsupported block properties
- P5.js code errors
- Missing required fields

**Solution:**
When rendering fails, users see:
- Clear error message in chat
- Error details in preview panel
- **"Fix This" button** that automatically:
  - Captures console errors
  - Records failed block details
  - Sends debug report to AI
  - Requests a fix through conversation

**Example:**
```
[Error in chat]: Render error: p5js: ReferenceError: createCanvas is not defined

[User clicks "Fix This"]

[Auto-generated message]:
"Oops! that doesn't work, please fix:

Error: Render error: p5js: ReferenceError: createCanvas is not defined

Console Errors:
- [2026-01-17T10:30:45Z] Error rendering block: ReferenceError: createCanvas is not defined

Render Errors:
- Block Type: p5js, Error: ReferenceError: createCanvas is not defined

Current Vibe Content:
[JSON of the failed blocks]

Last Request: Add a bouncing ball animation"

[AI automatically fixes the p5.js code]
```

---

## User Journeys

### Journey 1: New User Creates First Vibe

1. **Land on homepage** (`/index.html`)
   - See hero explaining VibeFeed
   - Click "Get Started"

2. **Sign up** (`/login.html`)
   - Enter email and password
   - Verify email
   - Redirect to onboarding

3. **Onboarding** (`/onboarding.html`)
   - Choose plan (Free or Premium)
   - Set username, display name, bio
   - Upload avatar (optional)

4. **Create first vibe** (`/create.html`)
   - See welcome message and examples
   - Type: "Create a quiz about movies"
   - Watch AI generate quiz in real-time
   - Refine: "Add a meme when they get 100%"
   - Preview looks good → Click "Post!"

5. **See in feed** (`/app.html`)
   - Vibe appears in "My Vibes"
   - Can share, edit, or delete

### Journey 2: Discover and Remix

1. **Browse feed** (`/app.html`)
   - Scroll through public vibes
   - See interesting data visualization
   - Click to open full view

2. **View vibe** (`/vibe.html`)
   - See frappe-chart showing climate data
   - Like the vibe
   - Leave comment: "Great visualization!"
   - Click "Remix"

3. **Remix in create** (`/create.html`)
   - Original vibe loads as starting point
   - Add message: "Add a table showing the raw data"
   - AI adds table block below chart
   - Customize colors and title
   - Post as new vibe with attribution

4. **Original creator gets notified**
   - "User123 remixed your vibe: Climate Data Chart"

### Journey 3: Premium User Creates P5.js Sketch

1. **Upgrade to premium** (`/app.html` → Settings → Billing)
   - See premium features
   - Subscribe ($X/month)
   - Plan updated instantly

2. **Create advanced vibe** (`/create.html`)
   - Type: "Create a generative art piece with colorful circles"
   - AI generates p5.js sketch
   - Preview shows animated canvas
   - Refine: "Make circles move in waves"
   - AI updates sketch code
   - Post to feed

3. **Vibe gets popular**
   - Appears in trending
   - Gets 50+ likes
   - Multiple remixes
   - Followers increase

---

## Technical Overview

### Architecture

**Frontend:** Pure HTML/CSS/JavaScript
- No framework dependencies
- DeclarativeWeb for vibe rendering
- Pico CSS for styling
- Lucide icons

**Backend:** Supabase (BaaS)
- PostgreSQL database
- Row-level security (RLS)
- Real-time subscriptions
- Authentication service
- Storage (avatars, future)

**AI Integration:** Claude API (Anthropic)
- Streaming completions
- JSON mode for structured output
- System prompts optimized for DeclarativeWeb
- Error recovery through conversation

**Deployment:**
- Static site hosting (Netlify, Vercel, GitHub Pages)
- Supabase cloud (database + auth)
- CDN for assets

### Database Schema

**8 core tables:**

1. **users** - User profiles and settings
   - id (uuid, primary key)
   - username (unique)
   - display_name
   - bio
   - avatar_url
   - created_at

2. **vibes** - Published content
   - id (uuid)
   - user_id (foreign key)
   - content (jsonb) - DeclarativeWeb blocks
   - tags (text[])
   - is_public (boolean)
   - chat_history (jsonb) - Conversation with AI
   - parent_vibe_id (for remixes)
   - created_at

3. **likes** - Like tracking
   - id (uuid)
   - vibe_id (foreign key)
   - user_id (foreign key)
   - created_at
   - Unique constraint: (vibe_id, user_id)

4. **comments** - Comments on vibes
   - id (uuid)
   - vibe_id (foreign key)
   - user_id (foreign key)
   - content (text)
   - created_at
   - updated_at

5. **follows** - User relationships
   - id (uuid)
   - follower_id (user who follows)
   - following_id (user being followed)
   - created_at
   - Unique constraint: (follower_id, following_id)

6. **user_plans** - Subscription management
   - id (uuid)
   - user_id (foreign key, unique)
   - plan ('free' or 'premium')
   - stripe_customer_id (nullable)
   - stripe_subscription_id (nullable)
   - created_at
   - updated_at

7. **generation_usage** - Daily generation tracking
   - id (uuid)
   - user_id (foreign key)
   - date (date)
   - count (integer)
   - Unique constraint: (user_id, date)

8. **notifications** - Activity alerts
   - id (uuid)
   - user_id (recipient)
   - type ('like', 'comment', 'follow', 'new_post')
   - message (text)
   - link (text, nullable)
   - read (boolean, default false)
   - created_at

### Security Model

**1. Content Sanitization**
```javascript
// Remove dangerous block properties
- action, onClick, onAction (prevent code execution)
- if, then, else (prevent conditional exploits)
- init, watch (prevent initialization exploits)

// Sanitize strings
- Remove javascript: protocol
- Remove data:text/html
- Strip <script> tags
```

**2. Block Type Filtering**
```javascript
// Free users
ALLOWED_TYPES = ['markdown', 'hero', 'section', 'table',
                 'mermaid', 'frappe-chart', 'quiz', 'button']

// Premium users
ALLOWED_TYPES = [...FREE_TYPES, 'p5js']
```

**3. P5.js Sandboxing**
- Runs in sandboxed iframe
- No parent window access
- No same-origin capabilities
- Can't access cookies or localStorage

**4. Row-Level Security (RLS)**
```sql
-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE USING (auth.uid() = id);

-- Only see public vibes or own vibes
CREATE POLICY "Public vibes are viewable by all"
ON vibes FOR SELECT USING (is_public OR user_id = auth.uid());

-- Can only delete own vibes
CREATE POLICY "Users can delete own vibes"
ON vibes FOR DELETE USING (user_id = auth.uid());
```

**5. API Rate Limiting**
- Generation limits enforced server-side
- Daily reset at midnight UTC
- Monthly post limits
- Prevents abuse

### File Structure

```
vibefeed/
├── index.html              # Landing page
├── login.html              # Auth (login/signup)
├── logout.html             # Logout handler
├── forgot-password.html    # Password reset
├── onboarding.html         # New user setup
├── app.html                # Main application (feed, discover, profile)
├── create.html             # AI-powered vibe creation
├── vibe.html               # Individual vibe view
├── profile.html            # User profile pages
├── 404.html                # Not found page
├── js/
│   └── supabase.js        # API wrapper (944 lines)
├── supabase/
│   └── schema.sql         # Database schema (307 lines)
└── README.md              # Setup guide (this will be created)
```

---

## Page Breakdown

### `/index.html` - Landing Page
- Hero section explaining VibeFeed
- Feature showcase
- Example vibes
- CTA to sign up

### `/login.html` - Authentication
- Login form (email/password)
- Signup form (email/password)
- Password reset link
- Social login (future)

### `/app.html` - Main Application (2340 lines)
**Four main views:**

1. **Feed** - Scrollable vibe feed
   - Infinite scroll
   - Like/comment inline
   - User avatars
   - Remix attribution

2. **Discover** - Explore content
   - Trending tags (cloud visualization)
   - Popular vibes by tag
   - Search functionality

3. **Profile** - User pages
   - User info (avatar, bio, stats)
   - Published vibes grid
   - Follow/unfollow button
   - Edit profile (own profile only)

4. **Settings** - Account management
   - Profile editing
   - Billing/plan management
   - Usage statistics
   - Logout

### `/create.html` - AI Creation Interface (1833 lines)
**Layout:**
- **Left panel**: Chat interface
  - Message history
  - Image upload support
  - Streaming AI responses
  - Error messages with "Fix This" button

- **Right panel**: Live preview
  - Real-time vibe rendering
  - Error display with recovery
  - Auto-generated tags
  - Visibility toggle (public/private)

**Workflow:**
1. User sends message (text or image)
2. Check generation limits
3. Stream to Claude API
4. Parse JSON incrementally
5. Sanitize blocks
6. Render preview
7. Allow refinement or posting

### `/vibe.html` - Individual Vibe (750 lines)
**Components:**
- Vibe metadata (author, date)
- Full content rendering
- Like button and count
- Comments section
- Share button (copy link, embed code)
- Remix button
- Report/flag (future)

### `/profile.html` - Public Profiles
- View any user's profile
- Their published vibes
- Follower/following counts
- Follow/unfollow action

### `/onboarding.html` - First-Time Setup
- Welcome message
- Plan selection (free vs premium)
- Profile creation (username, bio, avatar)
- Skip option to app

---

## API & Functions (`js/supabase.js`)

**Authentication:**
- `auth.signUp(email, password)`
- `auth.signIn(email, password)`
- `auth.signOut()`
- `auth.resetPassword(email)`
- `auth.getSession()`
- `auth.getUser()`

**Vibes:**
- `vibes.create(data)` - Create new vibe
- `vibes.getById(id)` - Get single vibe
- `vibes.getUserVibes(userId)` - Get user's vibes
- `vibes.getFeed(limit, offset)` - Paginated feed
- `vibes.getByTag(tag)` - Filter by tag
- `vibes.update(id, data)` - Update vibe
- `vibes.delete(id)` - Delete vibe

**Likes:**
- `likes.toggle(vibeId)` - Like/unlike
- `likes.count(vibeId)` - Get like count
- `likes.hasLiked(vibeId, userId)` - Check if liked

**Comments:**
- `comments.create(vibeId, content)` - Add comment
- `comments.getForVibe(vibeId)` - Get all comments
- `comments.delete(id)` - Delete comment

**Follows:**
- `follows.follow(userId)` - Follow user
- `follows.unfollow(userId)` - Unfollow user
- `follows.isFollowing(followerId, followingId)` - Check status
- `follows.getFollowers(userId)` - Get followers
- `follows.getFollowing(userId)` - Get following

**Users:**
- `users.getById(id)` - Get user profile
- `users.getByUsername(username)` - Get by username
- `users.update(id, data)` - Update profile
- `users.search(query)` - Search users

**Plans:**
- `plans.get(userId)` - Get user's plan
- `plans.update(userId, plan)` - Change plan
- `plans.canCreateVibe()` - Check daily limit
- `plans.canPostVibe()` - Check monthly limit
- `plans.incrementGeneration()` - Track usage

**Notifications:**
- `notifications.getForUser(userId)` - Get notifications
- `notifications.markAsRead(id)` - Mark read
- `notifications.create(data)` - Create notification
- `notifications.notifyLike(vibeId, likerId)` - Auto-notify
- `notifications.notifyComment(vibeId, commenterId)` - Auto-notify

---

## Future Roadmap

### Short-Term (Next 3 months)
- [ ] Remix chain visualization
- [ ] Trending algorithm (time-weighted likes)
- [ ] Search improvements (fuzzy search, filters)
- [ ] Notification real-time subscriptions
- [ ] Mobile app (PWA)
- [ ] Export vibes (JSON, standalone HTML)

### Medium-Term (3-6 months)
- [ ] Component marketplace (buy/sell templates)
- [ ] Collaborative editing (shared vibes)
- [ ] Version history and rollback
- [ ] Collections/playlists
- [ ] Vibe analytics (views, engagement)
- [ ] Embed widget (iframe vibes on any site)

### Long-Term (6+ months)
- [ ] Visual editor (drag-and-drop blocks)
- [ ] Custom block types (plugin system)
- [ ] AI model selection (GPT-4, Claude, Gemini)
- [ ] Multi-language support
- [ ] Desktop app (Electron)
- [ ] API for third-party developers

---

## Success Metrics

**User Engagement:**
- Daily active users (DAU)
- Average vibes created per user
- Average time spent on platform
- Remix rate (% of vibes that are remixed)

**Content Quality:**
- Average likes per vibe
- Comment engagement rate
- Error rate (% of vibes that fail to render)
- AI generation success rate

**Monetization:**
- Free to premium conversion rate
- Monthly recurring revenue (MRR)
- Average revenue per user (ARPU)
- Churn rate

**Technical:**
- P95 page load time
- API response times
- Error rates and uptime
- Database query performance

---

## Competitive Analysis

**Similar Platforms:**

| Platform | Focus | Difference from VibeFeed |
|----------|-------|--------------------------|
| **CodePen** | Code sharing | No AI generation, requires coding |
| **Glitch** | Full-stack apps | More complex, steeper learning curve |
| **Observable** | Notebooks | Data science focused, not social |
| **Canva** | Design | Static images, no interactive components |
| **Framer** | Website builder | Drag-and-drop, not AI-first |

**VibeFeed's Unique Position:**
- ✅ AI-first creation (no code required)
- ✅ Social features (likes, follows, remixes)
- ✅ Safe sandboxed execution
- ✅ Instant deployment
- ✅ Attribution and remix culture

---

## Community & Support

**Getting Help:**
- Documentation (this file!)
- GitHub Issues
- Discord community (future)
- Email support for premium users

**Contributing:**
- Report bugs on GitHub
- Suggest features via issues
- Submit pull requests
- Share your best vibes

**Content Guidelines:**
- No hateful or harmful content
- Credit original creators when remixing
- Report inappropriate vibes
- Be respectful in comments

---

**VibeFeed is where creativity meets AI - build the future of web components, one vibe at a time! 🚀**
