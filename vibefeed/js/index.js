// ============================================
// Index/Landing Page
// ============================================

// Random logo emoji
const vibeEmojis = ['🎨', '✨', '🌈', '🎭', '🎪', '🎯', '🚀', '💫', '🔮', '🎸', '🌟', '🎬', '🎤', '🎧', '🌸', '🦋', '🍭', '⚡', '🔥', '💜']
document.getElementById('logo-emoji').textContent = vibeEmojis[Math.floor(Math.random() * vibeEmojis.length)]

// Random creative tagline (3 words max)
const creativeTaglines = [
  "Create. Share. Inspire.",
  "Imagination made real.",
  "Ideas come alive.",
  "Express yourself freely.",
  "Creativity without limits.",
  "Make something beautiful.",
  "Dream it. Build it.",
  "Art meets AI.",
  "Your vision, amplified.",
  "Spark your creativity.",
  "Build wild things.",
  "Create boldly today.",
  "Share your spark.",
  "Vibe with it.",
  "Let ideas flow."
]
document.getElementById('hero-subtitle').textContent = creativeTaglines[Math.floor(Math.random() * creativeTaglines.length)]

lucide.createIcons()

// Check if logged in
async function checkAuth() {
  try {
    const session = await auth.getSession()
    if (session) {
      document.getElementById('header-actions').innerHTML = `
        <a href="app" role="button" class="contrast">Open App</a>
      `
    }
  } catch (e) {
    // Not logged in, show default buttons
  }
}

checkAuth()
