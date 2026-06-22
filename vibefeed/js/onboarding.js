// ============================================
// Onboarding Page
// ============================================

lucide.createIcons()

// Ensure user profile exists in the users table
async function ensureUserProfile(user) {
  try {
    // Check if profile already exists
    const existing = await api.users.getById(user.id)
    if (existing) return existing

    // Create new profile from auth data
    const profile = {
      id: user.id,
      username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
      display_name: user.user_metadata?.full_name || user.user_metadata?.name || 'New User',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      bio: ''
    }

    // Create the profile
    const created = await api.users.create(profile)
    console.log('Created user profile:', created)

    // Also create a default free plan for the user
    try {
      await api.plans.create('free')
    } catch (planErr) {
      console.warn('Could not create plan:', planErr)
    }

    return created
  } catch (e) {
    console.error('Error ensuring user profile:', e)
    throw e
  }
}

// Check if user has already created a vibe
async function checkAndRedirect() {
  try {
    const user = await auth.getUser()
    if (!user) {
      window.location.href = 'login'
      return
    }

    // Ensure user profile exists before anything else
    await ensureUserProfile(user)

    // Check vibe count
    const { count, error } = await supabaseClient
      .from('vibes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (error) throw error

    // If user has created at least one vibe, redirect to app
    if (count > 0) {
      window.location.href = 'app'
      return
    }
  } catch (e) {
    console.error('Error checking vibe count:', e)
  }
}

// Demo vibe content with star field and instructions
const demoVibeContent = [
  {
    type: 'p5js',
    code: `
let stars = [];

function setup() {
  createCanvas(windowWidth, 300);
  background(10, 10, 30);

  // Initialize stars inside setup() after canvas is created
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      speed: random(0.1, 0.5)
    });
  }
}

function draw() {
  background(10, 10, 30, 25);

  // Draw and move stars
  for (let star of stars) {
    fill(255, 255, 255, random(150, 255));
    noStroke();
    circle(star.x, star.y, star.size);

    star.y += star.speed;
    if (star.y > height) {
      star.y = 0;
      star.x = random(width);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, 300);
}
    `.trim(),
    height: 300
  },
  {
    type: 'hero',
    headline: 'What are Vibes?',
    subheadline: 'Interactive posts you create with AI - no coding needed!'
  },
  {
    type: 'markdown',
    content: `
### Here's what you can create:

**📝 Quizzes** - Test your friends with fun trivia
**🎨 Animations** - Beautiful p5.js sketches like the stars above
**📊 Charts** - Visualize data in seconds
**🍳 Recipes** - Share your favorite dishes
**💡 Tutorials** - Teach anything step-by-step
**🎯 And so much more!**

Just describe what you want in plain English, and AI builds it for you instantly.
    `.trim()
  },
  {
    type: 'section',
    title: '✨ How it Works',
    description: 'Type what you want to create, hit generate, and watch the magic happen. Edit it until it\'s perfect, then share with the world!'
  }
]

// Render demo vibe
Render.inject('#demo-content', demoVibeContent, { mode: 'replace' })
lucide.createIcons()

// Check user status on load
checkAndRedirect()
