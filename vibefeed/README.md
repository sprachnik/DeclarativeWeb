# VibeFeed

**The TikTok of web apps - Create, share, and remix interactive experiences through AI**

VibeFeed is a social platform built on DeclarativeWeb where users create interactive web components (called "vibes") through natural language conversations with AI, then share, discover, and remix them.

---

## 🚀 Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/RenderJS.git
cd RenderJS/vibefeed
```

### 2. Set Up Supabase

**Create a Supabase project:**
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key
3. Open SQL Editor and run `supabase/schema.sql`

**Configure credentials:**

Create `js/supabase-config.js`:

```javascript
window.SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key-here'
}

window.ANTHROPIC_API_KEY = 'your-anthropic-api-key'
```

⚠️ **Add to .gitignore** to keep secrets safe!

### 3. Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Add to `supabase-config.js`

### 4. Open in Browser

```bash
# No build step needed!
python3 -m http.server 8000
# or
npx serve

# Open http://localhost:8000
```

**You're ready!** Sign up, create your first vibe, and start exploring.

---

## 📚 Documentation

### Complete Guides

- **[VIBEFEED_OVERVIEW.md](./VIBEFEED_OVERVIEW.md)** - What is VibeFeed? Features, vision, user journeys
- **[VIBEFEED_DEVELOPER_GUIDE.md](./VIBEFEED_DEVELOPER_GUIDE.md)** - Setup, architecture, deployment, API reference

### Quick Navigation

| I want to... | Read this... |
|--------------|--------------|
| **Understand what VibeFeed is** | [VIBEFEED_OVERVIEW.md](./VIBEFEED_OVERVIEW.md) → [What is VibeFeed?](./VIBEFEED_OVERVIEW.md#what-is-vibefeed) |
| **Set up for development** | [VIBEFEED_DEVELOPER_GUIDE.md](./VIBEFEED_DEVELOPER_GUIDE.md) → [Quick Start](./VIBEFEED_DEVELOPER_GUIDE.md#quick-start) |
| **Deploy to production** | [VIBEFEED_DEVELOPER_GUIDE.md](./VIBEFEED_DEVELOPER_GUIDE.md) → [Deployment](./VIBEFEED_DEVELOPER_GUIDE.md#deployment) |
| **Understand the architecture** | [VIBEFEED_DEVELOPER_GUIDE.md](./VIBEFEED_DEVELOPER_GUIDE.md) → [Architecture Deep Dive](./VIBEFEED_DEVELOPER_GUIDE.md#architecture-deep-dive) |
| **Use the API** | [VIBEFEED_DEVELOPER_GUIDE.md](./VIBEFEED_DEVELOPER_GUIDE.md) → [API Reference](./VIBEFEED_DEVELOPER_GUIDE.md#api-reference) |
| **Troubleshoot issues** | [VIBEFEED_DEVELOPER_GUIDE.md](./VIBEFEED_DEVELOPER_GUIDE.md) → [Troubleshooting](./VIBEFEED_DEVELOPER_GUIDE.md#troubleshooting) |

---

## 🎯 What Can You Build?

VibeFeed demonstrates the power of DeclarativeWeb + AI:

**Interactive Quizzes**
```
User: "Create a trivia quiz about space with 5 questions"
AI: *generates quiz block with questions, answers, and scoring*
```

**Data Visualizations**
```
User: "Show climate change data as a line chart"
AI: *generates frappe-chart with real data*
```

**Creative Coding (Premium)**
```
User: "Create generative art with bouncing circles"
AI: *generates p5.js sketch with animation*
```

**Informational Content**
```
User: "Explain quantum computing with diagrams"
AI: *generates markdown + mermaid diagrams*
```

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Pure HTML/CSS/JavaScript (no framework)
- DeclarativeWeb for component rendering
- Pico CSS for styling
- Lucide icons

**Backend:**
- Supabase (PostgreSQL + Auth + Storage)
- Row-level security (RLS)
- Real-time subscriptions

**AI:**
- Claude API (Anthropic)
- Streaming JSON generation
- Context-aware conversations

### Project Structure

```
vibefeed/
├── index.html              # Landing page
├── login.html              # Authentication
├── app.html                # Main app (feed, discover, profile)
├── create.html             # AI-powered creation
├── vibe.html               # Individual vibe viewer
├── profile.html            # User profiles
├── onboarding.html         # New user setup
├── js/
│   ├── supabase.js        # API wrapper (944 lines)
│   └── supabase-config.js # Credentials (gitignored)
└── supabase/
    └── schema.sql          # Database schema
```

### Database Schema

8 tables with relationships:

```
users (profiles)
  ├── vibes (content)
  │   ├── likes
  │   └── comments
  ├── follows (social graph)
  ├── user_plans (subscriptions)
  ├── generation_usage (rate limiting)
  └── notifications (activity alerts)
