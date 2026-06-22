# Vibe UX Platform - Ideation Spec

> A platform where anyone can "vibe" mini web apps into existence using natural language, then publish and share them.

## Vision

**"The TikTok of web apps"** - Short-form, shareable, remixable micro-applications created through conversation with AI.

Transform DeclarativeWeb from a framework into a **social platform for creating and sharing interactive experiences**.

---

## Core Concepts

### What is a "Vibe"?

A **Vibe** is a self-contained, shareable mini web application:
- Created through natural language conversation with AI
- Renders using DeclarativeWeb JSON
- Embeddable, linkable, remixable
- Examples:
  - A quiz about 90s music
  - An interactive recipe card
  - A mood tracker
  - A mini calculator
  - A portfolio snippet
  - A poll/voting widget
  - An interactive story

### Key Differentiators

| Traditional No-Code | Vibe Platform |
|---------------------|---------------|
| Drag-and-drop UI | Conversational creation |
| Complex interfaces | Just describe what you want |
| Desktop-first | Mobile-first, social-native |
| Apps are products | Vibes are content |
| Built to scale | Built to share |

---

## Platform Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VIBE PLATFORM                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│    CREATOR      │    GALLERY      │         SOCIAL              │
│                 │                 │                             │
│  - Chat UI      │  - Browse       │  - User profiles            │
│  - Live preview │  - Search       │  - Follow creators          │
│  - Version ctrl │  - Categories   │  - Like/save vibes          │
│  - Templates    │  - Trending     │  - Comments                 │
│  - Publish flow │  - Collections  │  - Remix tracking           │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CORE SERVICES                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ AI Chat  │  │  Vibe    │  │  Auth    │  │   Embed/Share    │ │
│  │ Service  │  │  Storage │  │  Service │  │   Service        │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DECLARATIVEWEB ENGINE                         │
│        (render.js + streaming + state management)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Flows

### 1. Create a Vibe

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  User: "Make me a quiz about dog breeds with 5 questions"       │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AI generates blocks in real-time            │   │
│  │              User sees live preview streaming            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│  User: "Add a timer, make it 30 seconds per question"           │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        AI patches existing vibe with new features        │   │
│  │        Only changed blocks update (smooth UX)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                       │
│                         ▼                                       │
│                    [Publish]                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Discover & Remix

```
┌─────────────────────────────────────────────────────────────────┐
│                      GALLERY VIEW                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Quiz    │  │ Tracker │  │ Poll    │  │ Story   │            │
│  │ Preview │  │ Preview │  │ Preview │  │ Preview │            │
│  │         │  │         │  │         │  │         │            │
│  │ @alice  │  │ @bob    │  │ @carol  │  │ @dave   │            │
│  │ 1.2k ❤️  │  │ 892 ❤️   │  │ 3.4k ❤️  │  │ 567 ❤️   │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
│  User clicks "Remix" on Quiz                                    │
│                         │                                       │
│                         ▼                                       │
│  Opens in Creator with full conversation context                │
│  User: "Change this to be about cats instead"                   │
│                         │                                       │
│                         ▼                                       │
│  New vibe created, linked as "remix of @alice's Quiz"           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Share & Embed

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHARE OPTIONS                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  🔗 vibe.app/v/abc123                    [Copy]         │   │
│  │                                                         │   │
│  │  📱 Share to:  [Twitter] [Reddit] [Discord] [Copy]      │   │
│  │                                                         │   │
│  │  </> Embed:                                             │   │
│  │  <iframe src="vibe.app/embed/abc123"></iframe>         │   │
│  │                                                         │   │
│  │  📦 Export:  [Download JSON] [Export HTML] [CodePen]    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Breakdown

### Phase 1: Core Platform (MVP)

#### 1.1 Enhanced Creator (build on chat.html)
- [ ] Polish mobile UI
- [ ] Add "Fork from template" starter flow
- [ ] Implement proper error recovery ("That didn't work, try...")
- [ ] Add undo/redo (version history already exists)
- [ ] Keyboard shortcuts (Cmd+Enter to send, etc.)

#### 1.2 Vibe Storage & URLs
- [ ] Unique vibe IDs (`/v/{shortId}`)
- [ ] Store vibes: JSON + metadata + conversation history
- [ ] Public/private/unlisted visibility
- [ ] Version snapshots (every publish = new version)

#### 1.3 Basic Sharing
- [ ] Shareable URLs with OpenGraph previews
- [ ] URL-encoded sharing (already partially implemented)
- [ ] QR code generation
- [ ] Basic embed iframe support

#### 1.4 Authentication
- [ ] Social login (Google, GitHub, Discord)
- [ ] Anonymous creation with "claim" flow
- [ ] Basic user profiles

### Phase 2: Social Layer

#### 2.1 Gallery & Discovery
- [ ] Browse all public vibes
- [ ] Category/tag taxonomy
- [ ] Search (by title, description, tags)
- [ ] Trending algorithm (likes + views + recency)
- [ ] Featured/curated collections

#### 2.2 User Profiles
- [ ] Public profile page (`/@username`)
- [ ] Avatar, bio, links
- [ ] Grid of user's vibes
- [ ] Stats (total likes, vibes created, etc.)

#### 2.3 Social Interactions
- [ ] Like/heart vibes
- [ ] Save to personal collection
- [ ] Follow creators
- [ ] Activity feed
- [ ] Comments (simple, moderated)

#### 2.4 Remix System
- [ ] Fork any public vibe
- [ ] Remix attribution chain
- [ ] "Remixed from" links
- [ ] Remix count on original

### Phase 3: Advanced Features

#### 3.1 Templates & Starters
- [ ] Official template gallery
- [ ] Community templates
- [ ] "Use this template" one-click start
- [ ] Template categories (quiz, poll, tracker, game, etc.)

#### 3.2 Custom Domains & Pro Features
- [ ] Custom subdomain (`myquiz.vibe.app`)
- [ ] Custom domain mapping
- [ ] Remove branding
- [ ] Analytics dashboard
- [ ] Higher API limits

#### 3.3 Collaboration
- [ ] Shared vibes with multiple editors
- [ ] Real-time collaborative editing
- [ ] Team workspaces

#### 3.4 API & Integrations
- [ ] Public API for vibe CRUD
- [ ] Webhooks (on view, on interaction)
- [ ] Zapier/Make integration
- [ ] Discord bot for creating vibes

---

## Data Model

```typescript
interface Vibe {
  id: string                    // Short unique ID (nanoid)
  slug: string                  // URL-friendly name
  title: string                 // Display title
  description: string           // Short description

