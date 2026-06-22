// ============================================
// Vibe Card and Content Rendering
// ============================================

// Store vibe data for re-rendering on expand/collapse
const vibeDataMap = new Map()

function createVibeCardHTML(vibe, cardId) {
  const tags = (vibe.tags || []).slice(0, 5)
  const isLiked = likedVibes.has(vibe.id)
  const isOwnVibe = currentUser && currentUser.id === vibe.user?.id
  const isFollowing = followedUsers.has(vibe.user?.id)

  return `
    <div class="vibe-card collapsed" data-vibe-id="${vibe.id}" id="${cardId}">
      <div class="vibe-card-header" onclick="toggleVibeCard('${cardId}')">
        <a href="profile?u=${vibe.user?.username}" class="vibe-card-avatar" onclick="event.stopPropagation()">
          ${vibe.user?.avatar_url
            ? `<img src="${vibe.user.avatar_url}" alt="${vibe.user.display_name}">`
            : '<i data-lucide="user"></i>'}
        </a>
        <div class="vibe-card-meta">
          <a href="profile?u=${vibe.user?.username}" class="vibe-card-author" onclick="event.stopPropagation()">${vibe.user?.display_name || 'User'}</a>
          <span class="vibe-card-username">@${vibe.user?.username || 'user'}</span>
        </div>
        ${!isOwnVibe ? `
          <button class="follow-btn ${isFollowing ? 'following' : 'contrast'}" onclick="event.stopPropagation(); toggleUserFollow('${vibe.user?.id}', this)">
            ${isFollowing ? 'Following' : 'Follow'}
          </button>
        ` : ''}
        <span class="vibe-card-time">${formatTime(vibe.created_at)}</span>
      </div>
      <div class="vibe-card-content">
        <div class="vibe-block" id="${cardId}-content">
          <p style="color: var(--pico-muted-color);">Loading...</p>
        </div>
      </div>
      ${tags.length > 0 ? `
        <div class="vibe-card-tags">
          ${tags.map(t => `<a href="#" class="vibe-tag" onclick="event.preventDefault(); searchByTag('${t}')">#${t}</a>`).join('')}
        </div>
      ` : ''}
      <div class="vibe-card-expand" onclick="toggleVibeCard('${cardId}')">
        <i data-lucide="chevron-down"></i>
        <span>Show more</span>
      </div>
      <div class="vibe-card-actions">
        <button class="vibe-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleVibeLike('${vibe.id}', this)" data-vibe-id="${vibe.id}">
          <i data-lucide="heart"></i>
          <span class="like-count">0</span>
        </button>
        <button class="vibe-action-btn" onclick="window.location.href='vibe?id=${vibe.id}'">
          <i data-lucide="message-circle"></i>
          Comment
        </button>
        <button class="vibe-action-btn revibe-btn" onclick="window.location.href='create?revibe=${vibe.id}'">
          <i data-lucide="sparkles"></i>
          Revibe
        </button>
      </div>
    </div>
  `
}

async function toggleVibeCard(cardId) {
  const card = document.getElementById(cardId)
  if (!card) return

  const isCurrentlyCollapsed = card.classList.contains('collapsed')
  const contentEl = document.getElementById(`${cardId}-content`)
  if (!contentEl) return

  const vibeData = vibeDataMap.get(cardId)
  if (!vibeData) return

  if (isCurrentlyCollapsed) {
    card.classList.remove('collapsed')
    contentEl.innerHTML = '<p style="color: var(--pico-muted-color);">Loading...</p>'
    await renderVibeContent(vibeData, cardId)
    lucide.createIcons()
  } else {
    card.classList.add('collapsed')
    contentEl.innerHTML = '<p style="color: var(--pico-muted-color);">Loading preview...</p>'

    if (Array.isArray(vibeData.content) && vibeData.content.length > 0) {
      const firstBlock = vibeData.content[0]
      const previewBlockId = `${cardId}-preview-block`
      const previewEl = document.createElement('div')
      previewEl.className = 'vibe-block'
      previewEl.id = previewBlockId
      contentEl.innerHTML = ''
      contentEl.appendChild(previewEl)

      let blockToRender = firstBlock
      if (firstBlock.type === 'p5js') {
        previewEl.innerHTML = '<p style="color: var(--pico-muted-color);">🎮 Interactive p5js sketch - click to expand</p>'
      } else if (firstBlock.type === 'quiz') {
        const title = firstBlock.title || 'Interactive Quiz'
        const questionCount = firstBlock.questions?.length || 0
        previewEl.innerHTML = `<p style="color: var(--pico-muted-color);">📝 ${title} (${questionCount} question${questionCount === 1 ? '' : 's'}) - click to expand</p>`
      } else {
        try {
          await Render.inject(`#${previewBlockId}`, blockToRender, { mode: 'replace' })
        } catch (e) {
          previewEl.innerHTML = `<p style="color: var(--pico-muted-color);">${getVibePreview([firstBlock])}</p>`
        }
      }
    } else {
      contentEl.innerHTML = '<p style="color: var(--pico-muted-color);">Click to expand...</p>'
    }

    lucide.createIcons()
  }
}

