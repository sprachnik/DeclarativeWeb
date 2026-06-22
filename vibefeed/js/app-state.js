// ============================================
// App State
// ============================================

let currentUser = null
let currentProfile = null
let currentPlan = null
let notifications = []

// Check if this is a new user coming from onboarding
const urlParams = new URLSearchParams(window.location.search)
let currentView = urlParams.get('welcome') === '1' ? 'guide' : 'feed'

// Clean up the URL without reloading
if (urlParams.get('welcome')) {
  window.history.replaceState({}, '', 'app')
}

let vibeCardCounter = 0
let likedVibes = new Set()
let followedUsers = new Set()
let profileVibesPage = 0
const VIBES_PER_PAGE = 10

// Initialize RenderJS
if (window.Render) {
  Render.init({
    data: {
      site: { title: 'VibeFeed' },
      state: {},
      pages: [{ path: '/', content: [] }]
    },
    target: '#render-dummy',
    showJsonButton: false
  })
}

// Random logo emoji
const vibeEmojis = ['🎨', '✨', '🌈', '🎭', '🎪', '🎯', '🚀', '💫', '🔮', '🎸', '🌟', '🎬', '🎤', '🎧', '🌸', '🦋', '🍭', '⚡', '🔥', '💜']
document.getElementById('logo-emoji').textContent = vibeEmojis[Math.floor(Math.random() * vibeEmojis.length)]

// Initialize icons
lucide.createIcons()
