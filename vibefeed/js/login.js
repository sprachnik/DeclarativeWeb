// ============================================
// Login Page
// ============================================

// Random logo emoji
const vibeEmojis = ['🎨', '✨', '🌈', '🎭', '🎪', '🎯', '🚀', '💫', '🔮', '🎸', '🌟', '🎬', '🎤', '🎧', '🌸', '🦋', '🍭', '⚡', '🔥', '💜']
document.getElementById('logo-emoji').textContent = vibeEmojis[Math.floor(Math.random() * vibeEmojis.length)]

// Random creative tagline
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
    document.getElementById('login-tagline').textContent = creativeTaglines[Math.floor(Math.random() * creativeTaglines.length)]

    // Initialize icons
    lucide.createIcons()

    // Tab switching
    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'))
      document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active')
      document.getElementById(`${tab}-form`).classList.add('active')
      hideError()
    }

    // Show error message
    function showError(message) {
      const el = document.getElementById('message')
      el.textContent = message
      el.className = 'message error visible'
    }

    // Show success message
    function showSuccess(message) {
      const el = document.getElementById('message')
      el.textContent = message
      el.className = 'message success visible'
    }

    // Hide message
    function hideError() {
      const el = document.getElementById('message')
      el.className = 'message'
    }

    // Show disclaimer modal
    function showDisclaimer(e) {
      e.preventDefault()
      const disclaimer = `
VibeFeed Alpha - Proprietary Software Disclaimer

CONFIDENTIALITY NOTICE
VibeFeed is currently in alpha testing and is proprietary software. By creating an account, you acknowledge and agree to the following:

1. ALPHA STATUS
   VibeFeed is in active development and may contain bugs, incomplete features, or undergo significant changes without notice.

2. CONFIDENTIALITY
   You agree to maintain the confidentiality of:
   - All non-public features, functionality, and capabilities
   - System architecture and implementation details
   - Any bugs, issues, or vulnerabilities you discover
   - Any content, data, or information marked as confidential

3. NO DISTRIBUTION
   You may not share, distribute, copy, or otherwise make available any part of VibeFeed's code, design, or proprietary information without explicit written permission.

4. FEEDBACK & SUGGESTIONS
   Any feedback, suggestions, or ideas you provide may be used by VibeFeed without compensation or attribution.

5. DATA & PRIVACY
   - Your data may be used to improve the platform
   - We collect usage analytics and AI generation data
   - Content you create may be reviewed for quality and safety
   - Private vibes remain private, public vibes are visible to all users

6. NO WARRANTY
   VibeFeed is provided "AS IS" without warranty of any kind. We do not guarantee uptime, data persistence, or bug-free operation.

7. TERMINATION
   We reserve the right to terminate access at any time for any reason, including violation of these terms.

8. CHANGES TO TERMS
   These terms may change as we develop the platform. Continued use constitutes acceptance of updated terms.

By checking the box and creating an account, you acknowledge that you have read, understood, and agree to be bound by these terms.

Questions? Contact us at legal@vibefeed.example.com
      `.trim()

      alert(disclaimer)
    }

    // Google sign in
    async function signInWithGoogle() {
      try {
        await auth.signInWithGoogle()
      } catch (error) {
        showError(error.message)
      }
    }

    // Email login
    async function handleLogin(e) {
      e.preventDefault()
      hideError()

      const form = e.target
      const email = form.email.value
      const password = form.password.value

      form.classList.add('loading')

      try {
        await auth.signInWithEmail(email, password)
        window.location.href = 'app'
      } catch (error) {
        showError(error.message)
      } finally {
        form.classList.remove('loading')
      }
    }

    // Email signup
    async function handleSignup(e) {
      e.preventDefault()
      hideError()

      const form = e.target
      const email = form.email.value
      const password = form.password.value
      const confirm = form.confirm.value
      const ndaAgree = form['nda-agree'].checked

      if (password !== confirm) {
        showError('Passwords do not match')
        return
      }

      if (!ndaAgree) {
        showError('You must agree to the confidentiality terms to create an account')
        return
      }

      form.classList.add('loading')

      try {
        const data = await auth.signUpWithEmail(email, password)
        if (data.user && !data.session) {
          // Email confirmation required
          showSuccess('Check your email for a confirmation link!')
          form.reset()
        } else if (data.session) {
          window.location.href = 'onboarding'
        } else {
          showError('Signup failed. Please try again.')
        }
      } catch (error) {
        showError(error.message)
      } finally {
        form.classList.remove('loading')
      }
    }

    // Check if already logged in
    async function checkAuth() {
      const session = await auth.getSession()
      if (session) {
        // Check if user has a profile
        try {
          const profile = await api.users.getById(session.user.id)
          if (profile) {
            window.location.href = 'app'
          } else {
            window.location.href = 'onboarding'
          }
        } catch {
          window.location.href = 'onboarding'
        }
      }
    }

    // Check on load
    checkAuth()