async function toggleVibeLike(vibeId, button) {
  if (!currentUser) {
    window.location.href = 'login'
    return
  }

  button.disabled = true
  try {
    const nowLiked = await api.likes.toggle(vibeId)
    const countEl = button.querySelector('.like-count')
    const currentCount = parseInt(countEl.textContent) || 0

    if (nowLiked) {
      likedVibes.add(vibeId)
      button.classList.add('liked')
      countEl.textContent = currentCount + 1
      api.notifications.notifyLike(vibeId)
    } else {
      likedVibes.delete(vibeId)
      button.classList.remove('liked')
      countEl.textContent = Math.max(0, currentCount - 1)
    }
  } catch (error) {
    console.error('Like error:', error)
  } finally {
    button.disabled = false
  }
}

async function toggleUserFollow(userId, button) {
  if (!currentUser) {
    window.location.href = 'login'
    return
  }

  button.disabled = true
  try {
    if (followedUsers.has(userId)) {
      await api.follows.unfollow(userId)
      followedUsers.delete(userId)
      button.textContent = 'Follow'
      button.classList.remove('following')
      button.classList.add('contrast')
    } else {
      await api.follows.follow(userId)
      followedUsers.add(userId)
      button.textContent = 'Following'
      button.classList.add('following')
      button.classList.remove('contrast')
    }
  } catch (error) {
    console.error('Follow error:', error)
  } finally {
    button.disabled = false
  }
}

async function renderVibeContent(vibe, cardId) {
  const contentEl = document.getElementById(`${cardId}-content`)
  if (!contentEl) return

  try {
    if (Array.isArray(vibe.content) && vibe.content.length > 0) {
      contentEl.innerHTML = ''
      for (let i = 0; i < vibe.content.length; i++) {
        const block = vibe.content[i]
        const blockId = `${cardId}-block-${i}`
        const blockEl = document.createElement('div')
        blockEl.className = 'vibe-block'
        blockEl.id = blockId
        contentEl.appendChild(blockEl)

        let blockToRender = block
        if (block.type === 'quiz') {
          blockToRender = {
            ...block,
            onComplete: async (completionData) => {
              console.log('[APP DEBUG] Quiz completed:', completionData)

              setTimeout(async () => {
                try {
                  const result = await api.quizzes.saveCompletion(vibe.id, completionData)
                  console.log('[APP DEBUG] Quiz completion saved:', result)

                  const [rankData, distribution] = await Promise.all([
                    api.quizzes.getUserFirstAttemptRank(vibe.id),
                    api.quizzes.getScoreDistribution(vibe.id)
                  ])

                  const quizContainers = blockEl.querySelectorAll('.quiz-container')
                  const lastQuizContainer = quizContainers[quizContainers.length - 1]

                  if (lastQuizContainer) {
                    const oldMsg = document.getElementById(`quiz-success-${vibe.id}`)
                    if (oldMsg) oldMsg.remove()

                    const successMsg = document.createElement('div')
                    successMsg.id = `quiz-success-${vibe.id}`
                    successMsg.style.cssText = 'margin: 1.5rem 0; padding: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'

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

                    const chartId = `quiz-chart-${vibe.id}-${Date.now()}`
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

                    lastQuizContainer.insertAdjacentElement('afterend', successMsg)

                    if (distribution && Object.keys(distribution).length > 0) {
                      const scores = Object.keys(distribution).map(Number).sort((a, b) => a - b)
                      const frequencies = scores.map(score => distribution[score] || 0)

                      const hasValidData = scores.length > 0 &&
                        frequencies.length > 0 &&
                        frequencies.every(v => typeof v === 'number' && isFinite(v))

                      if (hasValidData) {
                        try {
                          new frappe.Chart(`#${chartId}`, {
                            data: {
                              labels: scores.map(s => `${s}`),
                              datasets: [{ name: 'Attempts', values: frequencies }]
                            },
                            type: 'bar',
                            height: 200,
                            colors: ['#667eea'],
                            axisOptions: { xAxisMode: 'tick', xIsSeries: false },
                            barOptions: { spaceRatio: 0.3 },
                            tooltipOptions: { formatTooltipY: d => d + ' attempt' + (d === 1 ? '' : 's') }
                          })
                        } catch (chartError) {
                          console.warn('[APP DEBUG] Chart render failed:', chartError.message)
                        }
                      }
                    }

                    successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }
                } catch (error) {
                  console.error('[APP DEBUG] Error saving quiz completion:', error)
                  const quizContainers = blockEl.querySelectorAll('.quiz-container')
                  const lastQuizContainer = quizContainers[quizContainers.length - 1]

                  if (lastQuizContainer) {
                    const errorMsg = document.createElement('div')
                    errorMsg.id = `quiz-error-${vibe.id}`
                    errorMsg.style.cssText = 'margin: 1.5rem 0; padding: 1.5rem; background: #991b1b; color: white; border-radius: 1rem; text-align: center;'
                    errorMsg.innerHTML = `
                      <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                      <strong style="font-size: 1.2rem; display: block; margin-bottom: 0.5rem;">Failed to Save Quiz Completion</strong>
                      <div style="font-size: 0.95rem; margin-top: 0.5rem; opacity: 0.9;">${error.message}</div>
                    `
                    const oldMsg = document.getElementById(`quiz-error-${vibe.id}`)
                    if (oldMsg) oldMsg.remove()
                    lastQuizContainer.insertAdjacentElement('afterend', errorMsg)
                    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }
                }
              }, 100)
            }
          }
        }

        try {
          await Render.inject(`#${blockId}`, blockToRender, { mode: 'replace' })
        } catch (e) {
          blockEl.innerHTML = `<p style="color: var(--pico-muted-color);">${getVibePreview([block])}</p>`
        }
      }
    } else if (typeof vibe.content === 'string') {
      contentEl.innerHTML = `<p>${vibe.content}</p>`
    } else {
      contentEl.innerHTML = '<p style="color: var(--pico-muted-color);">Empty vibe</p>'
    }
  } catch (e) {
    contentEl.innerHTML = '<p style="color: var(--pico-muted-color);">Error rendering vibe</p>'
  }
}