```

---

## ✨ Key Features

### 1. AI-Powered Creation
- Chat interface for describing vibes
- Real-time streaming generation
- Image upload support
- Conversation memory (refine iteratively)
- Error recovery with "Fix This" button

### 2. Social Features
- Like and comment on vibes
- Follow users
- Remix with attribution
- Notifications for activity
- Public/private vibes

### 3. Freemium Model
**Free:**
- 10 generations/day
- 30 posts/month
- 8 block types
- Max 2 blocks per vibe

**Premium ($X/month):**
- 100 generations/day
- 350 posts/month
- All block types (including p5.js)
- Max 5 blocks per vibe

### 4. Content Types
- **Markdown** - Rich text
- **Hero** - Headers with CTAs
- **Section** - Card grids
- **Table** - Tabular data
- **Mermaid** - Diagrams
- **Frappe Chart** - Data viz
- **Quiz** - Interactive quizzes
- **P5.js** - Creative coding (premium)

---

## 🔒 Security

**Content Sanitization:**
- Remove dangerous block properties (action, onClick, init)
- Strip XSS vectors (javascript:, <script>)
- Filter allowed block types by plan

**Database Security:**
- Row-level security (RLS) policies
- User can only modify own content
- Private vibes hidden from others

**P5.js Sandboxing:**
- Runs in isolated iframe
- No parent window access
- No cookie access

**API Security:**
- Keys in gitignored config file
- Rate limiting (daily/monthly)
- Supabase auth required

---

## 🚀 Deployment

### Recommended: Netlify

```bash
# Create netlify.toml
cat > netlify.toml << 'EOF'
[build]
  publish = "vibefeed"
  command = "echo 'No build needed'"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
EOF

# Deploy
npx netlify-cli deploy --prod

# Add env vars in Netlify dashboard:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - ANTHROPIC_API_KEY
```

**Other options:**
- Vercel
- GitHub Pages
- Self-hosted (nginx, Apache)

See [VIBEFEED_DEVELOPER_GUIDE.md → Deployment](./VIBEFEED_DEVELOPER_GUIDE.md#deployment) for details.

---

## 🧪 Development

### Local Development

```bash
# Start local server
python3 -m http.server 8000

# Open browser
open http://localhost:8000
```

### Testing Checklist

- [ ] Sign up new user
- [ ] Create vibe with AI
- [ ] Like/comment/share
- [ ] Follow users
- [ ] Test notifications
- [ ] Remix vibe
- [ ] Error recovery ("Fix This")
- [ ] Upgrade to premium
- [ ] Test generation limits

### Debug Mode

```javascript
// Add to browser console
window.DEBUG = true

// Logs all API calls
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **CORS errors** | Enable `*` in Supabase CORS settings for local dev |
| **Auth errors** | Verify Supabase anon key, check RLS policies |
| **AI generation fails** | Check Anthropic API key, verify rate limits |
| **Vibes don't render** | Check console, verify block types allowed |
| **Database errors** | Re-run `schema.sql`, verify RLS enabled |

### Getting Help

1. Check [VIBEFEED_DEVELOPER_GUIDE.md → Troubleshooting](./VIBEFEED_DEVELOPER_GUIDE.md#troubleshooting)
2. Search [GitHub Issues](https://github.com/yourusername/RenderJS/issues)
3. Open new issue with details

---

## 🗺️ Roadmap

**Short-Term (Next 3 months):**
- [ ] Remix chain visualization
- [ ] Trending algorithm
- [ ] Search improvements
- [ ] Real-time notifications
- [ ] Mobile PWA

**Medium-Term (3-6 months):**
- [ ] Component marketplace
- [ ] Collaborative editing
- [ ] Version history
- [ ] Vibe analytics
- [ ] Embed widgets

**Long-Term (6+ months):**
- [ ] Visual editor (drag-and-drop)
- [ ] Custom block types
- [ ] Multi-model AI support
- [ ] Desktop app
- [ ] API for developers

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Make changes and test
4. Commit (`git commit -m 'Add amazing feature'`)
5. Push (`git push origin feature/amazing`)
6. Open Pull Request

### Areas for Contribution

**High Priority:**
- Backend API proxy (hide API keys)
- Real-time notifications (WebSockets)
- Search functionality
- Mobile responsiveness
- Performance optimizations

**Good First Issues:**
- Documentation improvements
- Bug fixes
- UI/UX enhancements
- Accessibility improvements

See [VIBEFEED_DEVELOPER_GUIDE.md → Contributing](./VIBEFEED_DEVELOPER_GUIDE.md#contributing) for guidelines.

---

## 📄 License

MIT License - use freely!

See main [LICENSE](../LICENSE) file.

---

## 🙏 Credits

**Built with:**
- [DeclarativeWeb](../) - JSON-based web framework
- [Supabase](https://supabase.com) - Backend as a Service
- [Anthropic Claude](https://anthropic.com) - AI generation
- [Pico CSS](https://picocss.com) - Minimal CSS framework
- [Lucide](https://lucide.dev) - Icon library

**Inspired by:**
- TikTok (short-form, social content)
- CodePen (shareable components)
- ChatGPT (conversational AI)
- Instagram (visual discovery)

---

## 📞 Support

- **Documentation**: [VIBEFEED_OVERVIEW.md](./VIBEFEED_OVERVIEW.md) | [VIBEFEED_DEVELOPER_GUIDE.md](./VIBEFEED_DEVELOPER_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/RenderJS/issues)
- **Email**: support@vibefeed.example.com (coming soon)
- **Discord**: Join our community (coming soon)

---

**Ready to vibe? 🎵 Start creating with AI today!**