  // Content
  blocks: Block[]               // DeclarativeWeb JSON
  conversation: Message[]       // Chat history that created it

  // Metadata
  author: User
  visibility: 'public' | 'unlisted' | 'private'
  tags: string[]
  category: Category

  // Versioning
  version: number
  parentVibeId?: string         // If remixed

  // Stats
  views: number
  likes: number
  remixes: number

  // Timestamps
  createdAt: Date
  updatedAt: Date
  publishedAt: Date
}

interface User {
  id: string
  username: string              // Unique, URL-safe
  displayName: string
  avatar: string
  bio: string
  links: { label: string, url: string }[]

  // Stats
  vibesCreated: number
  totalLikes: number
  followers: number
  following: number

  // Settings
  plan: 'free' | 'pro'
  customDomain?: string
}

interface Category {
  id: string
  name: string                  // e.g., "Quiz", "Poll", "Game"
  icon: string
  color: string
}
```

---

## Technical Considerations

### Hosting Strategy

**Option A: Serverless (Recommended for MVP)**
- Netlify/Vercel for frontend + functions
- Supabase for database + auth + storage
- Edge functions for vibe rendering

**Option B: Full Stack**
- Next.js or Remix on Vercel
- PostgreSQL (Neon/Supabase)
- S3/R2 for assets

### AI Integration

Current: Anthropic API via Netlify Function

Future options:
- Add OpenAI/Gemini as alternatives
- Implement usage quotas per user
- Cache common responses
- Fine-tune for better DeclarativeWeb output

### Performance

- Vibes are static JSON - highly cacheable
- Edge rendering for embeds
- Lazy load heavy components (mermaid, charts)
- Progressive enhancement for complex vibes

### Security

- Sanitize all HTML output (already in DeclarativeWeb)
- Rate limit AI calls
- Content moderation (automated + flagging)
- XSS prevention in embeds
- CSP headers for iframe embeds

---

## Monetization Ideas

### Free Tier
- Unlimited public vibes
- Basic templates
- Standard AI model (Haiku)
- Watermark on embeds

### Pro Tier ($X/month)
- Private vibes
- Premium AI models (Sonnet/Opus)
- Custom domains
- No watermark
- Analytics
- Priority support

### Enterprise
- Team workspaces
- SSO
- SLA
- Dedicated support

---

## Naming Ideas

| Name | Domain Availability | Vibe |
|------|---------------------|------|
| Vibe | vibe.app | Social, casual |
| Vibes.new | vibes.new | Google-style action URL |
| MiniVibe | minivibe.com | Small, contained |
| QuickVibe | quickvibe.app | Fast, easy |
| VibeSpace | vibespace.io | Community feel |
| VibeLab | vibelab.io | Creative, experimental |
| MakeVibe | makevibe.com | Action-oriented |

---

## Success Metrics

### North Star: Weekly Active Creators
Users who create or remix at least one vibe per week

### Supporting Metrics
- Vibes created per day
- Remix rate (% of views that become remixes)
- Share rate (% of vibes shared)
- Embed count
- Time to first vibe (onboarding)
- Return creator rate (7-day, 30-day)

---

## Competitive Landscape

| Product | Similarity | Differentiation |
|---------|-----------|-----------------|
| CodePen | High (embeddable web snippets) | We're AI-first, no code needed |
| Glitch | Medium (remix culture) | We're simpler, more focused |
| Notion | Low (flexible content) | We're interactive, not docs |
| Typeform | Medium (forms/quizzes) | We're broader, more creative |
| TikTok | Conceptual (social content) | We're web apps, not video |

---

## Open Questions

1. **Identity**: Is this a tool, a platform, or a social network?
2. **Content policy**: What vibes are not allowed?
3. **AI costs**: How to manage API costs at scale?
4. **Moderation**: Human review or automated?
5. **Mobile app**: Native app or PWA?
6. **Offline**: Should vibes work offline?
7. **Analytics**: What data to show creators?

---

## Next Steps

1. **Validate demand**: Share chat.html, gather feedback
2. **Prototype gallery**: Static page with example vibes
3. **Build auth**: Simple social login
4. **Add persistence**: Save vibes to database
5. **Launch beta**: Limited creator access
6. **Iterate**: Based on usage patterns

---

## Appendix: Example Vibe Categories

### Entertainment
- Quizzes & Trivia
- Personality tests
- Mini games
- Choose-your-own-adventure
- Polls & voting

### Productivity
- Calculators
- Converters
- Checklists
- Trackers (habit, mood, etc.)
- Decision makers

### Creative
- Interactive stories
- Art generators
- Meme makers
- Music explorers
- Color palettes

### Business
- Lead capture forms
- Product showcases
- Pricing calculators
- Contact forms
- FAQ widgets

### Education
- Flashcards
- Study guides
- Interactive diagrams
- Concept explainers
- Practice problems

---

*This document is a living spec. Last updated: January 2026*