function getVibePreview(content) {
  if (!content) return 'Empty vibe'
  if (typeof content === 'string') return content.slice(0, 120)
  if (Array.isArray(content)) {
    const first = content[0]
    if (first?.type === 'hero') return first.headline || first.title || 'Interactive vibe'
    if (first?.type === 'markdown') return (first.content || '').slice(0, 120)
    if (first?.type === 'quiz') return '📝 Quiz: ' + (first.questions?.[0]?.question || 'Interactive quiz')
    if (first?.type === 'p5js') return '🎮 Interactive sketch'
    return 'Interactive content'
  }
  return 'Vibe'
}

async function loadLikeCounts(vibes) {
  for (const vibe of vibes) {
    try {
      const count = await api.likes.count(vibe.id)
      const btn = document.querySelector(`[data-vibe-id="${vibe.id}"] .like-count`)
      if (btn) btn.textContent = count || 0

      if (currentUser) {
        const isLiked = await api.likes.isLiked(vibe.id)
        if (isLiked) {
          likedVibes.add(vibe.id)
          const likeBtn = document.querySelector(`button[data-vibe-id="${vibe.id}"]`)
          if (likeBtn) likeBtn.classList.add('liked')
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }
}

async function renderVibesList(vibes, containerId) {
  const container = document.getElementById(containerId)
  if (!container) return

  if (vibes.length === 0) {
    container.innerHTML = '<p style="color: var(--pico-muted-color);">No vibes found</p>'
    return
  }

  let html = ''
  const cardIds = []
  for (const vibe of vibes) {
    const cardId = `vibe-card-${++vibeCardCounter}`
    cardIds.push({ cardId, vibe })
    html += createVibeCardHTML(vibe, cardId)
  }
  container.innerHTML = html

  lucide.createIcons()

  for (const { cardId, vibe } of cardIds) {
    vibeDataMap.set(cardId, vibe)

    const contentEl = document.getElementById(`${cardId}-content`)
    if (contentEl && Array.isArray(vibe.content) && vibe.content.length > 0) {
      const firstBlock = vibe.content[0]
      const previewBlockId = `${cardId}-preview-block`
      const previewEl = document.createElement('div')
      previewEl.className = 'vibe-block'
      previewEl.id = previewBlockId
      contentEl.innerHTML = ''
      contentEl.appendChild(previewEl)

      if (firstBlock.type === 'p5js') {
        previewEl.innerHTML = '<p style="color: var(--pico-muted-color);">🎮 Interactive p5js sketch - click to expand</p>'
      } else if (firstBlock.type === 'quiz') {
        const title = firstBlock.title || 'Interactive Quiz'
        const questionCount = firstBlock.questions?.length || 0
        previewEl.innerHTML = `<p style="color: var(--pico-muted-color);">📝 ${title} (${questionCount} question${questionCount === 1 ? '' : 's'}) - click to expand</p>`
      } else {
        Render.inject(`#${previewBlockId}`, firstBlock, { mode: 'replace' }).catch(e => {
          previewEl.innerHTML = `<p style="color: var(--pico-muted-color);">${getVibePreview([firstBlock])}</p>`
        })
      }
    } else if (contentEl) {
      contentEl.innerHTML = '<p style="color: var(--pico-muted-color);">Click to expand...</p>'
    }
  }

  lucide.createIcons()
  loadLikeCounts(vibes)
}
