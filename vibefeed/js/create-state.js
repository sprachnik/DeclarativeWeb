// ============================================
// State Management for Vibe Creation
// ============================================

// Core state
let isGenerating = false
let currentVibeContent = []
let currentTags = []
let currentUser = null
let lastUserMessage = ''
let activeStreamReader = null
let parentVibeId = null
let currentImageBase64 = null
let currentImageUrl = null
let chatHistory = []
let currentUserProfile = null
let currentPlan = null

// ============================================
// Starter Ideas Pool (50 ideas)
// ============================================
const starterIdeas = [
  'Create a Harry Potter quiz',
  'Create a soothing animation',
  'Lasagne recipe',
  'Recipe for chocolate chip cookies',
  'Quiz about world capitals',
  'Solar system animation',
  'Mindfulness breathing exercise',
  'Star Wars trivia quiz',
  'Recipe for banana bread',
  'Animated sunset',
  'Friends TV show quiz',
  'Recipe for pad thai',
  'Ocean waves animation',
  'Disney movies quiz',
  'Recipe for sushi',
  'Northern lights animation',
  'Marvel MCU quiz',
  'Recipe for tacos',
  'Bouncing ball physics',
  'Taylor Swift lyrics quiz',
  'Recipe for pizza dough',
  'Fireworks animation',
  'Programming languages quiz',
  'Recipe for tiramisu',
  'Rainbow spiral animation',
  'Geography quiz about Europe',
  'Recipe for pasta carbonara',
  'Starfield with twinkling stars',
  'Greek mythology quiz',
  'Recipe for ramen',
  'Particle explosion effect',
  'Music theory quiz',
  'Recipe for guacamole',
  'Rotating galaxy animation',
  'Science facts quiz',
  'Recipe for mac and cheese',
  'Rain falling animation',
  'Historical events quiz',
  'Recipe for curry',
  'Hypnotic spiral',
  'Literature trivia quiz',
  'Recipe for smoothie bowl',
  'Fractal tree animation',
  'Art history quiz',
  'Recipe for pancakes',
  'DNA helix animation',
  'Space exploration quiz',
  'Recipe for fried rice',
  'Aurora borealis simulation',
  'Movie quotes quiz'
]

function getRandomStarterIdeas() {
  const shuffled = [...starterIdeas].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 4)
}

function populateStarterIdeas() {
  const container = document.getElementById('starter-ideas')
  if (!container) return

  const ideas = getRandomStarterIdeas()
  container.innerHTML = ideas.map(idea =>
    `<button class="starter-idea-btn" onclick="fillStarterIdea('${idea.replace(/'/g, "\\'")}')">${idea}</button>`
  ).join('')
}

function fillStarterIdea(idea) {
  const input = document.getElementById('chat-input')
  input.value = idea
  autoResize(input)
  updateGenerateButtonState()
  input.focus()
}

// ============================================
// Error Tracking & Recovery
// ============================================
let errorTracker = {
  lastError: null,
  consoleErrors: [],
  renderErrors: []
}

// Capture console errors
const originalConsoleError = console.error
console.error = function(...args) {
  errorTracker.consoleErrors.push({
    timestamp: new Date().toISOString(),
    message: args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack || ''}`
      }
      return String(arg)
    }).join(' ')
  })
  // Keep only last 10 errors
  if (errorTracker.consoleErrors.length > 10) {
    errorTracker.consoleErrors.shift()
  }
  originalConsoleError.apply(console, args)
}
