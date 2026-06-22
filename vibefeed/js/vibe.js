// ============================================
// Vibe Page
// ============================================

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

lucide.createIcons()

let currentUser = null
let vibe = null
let isLiked = false
let likeCount = 0
let commentCount = 0
let isFollowingAuthor = false

    // Get vibe ID from URL
    function getVibeId() {
      const params = new URLSearchParams(window.location.search)
      return params.get('id')
    }

    // Format time
    function formatTime(dateStr) {
      const date = new Date(dateStr)
      const now = new Date()
      const diff = (now - date) / 1000

      if (diff < 60) return 'just now'
      if (diff < 3600) return Math.floor(diff / 60) + 'm'
      if (diff < 86400) return Math.floor(diff / 3600) + 'h'
      if (diff < 604800) return Math.floor(diff / 86400) + 'd'
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    // Render vibe content using DeclarativeWeb
    function renderVibeContent(content) {
      const container = document.querySelector('.vibe-render')
      if (!container) return

      try {
        if (Array.isArray(content)) {
          // Add onComplete callback to quiz blocks to save completions
          const contentWithCallbacks = content.map(block => {
            if (block.type === 'quiz') {
              return {
                ...block,
                onComplete: async (completionData) => {
                  console.log('[DEBUG] ========================================')
                  console.log('[DEBUG] QUIZ ONCOMPLETE CALLBACK FIRED!')
                  console.log('[DEBUG] ========================================')
                  console.log('[DEBUG] Completion data:', completionData)
                  console.log('[DEBUG] Vibe ID:', vibe.id)
                  console.log('[DEBUG] api object exists?', typeof api)
                  console.log('[DEBUG] api.quizzes exists?', typeof api?.quizzes)
                  console.log('[DEBUG] api.quizzes.saveCompletion exists?', typeof api?.quizzes?.saveCompletion)

                  // Delayed execution to ensure DOM is ready after state re-render
                  setTimeout(async () => {
                    try {
                      // Save quiz completion to database
                      console.log('[DEBUG] Attempting to save completion...')
                      const result = await api.quizzes.saveCompletion(vibe.id, completionData)
                      console.log('[DEBUG] ✓ Quiz completion saved successfully:', result)

                      // Fetch inline stats
                      console.log('[DEBUG] Fetching inline stats...')
                      const [rankData, distribution] = await Promise.all([
                        api.quizzes.getUserFirstAttemptRank(vibe.id),
                        api.quizzes.getScoreDistribution(vibe.id)
                      ])
                      console.log('[DEBUG] Rank data:', rankData)
                      console.log('[DEBUG] Distribution:', distribution)

                      // Find the quiz container and add success message after it
                      const quizContainers = document.querySelectorAll('.quiz-container')
                      const lastQuizContainer = quizContainers[quizContainers.length - 1]

                      if (lastQuizContainer) {
                        // Remove old success message if exists
                        const oldMsg = document.getElementById('quiz-success-message')
                        if (oldMsg) oldMsg.remove()

                        // Create success message container
                        const successMsg = document.createElement('div')
                        successMsg.id = 'quiz-success-message'
                        successMsg.style.cssText = 'margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'

                        // Build rank text
                        let rankHTML = ''
                        if (rankData && rankData.rank && rankData.total) {
                          rankHTML = `
                            <div style="margin: 1rem 0; padding: 1rem; background: rgba(255,255,255,0.15); border-radius: 0.5rem;">
                              <div style="font-size: 1rem; opacity: 0.9; margin-bottom: 0.25rem;">Your Ranking (based on first attempt)</div>
                              <div style="font-size: 1.8rem; font-weight: 700;">
                                #${rankData.rank} <span style="font-size: 1rem; opacity: 0.8;">out of ${rankData.total} player${rankData.total === 1 ? '' : 's'}</span>
                              </div>
                            </div>
                          `
                        }

                        // Build chart HTML
                        const chartId = `quiz-chart-${Date.now()}`
                        let chartHTML = ''
                        if (distribution && Object.keys(distribution).length > 0) {
                          chartHTML = `
                            <div style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.95); border-radius: 0.5rem;">
                              <div style="color: #1f2937; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.95rem;">Score Distribution (All Attempts)</div>
                              <div id="${chartId}" style="width: 100%; height: 200px;"></div>
                            </div>
                          `
                        }

                        successMsg.innerHTML = `
                          <div style="text-align: center;">
                            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
                            <strong style="font-size: 1.3rem; display: block; margin-bottom: 0.5rem;">Quiz Completed &amp; Saved!</strong>
                            <div style="font-size: 1.4rem; margin: 0.75rem 0; font-weight: 600;">
                              Your score: ${completionData.score}/${completionData.totalQuestions} (${completionData.percentage}%)
                            </div>
                          </div>
                          ${rankHTML}
                          ${chartHTML}
                        `

                        // Insert after quiz container
                        lastQuizContainer.insertAdjacentElement('afterend', successMsg)
                        console.log('[DEBUG] ✓ Success message inserted into DOM')

                        // Render chart if we have distribution data
                        if (distribution && Object.keys(distribution).length > 0) {
                          // Prepare chart data
                          const scores = Object.keys(distribution).map(Number).sort((a, b) => a - b)
                          const frequencies = scores.map(score => distribution[score])

                          // Create Frappe Chart
                          new frappe.Chart(`#${chartId}`, {
                            data: {
                              labels: scores.map(s => `${s}`),
                              datasets: [{
                                name: 'Attempts',
                                values: frequencies
                              }]
                            },
                            type: 'bar',
                            height: 200,
                            colors: ['#667eea'],
                            axisOptions: {
                              xAxisMode: 'tick',
                              xIsSeries: false
                            },
                            barOptions: {
                              spaceRatio: 0.3
                            },
                            tooltipOptions: {
                              formatTooltipY: d => d + ' attempt' + (d === 1 ? '' : 's')
                            }
                          })
                          console.log('[DEBUG] ✓ Chart rendered')
                        }

                        // Scroll to the message
                        successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                      }
                    } catch (error) {
                      console.error('[DEBUG] ✗ Error saving quiz completion:', error)
                      console.error('[DEBUG] Error details:', error.message, error.stack)

                      // Show prominent error message
                      const quizContainers = document.querySelectorAll('.quiz-container')
                      const lastQuizContainer = quizContainers[quizContainers.length - 1]

                      if (lastQuizContainer) {
                        const errorMsg = document.createElement('div')
                        errorMsg.id = 'quiz-error-message'
                        errorMsg.style.cssText = 'margin: 1.5rem 0; padding: 1.5rem; background: #991b1b; color: white; border-radius: 1rem; text-align: center;'
                        errorMsg.innerHTML = `
                          <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                          <strong style="font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">Failed to Save Quiz Completion</strong>
                          <div style="font-size: 0.95rem; margin-top: 0.5rem; opacity: 0.9;">
                            ${error.message}
                          </div>
                          <div style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 0.5rem; font-size: 0.85rem; text-align: left;">
                            <strong>Possible causes:</strong><br>
                            • Database migration not run (check README.md for SQL)<br>
                            • Not logged in<br>
                            • Database connection issue<br>
                            <br>
                            <strong>Next step:</strong> Open <a href="quiz-debug.html" style="color: #fbbf24; text-decoration: underline;">quiz-debug.html</a> to diagnose
                          </div>
                        `

                        // Remove old error message if exists
                        const oldMsg = document.getElementById('quiz-error-message')
                        if (oldMsg) oldMsg.remove()

                        lastQuizContainer.insertAdjacentElement('afterend', errorMsg)
                        errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                      }
                    }
                  }, 100) // Small delay to ensure DOM is updated after state change
                }
              }
            }
            return block
          })

          // Use Render.inject for DeclarativeWeb blocks - pass selector string, not element
          Render.inject('.vibe-render', contentWithCallbacks, { mode: 'replace' })
        } else if (typeof content === 'string') {
          container.innerHTML = `<p>${content}</p>`
        } else {
          container.innerHTML = '<p>Unable to render vibe content</p>'
        }
      } catch (error) {
        container.innerHTML = `<p>Error rendering: ${error.message}</p>`
      }
    }

    // Render page
    async function renderPage() {
      const container = document.getElementById('main-content')

      // Check if this vibe contains a quiz
      const hasQuiz = vibe.content && vibe.content.some(block => block.type === 'quiz')

      // Revibed from banner - only show if this is a revibe (has parent with different ID)
      const isRevibe = vibe.parent?.id && vibe.parent.id !== vibe.id && vibe.parent.user
      const revibeFromBanner = isRevibe
        ? `<div class="shared-from">
            Revibed from <a href="profile?u=${vibe.parent.user.username}">@${vibe.parent.user.username}</a>
            &middot; <a href="vibe?id=${vibe.parent.id}">View original</a>
          </div>`
        : ''

      container.innerHTML = `
        ${revibeFromBanner}

        <div class="vibe-author">
          <a href="profile?u=${vibe.user.username}" class="author-avatar">
            ${vibe.user.avatar_url
              ? `<img src="${vibe.user.avatar_url}" alt="${vibe.user.display_name}">`
              : '<i data-lucide="user"></i>'}
          </a>
          <div class="author-info">
            <a href="profile?u=${vibe.user.username}" class="author-name">${vibe.user.display_name}</a>
            ${currentUser && currentUser.id !== vibe.user.id
              ? `<button id="follow-btn" class="follow-btn ${isFollowingAuthor ? 'following' : 'contrast'}" onclick="toggleFollow()">
                  ${isFollowingAuthor ? 'Following' : 'Follow'}
                </button>`
              : ''}
            <div class="author-username">@${vibe.user.username}</div>
          </div>
          <span class="vibe-time">${formatTime(vibe.created_at)}</span>
        </div>

        <div class="vibe-content">
          <div class="vibe-render"></div>
          ${vibe.tags && vibe.tags.length > 0
            ? `<div class="vibe-tags">${vibe.tags.map(t =>
                `<a href="app#discover?tag=${t}" class="tag">#${t}</a>`).join('')}</div>`
            : ''}
        </div>

        <div class="vibe-actions">
          <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike()" id="like-btn">
            <i data-lucide="${isLiked ? 'heart' : 'heart'}"></i>
            <span id="like-count">${likeCount}</span>
          </button>
          <button class="action-btn" onclick="document.getElementById('comment-input').focus()">
            <i data-lucide="message-circle"></i>
            <span id="comment-count">${commentCount}</span>
          </button>
          <button class="action-btn revibe-btn" onclick="revibeVibe()">
            <i data-lucide="sparkles"></i>
            Revibe
          </button>
          ${hasQuiz
            ? `<button class="action-btn" onclick="window.location.href='quiz-stats?vibe=${vibe.id}'" style="color: var(--pico-primary);">
                <i data-lucide="bar-chart-2"></i>
                Quiz Stats
              </button>`
            : ''}
        </div>

        <div class="comments-section">
          <h3>Comments</h3>
          ${currentUser
            ? `<form class="comment-form" onsubmit="postComment(event)">
                <input type="text" id="comment-input" placeholder="Add a comment..." required>
                <button type="submit" class="contrast">Post</button>
              </form>`
            : `<p style="margin-bottom: 1rem;"><a href="login">Log in</a> to comment</p>`}
          <div id="comments-list">
            <div class="loading">Loading comments...</div>
          </div>
        </div>
      `

      lucide.createIcons()

      // Render the vibe content
      renderVibeContent(vibe.content)

      // Load comments
      await loadComments()
    }

    // Load comments
    async function loadComments() {
      const container = document.getElementById('comments-list')

      try {
        const comments = await api.comments.list(vibe.id, { limit: 50 })
        commentCount = comments.length
        document.getElementById('comment-count').textContent = commentCount

        if (comments.length === 0) {
          container.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>'
          return
        }

        container.innerHTML = comments.map(comment => `
          <div class="comment" data-id="${comment.id}">
            <a href="profile?u=${comment.user.username}" class="comment-avatar">
              ${comment.user.avatar_url
                ? `<img src="${comment.user.avatar_url}" alt="${comment.user.display_name}">`
                : '<i data-lucide="user"></i>'}
            </a>
            <div class="comment-content">
              <div class="comment-header">
                <a href="profile?u=${comment.user.username}" class="comment-author">${comment.user.display_name}</a>
                <span class="comment-time">${formatTime(comment.created_at)}</span>
                ${currentUser && comment.user_id === currentUser.id
                  ? `<button class="comment-delete" onclick="deleteComment('${comment.id}')">&times; Delete</button>`
                  : ''}
              </div>
              <p class="comment-text">${escapeHtml(comment.content)}</p>
            </div>
          </div>
        `).join('')

        lucide.createIcons()
      } catch (error) {
        container.innerHTML = `<p>Error loading comments: ${error.message}</p>`
      }
    }

    // Escape HTML
    function escapeHtml(text) {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }

    // Post comment
    async function postComment(e) {
      e.preventDefault()
      const input = document.getElementById('comment-input')
      const content = input.value.trim()
      if (!content) return

      try {
        await api.comments.create(vibe.id, content)
        input.value = ''
        // Notify vibe owner
        api.notifications.notifyComment(vibe.id)
        await loadComments()
      } catch (error) {
        alert('Error posting comment: ' + error.message)
      }
    }

    // Delete comment
    async function deleteComment(id) {
      if (!confirm('Delete this comment?')) return

      try {
        await api.comments.delete(id)
        document.querySelector(`.comment[data-id="${id}"]`)?.remove()
        commentCount--
        document.getElementById('comment-count').textContent = commentCount
      } catch (error) {
        alert('Error deleting comment: ' + error.message)
      }
    }

    // Toggle like
    async function toggleLike() {
      if (!currentUser) {
        window.location.href = 'login'
        return
      }

      const btn = document.getElementById('like-btn')
      btn.disabled = true

      try {
        const nowLiked = await api.likes.toggle(vibe.id)
        isLiked = nowLiked
        likeCount += nowLiked ? 1 : -1
        document.getElementById('like-count').textContent = likeCount
        btn.className = `action-btn ${isLiked ? 'liked' : ''}`
        // Notify vibe owner
        if (nowLiked) {
          api.notifications.notifyLike(vibe.id)
        }
      } catch (error) {
        alert('Error: ' + error.message)
      } finally {
        btn.disabled = false
      }
    }

    // Revibe - open in create page
    function revibeVibe() {
      if (!currentUser) {
        window.location.href = 'login'
        return
      }
      window.location.href = `create?revibe=${vibe.id}`
    }

    // Follow/unfollow user
    async function toggleFollow() {
      if (!currentUser) {
        window.location.href = 'login'
        return
      }

      const btn = document.getElementById('follow-btn')
      btn.disabled = true

      try {
        if (isFollowingAuthor) {
          await api.follows.unfollow(vibe.user.id)
          isFollowingAuthor = false
          btn.textContent = 'Follow'
          btn.classList.remove('following')
        } else {
          await api.follows.follow(vibe.user.id)
          isFollowingAuthor = true
          btn.textContent = 'Following'
          btn.classList.add('following')
        }
      } catch (error) {
        alert('Error: ' + error.message)
      } finally {
        btn.disabled = false
      }
    }

    // Show not found
    function showNotFound() {
      document.getElementById('main-content').innerHTML = `
        <div class="not-found">
          <h1>404</h1>
          <p>Vibe not found</p>
          <a href="app" role="button" class="contrast">Go Home</a>
        </div>
      `
    }

    // Initialize
    async function init() {
      const vibeId = getVibeId()

      if (!vibeId) {
        showNotFound()
        return
      }

      // Check if logged in
      const session = await auth.getSession()
      if (session) {
        currentUser = session.user
      }

      // Load vibe
      try {
        vibe = await api.vibes.get(vibeId)
        if (!vibe) {
          showNotFound()
          return
        }
      } catch (error) {
        showNotFound()
        return
      }

      // Get like status, counts, and follow status
      const [liked, likes, comments, following] = await Promise.all([
        currentUser ? api.likes.isLiked(vibe.id) : false,
        api.likes.count(vibe.id),
        api.comments.count(vibe.id),
        currentUser && currentUser.id !== vibe.user.id ? api.follows.isFollowing(vibe.user.id) : false
      ])

      isLiked = liked
      likeCount = likes
      commentCount = comments
      isFollowingAuthor = following

      // Update title
      document.title = `${vibe.user.display_name}'s Vibe - VibeFeed`

      // Render page
      await renderPage()
    }

    // Start
    init()
