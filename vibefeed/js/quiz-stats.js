// ============================================
// Quiz Stats Page
// ============================================

// Get vibe ID from URL
const urlParams = new URLSearchParams(window.location.search)
const vibeId = urlParams.get('vibe')

// Load quiz stats
async function loadStats() {
  const container = document.getElementById('content')

  if (!vibeId) {
    container.innerHTML = `
      <div class="error">
        <h2>Error</h2>
        <p>No quiz specified</p>
      </div>
    `
    return
  }

  try {
    container.innerHTML = '<div class="loading">Loading quiz statistics...</div>'

    // Fetch vibe details
    const vibe = await api.vibes.getById(vibeId)
    if (!vibe) {
      throw new Error('Quiz not found')
    }

    // Check if vibe contains a quiz
    const hasQuiz = vibe.content && vibe.content.some(block => block.type === 'quiz')
    if (!hasQuiz) {
      container.innerHTML = `
        <div class="error">
          <h2>No Quiz Found</h2>
          <p>This vibe doesn't contain a quiz.</p>
        </div>
      `
      return
    }

    // Get quiz title
    const quizBlock = vibe.content.find(block => block.type === 'quiz')
    const quizTitle = quizBlock?.title || 'Quiz'

    // Fetch stats
    const [stats, topScores] = await Promise.all([
      api.quizzes.getStats(vibeId),
      api.quizzes.getTopScores(vibeId, 3)
    ])

    // Render page
    renderStatsPage(quizTitle, stats, topScores, vibe)

  } catch (error) {
    console.error('Error loading stats:', error)
    container.innerHTML = `
      <div class="error">
        <h2>Error Loading Stats</h2>
        <p>${error.message}</p>
      </div>
    `
  }
}

function renderStatsPage(quizTitle, stats, topScores, vibe) {
  const container = document.getElementById('content')

  // Handle case where no one has completed the quiz yet
  if (!stats || stats.unique_users === 0 || stats.unique_users === '0') {
    container.innerHTML = `
      <div class="stats-header">
        <h1>${quizTitle}</h1>
        <p style="color: var(--pico-muted-color);">Statistics</p>
      </div>
      <div class="no-data">
        <i data-lucide="bar-chart-2"></i>
        <h3>No completions yet</h3>
        <p>Be the first to complete this quiz!</p>
        <a href="vibe?id=${vibe.id}" style="margin-top: 1rem; display: inline-block;">Take the quiz →</a>
      </div>
    `
    lucide.createIcons()
    return
  }

  let html = `
    <div class="stats-header">
      <h1>${quizTitle}</h1>
      <p style="color: var(--pico-muted-color);">Statistics & Leaderboard</p>
    </div>

    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value">${stats.unique_users || 0}</div>
        <div class="stat-label">Participants</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.total_completions || 0}</div>
        <div class="stat-label">Total Attempts</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.average_score || 0}</div>
        <div class="stat-label">Average Score</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.top_score || 0}</div>
        <div class="stat-label">Top Score</div>
      </div>
    </div>
  `

  // Leaderboard
  if (topScores && topScores.length > 0) {
    html += `
      <div class="leaderboard">
        <h2>
          <i data-lucide="trophy"></i>
          Top Performers
        </h2>
    `

    topScores.forEach((score, index) => {
      const rank = index + 1
      const date = new Date(score.completed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })

      html += `
        <div class="leaderboard-item">
          <div class="leaderboard-rank rank-${rank}">${rank}</div>
          <div class="leaderboard-user">
            <div class="leaderboard-username">${score.display_name || score.username}</div>
            <div class="leaderboard-date">${date}</div>
          </div>
          <div class="leaderboard-score">${score.score}</div>
          <div class="leaderboard-percentage">${score.percentage}%</div>
        </div>
      `
    })

    html += `</div>`
  }

  // Score distribution chart
  if (stats.score_distribution) {
    const distribution = stats.score_distribution
    const labels = ['0-49%', '50-59%', '60-69%', '70-79%', '80-89%', '90-100%']
    const values = labels.map(label => distribution[label] || 0)

    html += `
      <div class="chart-section">
        <h2>Score Distribution</h2>
        <div id="score-chart"></div>
      </div>
    `

    container.innerHTML = html
    lucide.createIcons()

    // Render chart
    new frappe.Chart("#score-chart", {
      data: {
        labels: labels,
        datasets: [
          {
            name: "Participants",
            values: values
          }
        ]
      },
      type: 'bar',
      height: 250,
      colors: ['#8b5cf6'],
      barOptions: {
        spaceRatio: 0.3
      },
      tooltipOptions: {
        formatTooltipY: d => d + ' participants'
      }
    })
  } else {
    container.innerHTML = html
    lucide.createIcons()
  }
}

// Initialize
lucide.createIcons()
loadStats()
