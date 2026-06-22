const Render = (() => {
  let config = { target: '#app', data: null }
  let state = {}
  let functions = {}
  let pages = []
  let components = {}
  let nav = {}
  let footer = {}
  let site = {}
  let errors = []
  let v2Enabled = false
  let shouldScrollToTop = false

  // Phase 2 instances
  let expressionEvaluator = null
  let conditionalRenderer = null
  let loopRenderer = null

  // Injection system
  let injectionRegistry = new Map()
  let injectionIdCounter = 0
  let stateManager = null
  let actionExecutor = null
  let dataFetcher = null
  let firedWatches = new Set() // Track "once" watch blocks that have fired

  // Composable JSON import system
  let importCache = new Map() // Cache for imported JSON files
  let pendingImports = new Map() // Track in-flight requests to avoid duplicate fetches

  // Reactive state proxy
  const createReactiveState = (obj) => {
    return new Proxy(obj, {
      set(target, prop, value) {
        target[prop] = value
        if (prop === 'colorTheme') {
          // Theme change triggers re-render
        }
        render(false) // Don't scroll on state changes

        // Re-render reactive injections
        reRenderAffectedInjections([prop])

        return true
      }
    })
  }

  // Sandbox function execution - no DOM/window access
  const createSandboxedFunction = (code) => {
    try {
      return new Function(`"use strict"; return (${code})`)()
    } catch (e) {
      console.error('Function parse error:', e)
      logError('Function Parse Error', `Failed to parse function: ${e.message}`, { code })
      return () => null
    }
  }

  // Error logging
  const logError = (title, message, context = {}) => {
    const error = { title, message, context, timestamp: new Date() }
    errors.push(error)
    console.error(`[Render.js] ${title}:`, message, context)
  }

  // Mustache-style template rendering
  const interpolate = (template, context) => {
    if (typeof template !== 'string') return template

    return template.replace(/\{\{(.+?)\}\}/g, (match, expr) => {
      expr = expr.trim()

      // Check for function call first: funcName(args)
      const fnMatch = expr.match(/^(\w+)\((.*)\)$/)
      if (fnMatch) {
        const [, fnName, args] = fnMatch
        if (functions[fnName]) {
          try {
            const evalArgs = args ? new Function('state', 'site', `return [${args}]`)(state, site) : []
            return functions[fnName](...evalArgs)
          } catch (e) {
            logError('Function Error', `Failed to execute function: ${fnName}`, { error: e.message })
            return match
          }
        }
      }

      // v2: Use ExpressionEvaluator if available (after function call check)
      if (v2Enabled && expressionEvaluator) {
        try {
          // Spread state properties so both {{count}} and {{state.count}} work
          // Include Math for expressions like Math.round(), Math.floor(), etc.
          const evalContext = { state, site, Math, ...state, ...context }
          const result = expressionEvaluator.evaluate(expr, evalContext)
          if (result === undefined || result === null) {
            console.warn(`[Render.js] Expression returned ${result}: {{${expr}}}`)
            return `[${expr}?]` // Show error indicator instead of raw template
          }
          return result
        } catch (e) {
          // Fall back to basic interpolation on v2 error
          console.warn('Expression evaluation failed, trying basic interpolation:', expr, e.message)
        }
      }

      // Dot notation lookup: state.count, site.title
      // Spread state so both {{count}} and {{state.count}} work
      const value = expr.split('.').reduce((obj, key) => obj?.[key], { state, site, ...state, ...context })
      if (value === undefined) {
        console.warn(`[Render.js] Unresolved expression: {{${expr}}} - check that the variable exists in state or site`)
        return `[${expr}?]` // Show error indicator instead of raw template
      }
      return value
    })
  }

  // Template each helper: {{#each items}}...{{/each}}
  const processEach = (template, context) => {
    // Guard: template must be a string
    if (typeof template !== 'string') {
      throw new Error(`Component template must be a string, got ${typeof template}. Components should be HTML strings like: "components": { "myCard": "<div>{{title}}</div>" } — NOT objects with "type" and "html" properties.`)
    }
    const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
    return template.replace(eachRegex, (match, arrayName, inner) => {
      const arr = context[arrayName] || []
      return arr.map((item, index) => {
        return interpolate(inner.replace(/\{\{this\.(\w+)\}\}/g, (m, prop) => item[prop] || '')
          .replace(/\{\{this\}\}/g, typeof item === 'string' ? item : JSON.stringify(item))
          .replace(/\{\{@index\}\}/g, index), { ...context, ...item })
      }).join('')
    })
  }

  // Get column classes based on column configuration
  const getColumnClasses = (columns) => {
    if (!columns) return 'cols-3' // default

    if (typeof columns === 'number') {
      return `cols-${columns}`
    }

    if (typeof columns === 'object' && !columns.gridTemplate) {
      const { mobile = 1, tablet = 2, desktop = 3 } = columns
      return `cols-mobile-${mobile} cols-tablet-${tablet} cols-desktop-${desktop}`
    }

    return 'cols-3'
  }

  // Get custom grid template style
  const getGridTemplateStyle = (columns) => {
    if (typeof columns === 'object' && columns.gridTemplate) {
      return ` style="grid-template-columns: ${columns.gridTemplate}"`
    }
    if (typeof columns === 'string') {
      return ` style="grid-template-columns: ${columns}"`
    }
    return ''
  }

  // Render navigation with burger menu
  const renderNav = () => {
    if (!nav.links) return ''

    const layout = nav.layout || 'horizontal'
    const logoUrl = nav.logo?.url || '/'

    const logoHtml = nav.logo ? `
      <a href="${logoUrl}" class="nav-logo" data-route>
        ${nav.logo.icon ? `<i data-lucide="${nav.logo.icon}"></i>` : ''}
        <span>${nav.logo.text || ''}</span>
      </a>
    ` : ''

    const linksHtml = nav.links.map(link => {
      const href = link.url || link.path
      const isExternal = link.url || link.external
      const routeAttr = isExternal ? '' : 'data-route'
      const targetAttr = isExternal ? 'target="_blank" rel="noopener"' : ''

      return `<li>
        <a href="${href}" ${routeAttr} ${targetAttr}>
          ${link.icon ? `<i data-lucide="${link.icon}"></i>` : ''}
          <span>${link.label}</span>
        </a>
      </li>`
    }).join('')

    const actionsHtml = (nav.actions || []).map(action => {
      if (action.type === 'theme-toggle') {
        return `<li><button class="theme-toggle outline" onclick="Render.toggleTheme()" aria-label="Toggle theme">
          <i data-lucide="sun" class="icon-light"></i>
          <i data-lucide="moon" class="icon-dark"></i>
        </button></li>`
      }
      if (action.type === 'link') {
        const external = action.external ? 'target="_blank" rel="noopener"' : 'data-route'
        return `<li><a href="${action.url || action.path}" ${external} ${action.icon ? 'class="icon-link"' : ''}>
          ${action.icon ? `<i data-lucide="${action.icon}"></i>` : ''}
          ${action.label || ''}
        </a></li>`
      }
      return ''
    }).join('')

    if (layout === 'vertical') {
      return `
        <aside class="sidebar-nav" data-nav-layout="vertical">
          <div class="sidebar-header">
            ${logoHtml}
          </div>
          <nav>
            <ul class="nav-links">
              ${linksHtml}
            </ul>
            <ul class="nav-actions">
              ${actionsHtml}
            </ul>
          </nav>
        </aside>
      `
    }

    if (layout === 'both') {
      return `
        <aside class="sidebar-nav" data-nav-layout="both">
          <div class="sidebar-header">
            ${logoHtml}
          </div>
          <nav>
            <ul class="nav-links">
              ${linksHtml}
            </ul>
          </nav>
        </aside>
        <nav class="top-actions-bar">
          <ul class="nav-actions">
            ${actionsHtml}
          </ul>
        </nav>
      `
    }

    // Default: horizontal with dropdown
    return `
      <nav class="site-nav" data-nav-layout="horizontal">
        <div class="container nav-container">
          ${logoHtml}
          <ul class="nav-links desktop-only">
            ${linksHtml}
          </ul>
          <div class="nav-right">
            <ul class="nav-actions">
              ${actionsHtml}
            </ul>
            <details class="dropdown mobile-only">
              <summary role="button" class="outline" aria-label="Menu">
                <i data-lucide="menu"></i>
              </summary>
              <ul>
                ${linksHtml}
              </ul>
            </details>
          </div>
        </div>
      </nav>
    `
  }

  // Render footer
  const renderFooter = () => {
    if (!footer.text && !footer.links && !site.buildId && !site.buildDate) return ''

    const linksHtml = (footer.links || []).map(link => {
      const href = link.url || link.path
      const isExternal = href && href.startsWith('http')
      return `<a href="${href}" ${isExternal ? 'target="_blank" rel="noopener"' : 'data-route'}>${link.label}</a>`
    }).join(' · ')

    // Build metadata
    const buildMetadata = []
    if (site.buildId) {
      buildMetadata.push(`<span title="GitHub Actions Run ID">Build #${site.buildId}</span>`)
    }
    if (site.buildDate) {
      const date = new Date(site.buildDate)
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      buildMetadata.push(`<span title="${site.buildDate}">${formattedDate}</span>`)
    }
    const buildMetadataHtml = buildMetadata.length ? `<small class="build-metadata">${buildMetadata.join(' · ')}</small>` : ''

    return `
      <footer class="site-footer">
        <div class="footer-container">
          <p>${interpolate(footer.text || '', { site, state })}</p>
          ${linksHtml ? `<nav>${linksHtml}</nav>` : ''}
          ${buildMetadataHtml}
        </div>
      </footer>
    `
  }

  // Current JSON path for error tracking
  let currentJsonPath = ''

  // Render error card with JSON path
  const renderError = (blockType, error, blockData = {}, jsonPath = '') => {
    // Serialize error properly (Error objects don't serialize well)
    const serializableError = {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
    const pathInfo = jsonPath || currentJsonPath
    const errorMsg = pathInfo
      ? `Error in ${pathInfo}: ${error.message}`
      : `Failed to render ${blockType} block: ${error.message}`
    logError('Block Render Error', errorMsg, { blockData, error: serializableError, path: pathInfo })
    // Use inline styles to ensure visibility even without styles.css
    return `
      <div class="error-card" role="alert" style="padding: 1rem; margin: 1rem 0; border: 2px solid #dc3545; border-radius: 0.5rem; background: #fff5f5; color: #333;">
        <div class="error-header" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; color: #dc3545; font-weight: bold;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>Error rendering ${blockType} block</span>
        </div>
        ${pathInfo ? `<p style="margin: 0.5rem 0;"><strong>Path:</strong> <code style="background: #f0f0f0; padding: 0.125rem 0.375rem; border-radius: 0.25rem;">${pathInfo}</code></p>` : ''}
        <p style="margin: 0.5rem 0; color: #dc3545;"><strong>Error:</strong> ${error.message}</p>
        <details style="margin-top: 0.75rem;">
          <summary style="cursor: pointer; color: #666; font-size: 0.875rem;">Show block data</summary>
          <pre style="background: #f5f5f5; padding: 0.75rem; border-radius: 0.375rem; overflow-x: auto; margin-top: 0.5rem; font-size: 0.75rem;"><code>${JSON.stringify(blockData, null, 2)}</code></pre>
        </details>
      </div>
    `
  }

  // Error modal
  const showErrorModal = (error) => {
    const modal = document.createElement('div')
    modal.className = 'error-modal'
    modal.innerHTML = `
      <div class="error-modal-content">
        <div class="error-modal-header">
          <i data-lucide="alert-triangle"></i>
          <h3>${error.title}</h3>
          <button onclick="this.closest('.error-modal').remove()" aria-label="Close">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="error-modal-body">
          <p>${error.message}</p>
          ${error.context ? `<pre><code>${JSON.stringify(error.context, null, 2)}</code></pre>` : ''}
        </div>
        <div class="error-modal-footer">
          <button onclick="this.closest('.error-modal').remove()">Dismiss</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    if (window.lucide) lucide.createIcons()
  }

  // Initialize Mermaid diagrams on the page
  const initializeMermaidDiagrams = () => {
    if (typeof mermaid === 'undefined') return

    const diagrams = document.querySelectorAll('.mermaid')
    diagrams.forEach(diagram => {
      // Only render if not already rendered
      if (!diagram.hasAttribute('data-processed')) {
        try {
          mermaid.run({ nodes: [diagram] })
        } catch (e) {
          console.error('Mermaid render error:', e)
          diagram.innerHTML = `<div style="color: red; padding: 1rem;">Failed to render diagram: ${e.message}</div>`
        }
      }
    })
  }

  // Initialize Frappe Charts on the page
  const initializeFrappeCharts = (retryCount = 0) => {
    if (typeof frappe === 'undefined') {
      // Library not loaded yet, retry after a short delay (max 50 retries = 5 seconds)
      if (retryCount < 50) {
        setTimeout(() => initializeFrappeCharts(retryCount + 1), 100)
      } else {
        console.warn('Frappe Charts library failed to load after 5 seconds')
      }
      return
    }
    if (!window.frappeChartConfigs) {
      return
    }

    const chartContainers = document.querySelectorAll('.frappe-chart')

    chartContainers.forEach(container => {
      const chartId = container.getAttribute('data-chart-id')
      const config = window.frappeChartConfigs[chartId]

      // Only render if not already rendered and config exists
      if (config && !container.hasAttribute('data-processed')) {
        try {
          new frappe.Chart(container, {
            data: {
              labels: config.labels,
              datasets: config.datasets
            },
            type: config.type,
            height: config.height,
            colors: config.colors,
            axisOptions: config.axisOptions,
            barOptions: config.barOptions,
            lineOptions: config.lineOptions
          })
          container.setAttribute('data-processed', 'true')
        } catch (e) {
          console.error('Frappe Chart render error:', e)
          container.innerHTML = `<div style="color: red; padding: 1rem;">Failed to render chart: ${e.message}</div>`
        }
      }
    })
  }

  // Content block renderers
  const renderers = {
    html: (block, ctx = { state, site }) => {
      try {
        // Support both 'html' and 'content' properties for backward compatibility
        const htmlContent = block.html || block.content
        if (!htmlContent) {
          throw new Error('Missing required property: html or content')
        }

        // Warn about unsupported Vue/Angular/React syntax
        const unsupportedPatterns = [
          { pattern: /v-for=/i, framework: 'Vue', suggestion: 'Use a custom function with .map().join(\'\')' },
          { pattern: /v-if=/i, framework: 'Vue', suggestion: 'Use { "if": "condition", "then": {...} }' },
          { pattern: /@click=/i, framework: 'Vue', suggestion: 'Use onclick="functionName()"' },
          { pattern: /:key=/i, framework: 'Vue', suggestion: 'Not needed in Render.js' },
          { pattern: /\*ngFor=/i, framework: 'Angular', suggestion: 'Use a custom function with .map().join(\'\')' },
          { pattern: /\*ngIf=/i, framework: 'Angular', suggestion: 'Use { "if": "condition", "then": {...} }' },
          { pattern: /\(click\)=/i, framework: 'Angular', suggestion: 'Use onclick="functionName()"' },
          { pattern: /\{items\.map\(/i, framework: 'React/JSX', suggestion: 'Use a custom function that returns HTML string' }
        ]
        for (const { pattern, framework, suggestion } of unsupportedPatterns) {
          if (pattern.test(htmlContent)) {
            console.warn(`[Render.js] Detected ${framework} syntax which is not supported. ${suggestion}`)
          }
        }
        return interpolate(processEach(htmlContent, ctx), ctx)
      } catch (e) {
        return renderError('html', e, block)
      }
    },

    markdown: (block, ctx = { state, site }) => {
      try {
        if (!block.content) throw new Error('Missing required property: content')
        const content = interpolate(block.content, ctx)
        return `<div class="markdown-content">${marked.parse(content)}</div>`
      } catch (e) {
        return renderError('markdown', e, block)
      }
    },

    hero: (block, ctx = { state, site }) => {
      try {
        // Support both 'headline'/'subhead' and 'title'/'subtitle' for flexibility
        const headline = block.headline || block.title
        const subhead = block.subhead || block.subtitle

        if (!headline) throw new Error('Missing required property: headline (or title)')

        const ctaHtml = block.cta ?
          `<a href="${block.cta.path || block.cta.url}" role="button" ${block.cta.url ? 'target="_blank"' : 'data-route'}>${block.cta.label}</a>` : ''
        const secondaryHtml = block.secondaryCta ?
          `<a href="${block.secondaryCta.path || block.secondaryCta.url}" role="button" class="outline" ${block.secondaryCta.url ? 'target="_blank"' : 'data-route'}>
            ${block.secondaryCta.icon ? `<i data-lucide="${block.secondaryCta.icon}"></i>` : ''}
            ${block.secondaryCta.label}
          </a>` : ''

        return `
          <header class="hero">
            <h1>${interpolate(headline, ctx)}</h1>
            ${subhead ? `<p class="hero-subhead">${interpolate(subhead, ctx)}</p>` : ''}
            ${ctaHtml || secondaryHtml ? `<div class="hero-actions">${ctaHtml}${secondaryHtml}</div>` : ''}
          </header>
        `
      } catch (e) {
        return renderError('hero', e, block)
      }
    },

    section: (block, ctx = { state, site }) => {
      try {
        const columnClasses = getColumnClasses(block.columns)
        const gridTemplateValue = block.gridTemplate || (typeof block.columns === 'object' ? block.columns?.gridTemplate : undefined)
        const gridStyle = gridTemplateValue ? ` style="grid-template-columns: ${gridTemplateValue}"` : ''

        const resourcesHtml = (block.resources || []).map(res => {
          // Handle component references
          if (res.$ref) {
            const compTemplate = components[res.$ref]
            if (!compTemplate) {
              console.warn('Component not found:', res.$ref)
              return ''
            }
            // Validate component is a string template
            if (typeof compTemplate !== 'string') {
              console.warn(`Component "${res.$ref}" must be an HTML string, not ${typeof compTemplate}. Define components as: "components": { "${res.$ref}": "<div>{{title}}</div>" }`)
              return ''
            }
            const { $ref, ...props } = res
            return interpolate(processEach(compTemplate, props), { ...props, ...ctx })
          }

          // Regular resource cards
          if (!res.title || !res.description) {
            console.warn('Resource missing title or description:', res)
            return ''
          }

          const resHref = res.url || res.path
          const resIsExternal = resHref && resHref.startsWith('http')
          const interpolatedTitle = interpolate(res.title, ctx)
          const interpolatedDesc = interpolate(res.description, ctx)
          const titleHtml = resHref
            ? `<a href="${resHref}" ${resIsExternal ? 'target="_blank" rel="noopener"' : 'data-route'}>${interpolatedTitle}</a>`
            : interpolatedTitle

          return `
            <article class="resource-card">
              ${res.icon ? `<i data-lucide="${res.icon}" class="resource-icon"></i>` : ''}
              <h4>${titleHtml}</h4>
              <p>${interpolatedDesc}</p>
              ${res.tags?.length ? `<div class="tags">${res.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
            </article>
          `
        }).join('')

        // Support both 'description' and 'subtitle' for flexibility
        const sectionDesc = block.description || block.subtitle

        return `
          <section id="${block.id || ''}" class="content-section">
            ${block.title ? `<h2>${interpolate(block.title, ctx)}</h2>` : ''}
            ${sectionDesc ? `<p class="section-desc">${interpolate(sectionDesc, ctx)}</p>` : ''}
            <div class="resource-grid ${columnClasses}"${gridStyle}>${resourcesHtml}</div>
          </section>
        `
      } catch (e) {
        return renderError('section', e, block)
      }
    },

    code: (block, ctx = { state, site }) => {
      try {
        if (!block.code) throw new Error('Missing required property: code')

        const escaped = block.code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')

        return `
          <div class="code-block">
            ${block.title ? `<div class="code-header"><span>${interpolate(block.title, ctx)}</span><span class="code-lang">${block.language || ''}</span></div>` : ''}
            ${block.description ? `<p class="code-desc">${interpolate(block.description, ctx)}</p>` : ''}
            <pre><code class="language-${block.language || 'text'}">${escaped}</code></pre>
          </div>
        `
      } catch (e) {
        return renderError('code', e, block)
      }
    },

    modal: (block, ctx = { state, site }) => {
      try {
        if (!block.content) throw new Error('Missing required property: content')

        const modalId = block.id || `modal-${Math.random().toString(36).substr(2, 9)}`
        const size = block.size || 'medium' // small, medium, large

        // Render modal content (can be blocks or HTML)
        let contentHtml = ''
        const parentPath = currentJsonPath
        if (typeof block.content === 'string') {
          contentHtml = interpolate(block.content, ctx)
        } else if (Array.isArray(block.content)) {
          contentHtml = block.content.map((b, idx) => {
            currentJsonPath = `${parentPath}.content[${idx}]`
            return renderBlock(b)
          }).join('')
          currentJsonPath = parentPath
        } else if (block.content.type) {
          currentJsonPath = `${parentPath}.content`
          contentHtml = renderBlock(block.content)
          currentJsonPath = parentPath
        }

        const dialogHtml = `
            <dialog id="${modalId}" class="modal-dialog ${size}">
              <article>
                <header>
                  ${block.title ? `<h3>${interpolate(block.title, ctx)}</h3>` : ''}
                  <button class="close" onclick="document.getElementById('${modalId}').close()" aria-label="Close">✕</button>
                </header>
                <div class="modal-content">
                  ${contentHtml}
                </div>
                ${block.footer ? `<footer>${interpolate(block.footer, ctx)}</footer>` : ''}
              </article>
            </dialog>`

        // Only render trigger button and container if trigger is specified
        if (block.trigger) {
          const triggerLabel = interpolate(block.trigger.label || 'Open Modal', ctx)
          const triggerClass = block.trigger.class || ''

          return `
          <div class="modal-container">
            <button onclick="document.getElementById('${modalId}').showModal()" class="${triggerClass}" ${block.trigger.icon ? `aria-label="${triggerLabel}"` : ''}>
              ${block.trigger.icon ? `<i data-lucide="${block.trigger.icon}"></i>` : ''}
              ${triggerLabel}
            </button>
            ${dialogHtml}
          </div>
        `
        }

        // Without trigger, just render the dialog
        return dialogHtml
      } catch (e) {
        return renderError('modal', e, block)
      }
    },

    // Declarative button block - LLM-friendly alternative to HTML buttons
    button: (block, ctx = { state, site }) => {
      try {
        if (!block.label) throw new Error('Missing required property: label')

        const variant = block.variant || '' // default, secondary, contrast, outline
        const variantClass = variant ? ` class="${variant}"` : ''

        // Handle action binding - interpolate the action string if needed
        let onclick = ''
        if (block.action) {
          if (typeof block.action === 'string') {
            // Simple string action: "increment" or "checkAnswer(0)"
            // Interpolate any {{...}} in the action
            const interpolatedAction = interpolate(block.action, ctx)
            onclick = ` onclick="${interpolatedAction}"`
          } else if (typeof block.action === 'object') {
            // Declarative action object with whitelisted safe actions
            const action = block.action
            const actionType = action.type

            // Whitelist of safe actions (no arbitrary code execution)
            const safeActions = ['setState', 'navigate', 'toggleState', 'resetState']

            if (action.fn) {
              // Legacy function call support: {fn: "checkAnswer", args: [0]}
              const args = action.args ? action.args.map(a =>
                typeof a === 'string' ? `'${a}'` : a
              ).join(', ') : ''
              onclick = ` onclick="${action.fn}(${args})"`
            } else if (actionType && safeActions.includes(actionType)) {
              // Safe declarative actions
              // Generate unique handler ID
              const handlerId = `btn_${Math.random().toString(36).substr(2, 9)}`

              // Register handler in global scope
              if (typeof window !== 'undefined') {
                window[handlerId] = async () => {
                  try {
                    if (actionExecutor) {
                      await actionExecutor.execute(action, { state, site })
                    } else {
                      // Fallback for basic actions without ActionExecutor
                      if (actionType === 'setState' && action.updates) {
                        Object.assign(state, action.updates)
                        render(false)
                      } else if (actionType === 'toggleState' && action.key) {
                        state[action.key] = !state[action.key]
                        render(false)
                      } else if (actionType === 'navigate' && action.path) {
                        window.location.href = action.path
                      } else if (actionType === 'resetState') {
                        const keys = action.keys || Object.keys(state)
                        keys.forEach(k => delete state[k])
                        render(false)
                      }
                    }
                  } catch (error) {
                    console.error('Button action failed:', error)
                  }
                }
              }

              onclick = ` onclick="${handlerId}()"`
            } else if (actionType) {
              console.warn(`Button action type "${actionType}" is not whitelisted. Allowed: ${safeActions.join(', ')}`)
            }
          }
        }

        // Handle disabled state (can be an expression string)
        let disabled = ''
        if (block.disabled) {
          if (typeof block.disabled === 'string') {
            // Evaluate expression
            try {
              const isDisabled = new Function('state', 'site', `return ${block.disabled}`)(state, site)
              disabled = isDisabled ? ' disabled' : ''
            } catch (e) {
              console.warn('Failed to evaluate disabled expression:', block.disabled)
            }
          } else if (block.disabled === true) {
            disabled = ' disabled'
          }
        }

        // Handle icon
        const iconHtml = block.icon ? `<i data-lucide="${block.icon}"></i> ` : ''

        return `<button${variantClass}${onclick}${disabled} style="margin-right: 0.5rem; margin-bottom: 0.5rem;">${iconHtml}${interpolate(block.label, ctx)}</button>`
      } catch (e) {
        return renderError('button', e, block)
      }
    },

    // Table block - accepts CSV string or JSON array
    table: (block) => {
      try {
        if (!block.data) throw new Error('Missing required property: data')

        let rows = []

        // Parse data based on type
        if (typeof block.data === 'string') {
          // CSV format - parse string
          rows = block.data.trim().split('\n').map(row => {
            // Handle quoted CSV values
            const cells = []
            let current = ''
            let inQuotes = false
            for (let i = 0; i < row.length; i++) {
              const char = row[i]
              if (char === '"') {
                inQuotes = !inQuotes
              } else if (char === ',' && !inQuotes) {
                cells.push(current.trim())
                current = ''
              } else {
                current += char
              }
            }
            cells.push(current.trim())
            return cells
          })
        } else if (Array.isArray(block.data)) {
          // JSON array format
          if (block.data.length > 0 && Array.isArray(block.data[0])) {
            // Array of arrays: [["Name", "Age"], ["Alice", 30]]
            rows = block.data
          } else if (block.data.length > 0 && typeof block.data[0] === 'object') {
            // Array of objects: [{name: "Alice", age: 30}]
            const headers = Object.keys(block.data[0])
            rows = [headers, ...block.data.map(obj => headers.map(h => obj[h]))]
          }
        }

        if (rows.length === 0) {
          return '<p class="secondary">No data to display</p>'
        }

        // First row is header
        const [headerRow, ...dataRows] = rows

        // Build table HTML with Pico CSS classes (ctx is passed from renderBlock)
        const ctx = { state, site }
        const headerHtml = headerRow.map(cell => `<th>${interpolate(String(cell ?? ''), ctx)}</th>`).join('')
        const bodyHtml = dataRows.map(row =>
          `<tr>${row.map(cell => `<td>${interpolate(String(cell ?? ''), ctx)}</td>`).join('')}</tr>`
        ).join('')

        const caption = block.caption ? `<caption>${interpolate(block.caption, ctx)}</caption>` : ''
        const tableClass = block.striped ? ' class="striped"' : ''

        return `
          <figure>
            <table${tableClass}>
              ${caption}
              <thead>
                <tr>${headerHtml}</tr>
              </thead>
              <tbody>
                ${bodyHtml}
              </tbody>
            </table>
          </figure>
        `
      } catch (e) {
        return renderError('table', e, block)
      }
    },

    // State initialization block - sets initial state values with proper types
    state: (block) => {
      try {
        if (!block.init || typeof block.init !== 'object') {
          throw new Error('Missing required property: init (object with state values)')
        }

        // Initialize state values, preserving types
        for (const [key, value] of Object.entries(block.init)) {
          // Only set if not already defined (don't overwrite existing state)
          if (state[key] === undefined) {
            state[key] = value
          }
        }

        // Return empty string - state blocks don't render visually
        return ''
      } catch (e) {
        return renderError('state', e, block)
      }
    },

    // Watch block - execute actions when condition becomes true
    watch: (block, ctx = { state, site }) => {
      try {
        if (!block.if) {
          throw new Error('Missing required property: if (condition expression)')
        }
        if (!block.actions || !Array.isArray(block.actions)) {
          throw new Error('Missing required property: actions (array of action objects)')
        }

        // Generate unique ID for this watch block (based on condition + actions)
        const watchId = block.id || `watch-${block.if}-${JSON.stringify(block.actions).substring(0, 50)}`

        // Check if this "once" watch has already fired
        if (block.once && firedWatches.has(watchId)) {
          return '' // Already fired, skip
        }

        // Evaluate condition
        let conditionMet = false
        if (expressionEvaluator) {
          try {
            conditionMet = expressionEvaluator.evaluate(block.if, ctx)
          } catch (e) {
            console.warn('Watch condition evaluation failed:', block.if, e.message)
            return ''
          }
        }

        // If condition is true, execute actions
        if (conditionMet) {
          // Mark as fired if "once" is set
          if (block.once) {
            firedWatches.add(watchId)
          }

          // Execute actions asynchronously (don't block render)
          if (actionExecutor && block.actions.length > 0) {
            // Interpolate action parameters before executing
            const interpolatedActions = block.actions.map(action => {
              const interpolated = { ...action }
              // Interpolate string values in action
              for (const [key, value] of Object.entries(action)) {
                if (typeof value === 'string' && value.includes('{{')) {
                  interpolated[key] = interpolate(value, ctx)
                } else if (typeof value === 'object' && value !== null) {
                  // Deep interpolate objects (like body, headers)
                  interpolated[key] = JSON.parse(interpolate(JSON.stringify(value), ctx))
                }
              }
              return interpolated
            })

            // Execute asynchronously
            actionExecutor.execute(interpolatedActions, { state, site })
              .catch(error => {
                console.error('[Watch] Action execution failed:', error)
              })
          }
        }

        // Return empty string - watch blocks don't render visually
        return ''
      } catch (e) {
        return renderError('watch', e, block)
      }
    },

    // Mermaid diagram block - renders diagrams from Mermaid DSL
    mermaid: (block, ctx = { state, site }) => {
      try {
        if (!block.content) {
          throw new Error('Missing required property: content (Mermaid DSL)')
        }

        // Generate unique ID for this diagram
        const diagramId = `mermaid-${Math.random().toString(36).substr(2, 9)}`

        // Interpolate content to support template variables
        const content = interpolate(block.content, ctx)

        // Theme mapping to match Pico CSS
        const themeMap = {
          default: 'default',
          dark: 'dark',
          neutral: 'neutral',
          forest: 'forest'
        }
        const theme = themeMap[block.theme] || 'neutral'

        // Initialize Mermaid with theme if not already initialized
        if (typeof mermaid !== 'undefined' && !window.mermaidInitialized) {
          // Get computed CSS variable values (Mermaid doesn't support CSS variables)
          const computedStyle = getComputedStyle(document.documentElement)
          const getCSSVar = (varName, fallback) => {
            const value = computedStyle.getPropertyValue(varName).trim()
            return value || fallback
          }

          mermaid.initialize({
            startOnLoad: false,
            theme: theme,
            themeVariables: {
              // Pico CSS color integration - use computed values
              primaryColor: getCSSVar('--pico-primary', '#0172ad'),
              primaryTextColor: '#fff',
              primaryBorderColor: getCSSVar('--pico-primary-hover', '#015a8a'),
              lineColor: getCSSVar('--pico-muted-color', '#5a6270'),
              secondaryColor: getCSSVar('--pico-secondary', '#6c757d'),
              tertiaryColor: getCSSVar('--pico-contrast', '#f4f5f7')
            }
          })
          window.mermaidInitialized = true
        }

        // Return container that will be rendered by mermaid
        return `
          <div class="mermaid-container" data-theme="${theme}">
            <div class="mermaid" id="${diagramId}">${content}</div>
          </div>
        `
      } catch (e) {
        return renderError('mermaid', e, block)
      }
    },

    // Frappe Chart block - renders clean minimal charts
    'frappe-chart': (block, ctx = { state, site }) => {
      try {
        if (!block.chartType) {
          throw new Error('Missing required property: chartType (line, bar, pie, percentage, heatmap)')
        }
        if (!block.labels || !Array.isArray(block.labels)) {
          throw new Error('Missing required property: labels (array of strings)')
        }
        if (!block.datasets || !Array.isArray(block.datasets)) {
          throw new Error('Missing required property: datasets (array of dataset objects)')
        }

        // Validate datasets
        block.datasets.forEach((dataset, idx) => {
          if (!dataset.values || !Array.isArray(dataset.values)) {
            throw new Error(`Dataset ${idx} missing required property: values (array of numbers)`)
          }
          if (dataset.values.length !== block.labels.length) {
            throw new Error(`Dataset ${idx} values length (${dataset.values.length}) must match labels length (${block.labels.length})`)
          }
        })

        // Generate unique ID for this chart
        const chartId = `frappe-chart-${Math.random().toString(36).substr(2, 9)}`

        // Interpolate title if present
        const title = block.title ? interpolate(block.title, ctx) : ''

        // Height with default
        const height = block.height || 300

        // Pico CSS themed colors (defaults if not provided)
        const defaultColors = [
          '#0172ad', // Primary blue
          '#00b894', // Teal
          '#fd79a8', // Pink
          '#fdcb6e', // Yellow
          '#6c5ce7', // Purple
          '#e17055'  // Orange
        ]
        const colors = block.colors || defaultColors

        // Create chart configuration
        const chartConfig = {
          type: block.chartType,
          labels: block.labels,
          datasets: block.datasets,
          colors: colors,
          height: height,
          axisOptions: {
            xAxisMode: 'tick',
            yAxisMode: 'span'
          },
          barOptions: {
            spaceRatio: 0.2
          },
          lineOptions: {
            dotSize: 4,
            hideLine: 0,
            hideDots: 0,
            heatline: 0,
            regionFill: 0
          }
        }

        // Store config in a global registry for post-render initialization
        if (!window.frappeChartConfigs) {
          window.frappeChartConfigs = {}
        }
        window.frappeChartConfigs[chartId] = chartConfig

        return `
          <div class="frappe-chart-container">
            ${title ? `<h3 class="chart-title">${title}</h3>` : ''}
            <div class="frappe-chart" id="${chartId}" data-chart-id="${chartId}"></div>
          </div>
        `
      } catch (e) {
        return renderError('frappe-chart', e, block)
      }
    },

    // P5.js block - creative coding with sandboxed iframe
    'p5js': (block, ctx = { state, site }) => {
      try {
        if (!block.code) {
          throw new Error('Missing required property: code (P5.js sketch code)')
        }

        // Generate unique ID for this sketch
        const sketchId = `p5js-${Math.random().toString(36).substr(2, 9)}`

        // Interpolate code to support template variables
        const code = interpolate(block.code, ctx)

        // Height with default (width will be 100% responsive)
        const height = block.height || 300

        // Create sandboxed iframe HTML with responsive canvas and error handling
        const iframeHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"></script>
            <style>
              body { margin: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #1a1a2e; }
              canvas { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
              .p5-error-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(220, 53, 69, 0.95); color: white;
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                padding: 1rem; text-align: center; font-family: system-ui, sans-serif;
              }
              .p5-error-overlay h3 { margin: 0 0 0.5rem 0; font-size: 1rem; }
              .p5-error-overlay pre {
                background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 4px;
                font-size: 0.75rem; max-width: 90%; overflow-x: auto; text-align: left;
                white-space: pre-wrap; word-break: break-word;
              }
              .p5-error-overlay small { opacity: 0.8; margin-top: 0.5rem; font-size: 0.7rem; }
            </style>
          </head>
          <body>
            <script>
              // Global error handler
              window.onerror = function(msg, url, line, col, error) {
                document.body.innerHTML = '<div class="p5-error-overlay">' +
                  '<h3>Sketch Error</h3>' +
                  '<pre>' + (msg || 'Unknown error') + '</pre>' +
                  '<small>Ask to fix or regenerate this sketch</small>' +
                  '</div>';
                return true;
              };
              // p5.js will run setup() after it loads - canvas CSS handles responsive scaling
              ${code}
            </script>
          </body>
          </html>
        `.trim()

        // Base64 encode the iframe content (with UTF-8 support for emojis etc)
        const encoded = btoa(unescape(encodeURIComponent(iframeHtml)))

        return `
          <div class="p5js-container" style="border: 1px solid var(--pico-muted-border-color); border-radius: var(--pico-border-radius); overflow: hidden; margin: 1rem 0;">
            <iframe
              id="${sketchId}"
              sandbox="allow-scripts"
              style="border: none; display: block; width: 100%; height: ${height}px;"
              src="data:text/html;base64,${encoded}"
            ></iframe>
          </div>
        `
      } catch (e) {
        return renderError('p5js', e, block)
      }
    },

    // Quiz block - interactive quiz with state management
    'quiz': (block, ctx = { state, site }) => {
      try {
        if (!block.questions || !Array.isArray(block.questions)) {
          throw new Error('Missing required property: questions (array of question objects)')
        }

        // Validate questions
        block.questions.forEach((q, idx) => {
          if (!q.question) throw new Error(`Question ${idx}: missing required property "question"`)
          if (!q.options || !Array.isArray(q.options)) {
            throw new Error(`Question ${idx}: missing required property "options" (array)`)
          }
          if (typeof q.correct !== 'number') {
            throw new Error(`Question ${idx}: missing required property "correct" (number, 0-indexed)`)
          }
        })

        // Generate DETERMINISTIC ID for this quiz based on content
        // This ensures the same quiz gets the same state key across re-renders
        const quizContentHash = (block.title || '') + block.questions.map(q => q.question).join('')
        let hashNum = 0
        for (let i = 0; i < quizContentHash.length; i++) {
          hashNum = ((hashNum << 5) - hashNum) + quizContentHash.charCodeAt(i)
          hashNum = hashNum | 0 // Convert to 32-bit integer
        }
        // Ensure we have a valid non-zero hash
        if (hashNum === 0) hashNum = 1
        const quizId = `quiz_${Math.abs(hashNum)}`

        // Debug logging
        if (typeof console !== 'undefined') {
          console.log('[Quiz Block Debug]', {
            title: block.title,
            questionsCount: block.questions.length,
            hashContent: quizContentHash.substring(0, 80),
            hashNum: hashNum,
            quizId: quizId
          })
        }

        // Initialize quiz state (only once - deterministic ID prevents re-initialization)
        const quizStateKey = `quiz_${quizId}`
        if (state[quizStateKey] === undefined) {
          state[quizStateKey] = {
            currentQuestion: 0,
            score: 0,
            answers: [],
            completed: false
          }
        }

        const quizState = state[quizStateKey]
        const totalQuestions = block.questions.length
        const isCompleted = quizState.completed
        // Only get current question if not completed (avoids undefined access)
        const currentQ = isCompleted ? null : block.questions[quizState.currentQuestion]

        // Quiz title
        const title = block.title ? `<h3>${interpolate(block.title, ctx)}</h3>` : ''

        // Generate unique handler IDs
        const answerHandlerId = `quizAnswer_${quizId}`
        const resetHandlerId = `quizReset_${quizId}`

        // Debug: Log quiz ID and handler registration
        if (typeof window !== 'undefined' && !window[answerHandlerId]) {
          console.log('[Quiz Block] Registering quiz:', quizId, 'Handler:', answerHandlerId)
        }

        // Register answer handler (only once - not on every render)
        if (typeof window !== 'undefined' && !window[answerHandlerId]) {
          window[answerHandlerId] = (optionIndex, buttonElement) => {
            // Show immediate visual feedback: disable all buttons and show spinner on selected
            const quizContainer = buttonElement.closest('.quiz-container')
            if (quizContainer) {
              const allButtons = quizContainer.querySelectorAll('.quiz-options button')
              allButtons.forEach((btn, idx) => {
                btn.disabled = true
                if (idx === optionIndex) {
                  // Add spinner to selected button
                  const originalHTML = btn.innerHTML
                  btn.innerHTML = `<i data-lucide="loader-2" style="width: 1rem; height: 1rem; animation: spin 1s linear infinite; display: inline-block; margin-right: 0.5rem;"></i>${originalHTML}`
                  // Re-initialize lucide icons for the spinner
                  if (typeof lucide !== 'undefined') {
                    lucide.createIcons()
                  }
                  btn.style.opacity = '1'
                } else {
                  btn.style.opacity = '0.5'
                }
              })
            }

            // Get current question from state (not from closure)
            const currentQuestion = state[quizStateKey].currentQuestion
            const question = block.questions[currentQuestion]
            const correctAnswer = question.correct
            const isCorrect = optionIndex === correctAnswer
            const timestamp = new Date().toISOString()

            // Build answer data for callback
            const answerData = {
              questionIndex: currentQuestion,
              questionNumber: currentQuestion + 1,
              question: question.question,
              options: question.options,
              selectedOption: optionIndex,
              selectedAnswer: question.options[optionIndex],
              correctOption: correctAnswer,
              correctAnswer: question.options[correctAnswer],
              isCorrect,
              timestamp,
              score: state[quizStateKey].score + (isCorrect ? 1 : 0),
              totalQuestions: block.questions.length
            }

            state[quizStateKey].answers.push({
              questionIndex: currentQuestion,
              selected: optionIndex,
              correct: isCorrect,
              timestamp
            })
            if (isCorrect) state[quizStateKey].score++

            // Call onAnswer callback if provided
            if (block.onAnswer && typeof block.onAnswer === 'function') {
              try {
                block.onAnswer(answerData)
              } catch (e) {
                console.error('[Quiz Block] onAnswer callback error:', e)
              }
            }

            state[quizStateKey].currentQuestion++
            if (state[quizStateKey].currentQuestion >= block.questions.length) {
              state[quizStateKey].completed = true

              // Call onComplete callback if provided
              if (block.onComplete && typeof block.onComplete === 'function') {
                try {
                  const completeData = {
                    quizId,
                    title: block.title || null,
                    questions: block.questions.map((q, idx) => ({
                      questionIndex: idx,
                      question: q.question,
                      options: q.options,
                      correctOption: q.correct,
                      correctAnswer: q.options[q.correct]
                    })),
                    answers: state[quizStateKey].answers.map((a, idx) => ({
                      ...a,
                      questionNumber: idx + 1,
                      question: block.questions[a.questionIndex].question,
                      selectedAnswer: block.questions[a.questionIndex].options[a.selected],
                      correctAnswer: block.questions[a.questionIndex].options[block.questions[a.questionIndex].correct]
                    })),
                    score: state[quizStateKey].score,
                    totalQuestions: block.questions.length,
                    percentage: Math.round((state[quizStateKey].score / block.questions.length) * 100),
                    completedAt: new Date().toISOString()
                  }
                  block.onComplete(completeData)
                } catch (e) {
                  console.error('[Quiz Block] onComplete callback error:', e)
                }
              }
            }

            // Note: StateManager will automatically trigger re-render on state change
          }

          window[resetHandlerId] = () => {
            state[quizStateKey].currentQuestion = 0
            state[quizStateKey].score = 0
            state[quizStateKey].answers = []
            state[quizStateKey].completed = false

            // Note: StateManager will automatically trigger re-render on state change
          }
        }

        if (isCompleted) {
          // Show results
          const percentage = Math.round((quizState.score / totalQuestions) * 100)
          return `
            <div class="quiz-container" style="border: 2px solid var(--pico-primary); border-radius: var(--pico-border-radius); padding: 1.5rem; margin: 1rem 0;">
              ${title}
              <div class="quiz-results">
                <h2 style="color: var(--pico-primary);">Quiz Complete!</h2>
                <p style="font-size: 1.5rem; margin: 1rem 0;">
                  Score: <strong>${quizState.score}/${totalQuestions}</strong> (${percentage}%)
                </p>
                <button onclick="${resetHandlerId}()" class="secondary">
                  <i data-lucide="refresh-cw"></i> Retry Quiz
                </button>
              </div>
            </div>
          `
        }

        // Show current question
        const questionNumber = quizState.currentQuestion + 1

        // Debug: Log handler ID being used in onclick
        if (typeof console !== 'undefined') {
          console.log('[Quiz Block] Creating buttons with handler:', answerHandlerId, 'Window has handler:', typeof window !== 'undefined' ? typeof window[answerHandlerId] : 'N/A')
        }

        const optionsHtml = currentQ.options.map((option, idx) => {
          return `
            <button
              onclick="${answerHandlerId}(${idx}, this)"
              class="outline"
              style="display: block; width: 100%; margin-bottom: 0.5rem; text-align: left;"
            >
              ${String.fromCharCode(65 + idx)}. ${interpolate(option, ctx)}
            </button>
          `
        }).join('')

        return `
          <div class="quiz-container" style="border: 2px solid var(--pico-primary); border-radius: var(--pico-border-radius); padding: 1.5rem; margin: 1rem 0;">
            ${title}
            <div class="quiz-progress" style="margin-bottom: 1rem;">
              <small class="secondary">Question ${questionNumber} of ${totalQuestions}</small>
              <progress value="${questionNumber}" max="${totalQuestions}" style="width: 100%; margin-top: 0.5rem;"></progress>
            </div>
            <div class="quiz-question">
              <h4 style="margin-bottom: 1rem;">${interpolate(currentQ.question, ctx)}</h4>
              <div class="quiz-options">
                ${optionsHtml}
              </div>
            </div>
          </div>
        `
      } catch (e) {
        return renderError('quiz', e, block)
      }
    }
  }

  // Render a content block
  // Context parameter allows loop variables and other scoped data to flow through
  const renderBlock = (block, context = {}) => {
    try {
      // Merge passed context with state/site (passed context takes precedence for loop vars)
      const fullContext = { state, site, ...state, ...context }

      // v2: Conditional rendering with if/then/else structure
      if (v2Enabled && conditionalRenderer && block.if && (block.then || block.else)) {
        return conditionalRenderer.render(block, fullContext)
      }

      // v2: Inline "if" on any block with a type - simpler syntax
      // Example: { "type": "markdown", "content": "Hello", "if": "state.show" }
      if (v2Enabled && expressionEvaluator && block.if && block.type) {
        try {
          const condition = expressionEvaluator.evaluate(block.if, fullContext)
          if (!condition) {
            return '' // Condition false - don't render this block
          }
          // Condition true - continue to render the block
        } catch (e) {
          console.warn('Inline if evaluation failed:', block.if, e.message)
          return '' // On error, don't render
        }
      }

      // v2: Loop rendering
      if (v2Enabled && loopRenderer && block.each) {
        return loopRenderer.render(block, fullContext)
      }

      // Component reference
      if (block.$ref) {
        const compTemplate = components[block.$ref]
        if (!compTemplate) {
          throw new Error(`Component not found: ${block.$ref}`)
        }
        // Validate component is a string template
        if (typeof compTemplate !== 'string') {
          throw new Error(`Component "${block.$ref}" must be an HTML string, not ${typeof compTemplate}. Define components as: "components": { "${block.$ref}": "<div>{{title}}</div>" }`)
        }
        const { $ref, ...props } = block
        return interpolate(processEach(compTemplate, props), { ...props, ...fullContext })
      }

      if (!block.type) {
        throw new Error('Block missing type property')
      }

      const renderer = renderers[block.type]
      if (!renderer) {
        throw new Error(`Unknown block type: ${block.type}`)
      }

      // Pass context to renderers that support it
      return renderer(block, fullContext)
    } catch (e) {
      return renderError(block.type || 'unknown', e, block)
    }
  }

  // Resolve $import references in JSON
  const resolveImport = async (obj, basePath = '') => {
    if (!obj || typeof obj !== 'object') return obj

    // If this object has $import, fetch and return the imported JSON
    if (obj.$import) {
      const importPath = obj.$import

      // Check cache first
      if (importCache.has(importPath)) {
        return importCache.get(importPath)
      }

      // Check if already fetching (avoid duplicate requests)
      if (pendingImports.has(importPath)) {
        return await pendingImports.get(importPath)
      }

      // Fetch the import
      const fetchPromise = (async () => {
        try {
          const res = await fetch(importPath)
          if (!res.ok) {
            console.warn(`[Render.js] Failed to load import: ${importPath}`)
            return null
          }
          const data = await res.json()

          // Recursively resolve imports in the loaded data
          const resolved = await resolveImport(data, importPath)

          // Cache the result
          importCache.set(importPath, resolved)
          return resolved
        } catch (e) {
          console.error(`[Render.js] Error loading import ${importPath}:`, e)
          return null
        } finally {
          pendingImports.delete(importPath)
        }
      })()

      pendingImports.set(importPath, fetchPromise)
      return await fetchPromise
    }

    // For arrays, resolve imports in each item
    if (Array.isArray(obj)) {
      return await Promise.all(obj.map(item => resolveImport(item, basePath)))
    }

    // For objects, resolve imports in each property
    const resolved = {}
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = await resolveImport(value, basePath)
    }
    return resolved
  }

  // Get layout wrapper classes
  const getLayoutClasses = () => {
    const layout = nav.layout || 'horizontal'
    if (layout === 'vertical' || layout === 'both') {
      return 'has-sidebar'
    }
    return ''
  }

  // Main render function
  const render = async (scrollToTop = true) => {
    try {
      const path = location.pathname
      let page = pages.find(p => p.path === path) || pages.find(p => p.path === '/') || pages[0]

      if (!page) {
        document.querySelector(config.target).innerHTML = `
          <div class="error-card" role="alert">
            <div class="error-header">
              <i data-lucide="alert-circle"></i>
              <strong>Page not found</strong>
            </div>
            <p>The page <code>${path}</code> does not exist.</p>
            <a href="/" data-route role="button">Go to homepage</a>
          </div>
        `
        return
      }

      // Lazy load: If page has $import, resolve it now
      if (page.$import && !page.content) {
        const imported = await resolveImport(page)
        if (imported) {
          // Merge imported content with page metadata
          page = { ...page, ...imported }
          // Update the pages array with the resolved content
          const pageIndex = pages.findIndex(p => p.path === path)
          if (pageIndex >= 0) {
            pages[pageIndex] = page
          }
        }
      }

      // Update document meta
      document.title = page.meta?.title ? `${page.meta.title} | ${site.title}` : site.title
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc && page.meta?.description) metaDesc.content = page.meta.description

      // Render page with JSON path tracking
      const pageIndex = pages.findIndex(p => p.path === page.path)
      const contentHtml = (page.content || []).map((block, idx) => {
        currentJsonPath = `pages[${pageIndex}].content[${idx}]`
        return renderBlock(block)
      }).join('')
      currentJsonPath = '' // Reset after rendering
      const layoutClasses = getLayoutClasses()

      document.querySelector(config.target).innerHTML = `
        <div class="render-layout ${layoutClasses}">
          ${renderNav()}
          <main class="container main-content">${contentHtml}</main>
          ${renderFooter()}
        </div>
      `

      // Initialize Lucide icons
      if (window.lucide) lucide.createIcons()

      // Initialize Mermaid diagrams
      initializeMermaidDiagrams()

      // Initialize Frappe Charts
      initializeFrappeCharts()

      // Apply custom theme (including color theme from state)
      applyCustomTheme()

      // Only scroll to top on navigation, not on state changes
      if (scrollToTop) {
        window.scrollTo(0, 0)
      }

    } catch (e) {
      logError('Render Error', 'Critical error during page render', { error: e.message, stack: e.stack })
      document.querySelector(config.target).innerHTML = `
        <div class="error-card critical" role="alert">
          <div class="error-header">
            <i data-lucide="alert-triangle"></i>
            <strong>Critical Render Error</strong>
          </div>
          <p>${e.message}</p>
          <button onclick="location.reload()" role="button">Reload Page</button>
        </div>
      `
    }
  }

  // Client-side routing
  const setupRouting = () => {
    document.addEventListener('click', async (e) => {
      const link = e.target.closest('a[data-route]')
      if (link) {
        e.preventDefault()
        const href = link.getAttribute('href')
        history.pushState({}, '', href)

        // Close mobile dropdown if open
        const dropdown = document.querySelector('.dropdown')
        if (dropdown) dropdown.removeAttribute('open')

        await render()

        // Handle hash scrolling
        const hash = href.split('#')[1]
        if (hash) {
          setTimeout(() => {
            const element = document.getElementById(hash)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }, 100)
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    })

    window.addEventListener('popstate', render)
  }

  // Theme management
  const getPreferredTheme = () => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme')
    setTheme(current === 'dark' ? 'light' : 'dark')
  }

  // Apply custom theme
  const applyCustomTheme = () => {
    const theme = site.theme || {}

    // Inject font URL if provided
    if (theme.fontUrl) {
      const existingFont = document.querySelector('link[data-render-font]')
      if (existingFont) existingFont.remove()

      const fontLink = document.createElement('link')
      fontLink.rel = 'stylesheet'
      fontLink.href = theme.fontUrl
      fontLink.setAttribute('data-render-font', 'true')
      document.head.appendChild(fontLink)
    }

    // Apply CSS custom properties
    const root = document.documentElement

    if (theme.fontFamily) {
      root.style.setProperty('--pico-font-family', theme.fontFamily)
    }

    if (theme.fontSize) {
      // Apply font size scale (default 100 = 100%)
      const scale = theme.fontSize / 100
      root.style.fontSize = `${scale * 100}%`
    }

    if (theme.primaryColor) {
      root.style.setProperty('--pico-primary', theme.primaryColor)
      root.style.setProperty('--pico-primary-hover', theme.primaryColor)
      root.style.setProperty('--pico-primary-focus', theme.primaryColor)
    }

    if (theme.secondaryColor) {
      root.style.setProperty('--pico-secondary', theme.secondaryColor)
      root.style.setProperty('--pico-secondary-hover', theme.secondaryColor)
      root.style.setProperty('--pico-secondary-focus', theme.secondaryColor)
    }

    // Apply PicoCSS color theme from state using CSS variables
    const colorMap = {
      default: { h: 205, s: '85%', l: '55%' },  // Azure blue
      red: { h: 0, s: '85%', l: '55%' },
      pink: { h: 330, s: '85%', l: '65%' },
      fuchsia: { h: 300, s: '85%', l: '60%' },
      purple: { h: 270, s: '85%', l: '60%' },
      violet: { h: 250, s: '85%', l: '60%' },
      indigo: { h: 230, s: '85%', l: '55%' },
      blue: { h: 210, s: '85%', l: '55%' },
      cyan: { h: 185, s: '85%', l: '50%' },
      jade: { h: 160, s: '70%', l: '45%' },
      green: { h: 140, s: '70%', l: '45%' },
      lime: { h: 80, s: '75%', l: '50%' },
      yellow: { h: 50, s: '95%', l: '55%' },
      amber: { h: 35, s: '95%', l: '55%' },
      pumpkin: { h: 25, s: '95%', l: '55%' },
      orange: { h: 20, s: '95%', l: '55%' },
      zinc: { h: 0, s: '0%', l: '45%' },
      slate: { h: 215, s: '15%', l: '40%' }
    }

    if (state && state.colorTheme) {
      const color = colorMap[state.colorTheme] || colorMap.default
      const { h, s, l } = color

      // Set CSS variables for the color theme
      root.style.setProperty('--pico-primary', `hsl(${h}, ${s}, ${l})`)
      root.style.setProperty('--pico-primary-hover', `hsl(${h}, ${s}, calc(${l} - 5%))`)
      root.style.setProperty('--pico-primary-focus', `hsla(${h}, ${s}, ${l}, 0.25)`)
      root.style.setProperty('--pico-primary-inverse', `hsl(${h}, ${s}, 95%)`)
    }
  }

  // Add "View Page JSON" floating button
  const addViewPageJsonButton = () => {
    // Check if button already exists
    if (document.getElementById('view-page-json-btn')) return

    // Add button
    const button = document.createElement('button')
    button.id = 'view-page-json-btn'
    button.className = 'outline'
    button.innerHTML = '<i data-lucide="code-2"></i>'
    button.title = 'View Page JSON'
    button.style.cssText = 'position: fixed; bottom: 2rem; right: 2rem; z-index: 999; width: 3rem; height: 3rem; padding: 0; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);'
    button.onclick = () => {
      const modal = document.getElementById('page-json-modal')
      if (modal) {
        // Update modal content with current page JSON
        const currentPath = window.location.pathname
        const currentPage = pages.find(p => p.path === currentPath)
        if (currentPage) {
          const codeBlock = document.getElementById('page-json-code')
          if (codeBlock) {
            codeBlock.textContent = JSON.stringify(currentPage, null, 2)
          }
        }
        modal.showModal()
      }
    }
    document.body.appendChild(button)

    // Add modal
    const modal = document.createElement('dialog')
    modal.id = 'page-json-modal'
    modal.className = 'modal-dialog large'
    modal.innerHTML = `
      <article>
        <header>
          <h3>Current Page JSON</h3>
          <button class="close" onclick="document.getElementById('page-json-modal').close()" aria-label="Close">✕</button>
        </header>
        <div class="modal-content">
          <p style="color: var(--pico-muted-color); margin-bottom: 1rem;">This is the JSON configuration for the current page. Copy and paste into your own site.json!</p>
          <pre style="background: var(--pico-card-background-color); padding: 1.5rem; border-radius: 0.5rem; overflow-x: auto; max-height: 60vh;"><code id="page-json-code" style="font-size: 0.875rem; line-height: 1.6;"></code></pre>
        </div>
        <footer>
          <button onclick="
            const code = document.getElementById('page-json-code').textContent;
            navigator.clipboard.writeText(code).then(() => {
              const btn = event.target;
              btn.textContent = '✓ Copied!';
              setTimeout(() => btn.textContent = 'Copy to Clipboard', 2000);
            })
          ">Copy to Clipboard</button>
          <button class="outline" onclick="document.getElementById('page-json-modal').close()">Close</button>
        </footer>
      </article>
    `
    document.body.appendChild(modal)

    // Initialize Lucide icon for button
    if (window.lucide) {
      setTimeout(() => lucide.createIcons(), 100)
    }
  }

  // Initialize
  const init = async (options) => {
    try {
      config = { ...config, ...options }

      let data = options.data
      if (options.src && !data) {
        const res = await fetch(options.src)
        if (!res.ok) throw new Error(`Failed to load ${options.src}: ${res.statusText}`)
        data = await res.json()
      }

      if (!data) throw new Error('No data provided. Pass data object or src URL.')
      if (!data.site) throw new Error('Missing required property: site')
      if (!data.pages) throw new Error('Missing required property: pages')

      site = data.site || {}
      nav = data.nav || {}
      footer = data.footer || {}
      pages = data.pages || []

      // Normalize components - accept both string and object formats
      // This allows LLMs to use either format without errors
      components = {}
      Object.entries(data.components || {}).forEach(([name, comp]) => {
        if (typeof comp === 'string') {
          // Already a string template - use as-is
          components[name] = comp
        } else if (comp && typeof comp === 'object' && comp.html) {
          // Object format: {type: "html", html: "..."} - extract the html string
          components[name] = comp.html
          console.info(`[Render.js] Component "${name}" normalized from object to string format`)
        } else {
          console.warn(`[Render.js] Invalid component "${name}": must be a string or object with "html" property`)
        }
      })

      // Setup functions (internal)
      Object.entries(data.functions || {}).forEach(([name, code]) => {
        functions[name] = createSandboxedFunction(code)
      })

      // Setup reactive state (check both data.state and site.state for backwards compatibility)
      // Store initial state as plain object
      const initialState = { ...(data.state || site.state || {}) }

      // Initialize v2 features if available - do this BEFORE creating reactive state
      // so StateManager can be used directly without double-proxy
      if (typeof ExpressionEvaluator !== 'undefined') {
        v2Enabled = true
        expressionEvaluator = ExpressionEvaluator

        if (typeof ConditionalRenderer !== 'undefined') {
          ConditionalRenderer.init(expressionEvaluator, renderBlock)
          conditionalRenderer = ConditionalRenderer
        }

        if (typeof LoopRenderer !== 'undefined') {
          LoopRenderer.init(expressionEvaluator, renderBlock)
          loopRenderer = LoopRenderer
        }

        // Initialize StateManager if available - use PLAIN object, not proxy
        if (typeof StateManager !== 'undefined') {
          stateManager = new StateManager(initialState)
          // Use StateManager's state directly (no double-proxy)
          state = stateManager.getState()

          // Add listener to re-render on state changes
          stateManager.addListener((changedPaths) => {
            render(false) // Don't scroll on state changes
            reRenderAffectedInjections(changedPaths)
          })
        } else {
          // Fallback to simple reactive proxy if no StateManager
          state = createReactiveState(initialState)
        }
      } else {
        // v1 mode: use simple reactive proxy
        state = createReactiveState(initialState)
      }

      // Register functions globally on window for onclick handlers
      // This must happen AFTER state is created so functions can access Render.state
      Object.entries(data.functions || {}).forEach(([name, code]) => {
        try {
          // Create the function with access to Render context
          const fn = new Function('Render', `"use strict"; return (${code})`)(
            // Pass a proxy that provides access to state and site
            { state, site, navigate: (path) => { history.pushState({}, '', path); render() } }
          )

          // Register on window for direct onclick access
          if (typeof window !== 'undefined') {
            if (window[name] !== undefined && !window[name]._renderFunction) {
              console.warn(`[Render.js] Function "${name}" shadows existing window.${name}. Consider renaming.`)
            }
            window[name] = fn
            window[name]._renderFunction = true // Mark as Render.js function
          }
        } catch (e) {
          console.error(`[Render.js] Failed to register global function "${name}":`, e.message)
          logError('Global Function Error', `Failed to register function "${name}": ${e.message}`, { code })
        }
      })

      // Initialize additional v2 features (DataFetcher, ActionExecutor)
      if (v2Enabled) {

        // Initialize DataFetcher if available
        if (typeof DataFetcher !== 'undefined') {
          dataFetcher = DataFetcher.create({
            stateManager,
            expressionEvaluator
          })
        }

        // Initialize ActionExecutor if available
        if (typeof ActionExecutor !== 'undefined') {
          actionExecutor = new ActionExecutor({
            stateManager,
            dataFetcher,
            expressionEvaluator,
            router: { navigate: (path) => { history.pushState({}, '', path); render() } }
          })
        }
      }

      // Initialize theme
      setTheme(site.defaultTheme || getPreferredTheme())

      // Apply custom theme
      applyCustomTheme()

      // Setup routing and render
      setupRouting()

      // Handle 404 redirects - restore path after server 404
      const redirectPath = sessionStorage.getItem('redirectPath')
      if (redirectPath) {
        sessionStorage.removeItem('redirectPath')
        history.replaceState({}, '', redirectPath)
      }

      await render()

      // Process injections from JSON if provided
      if (data.injections && Array.isArray(data.injections)) {
        processInjections(data.injections).catch(e => {
          console.error('[Render.js] Failed to process injections:', e)
        })
      }

      // Add "View Page JSON" floating button and modal (unless disabled)
      if (config.showJsonButton !== false) {
        addViewPageJsonButton()
      }

    } catch (e) {
      logError('Initialization Error', e.message, { options })
      document.querySelector(config.target).innerHTML = `
        <div class="error-card critical" role="alert">
          <div class="error-header">
            <i data-lucide="alert-triangle"></i>
            <strong>Initialization Error</strong>
          </div>
          <p>${e.message}</p>
          <p>Check the console for details.</p>
        </div>
      `
    }
  }

  // ============================================================================
  // INJECTION SYSTEM - Inject components anywhere without routing
  // ============================================================================

  /**
   * Generate unique injection ID
   */
  const generateInjectionId = () => {
    return `injection-${++injectionIdCounter}-${Date.now()}`
  }

  /**
   * Inject a block into a DOM element
   * @param {string} selector - CSS selector for target element
   * @param {object} block - Block definition (same as page content blocks)
   * @param {object} options - Injection options
   * @returns {string} injection ID for later updates/removal
   */
  const inject = async (selector, block, options = {}) => {
    try {
      // Validate selector
      const targetElement = document.querySelector(selector)
      if (!targetElement) {
        throw new Error(`Injection target not found: ${selector}`)
      }

      // Validate block
      if (!block || (typeof block !== 'object' && !Array.isArray(block))) {
        throw new Error('Block must be an object or array')
      }

      // Generate ID
      const id = options.id || generateInjectionId()

      // Extract options
      const {
        mode = 'replace',
        reactive = true,
        onMount = null,
        onUnmount = null,
        fetch: fetchConfig = null,
        loading = null,
        error = null
      } = options

      // Create registry entry
      const injection = {
        id,
        selector,
        block,
        element: targetElement,
        mode,
        reactive,
        lifecycle: {
          onMount,
          onUnmount,
          mounted: false
        },
        fetchConfig,
        loadingBlock: loading,
        errorBlock: error,
        isStreaming: false,
        parser: null
      }

      // Show loading state if fetching
      if ((fetchConfig || onMount) && loading) {
        const loadingHtml = renderBlock(loading)
        targetElement.innerHTML = loadingHtml
      }

      // Execute onMount actions (including fetch)
      if (onMount || fetchConfig) {
        try {
          // Convert fetchConfig to onMount action if needed
          let mountActions = onMount || []
          if (fetchConfig && !onMount) {
            mountActions = [{
              type: 'fetch',
              ...fetchConfig
            }]
          }

          // Execute actions if we have ActionExecutor
          if (actionExecutor && mountActions.length > 0) {
            await actionExecutor.execute(mountActions, { state, site })
          }

          injection.lifecycle.mounted = true
        } catch (err) {
          console.error('[Render.js] Injection onMount error:', err)

          // Show error state if available
          if (error) {
            const errorHtml = renderBlock(error)
            targetElement.innerHTML = errorHtml
            injectionRegistry.set(id, injection)
            return id
          }

          throw err
        }
      }

      // Render the main block(s)
      // Support both single blocks and arrays of blocks
      const html = Array.isArray(block)
        ? block.map(b => renderBlock(b)).join('')
        : renderBlock(block)

      // Insert into DOM based on mode
      switch (mode) {
        case 'replace':
          targetElement.innerHTML = html
          break
        case 'append':
          targetElement.insertAdjacentHTML('beforeend', html)
          break
        case 'prepend':
          targetElement.insertAdjacentHTML('afterbegin', html)
          break
        default:
          targetElement.innerHTML = html
      }

      // Initialize Lucide icons if available
      if (window.lucide) lucide.createIcons()
      initializeMermaidDiagrams()
      initializeFrappeCharts()

      // Register injection
      injectionRegistry.set(id, injection)

      return id
    } catch (e) {
      logError('Injection Error', e.message, { selector, block })
      return null
    }
  }

  /**
   * Update an existing injection
   * @param {string} id - Injection ID
   * @param {object} newBlock - New block definition
   */
  const updateInjection = async (id, newBlock) => {
    const injection = injectionRegistry.get(id)

    if (!injection) {
      console.error(`[Render.js] Injection not found: ${id}`)
      return false
    }

    try {
      // Update block
      injection.block = newBlock

      // Re-render - support both single blocks and arrays
      const html = Array.isArray(newBlock)
        ? newBlock.map(b => renderBlock(b)).join('')
        : renderBlock(newBlock)
      injection.element.innerHTML = html

      // Initialize Lucide icons if available
      if (window.lucide) lucide.createIcons()
      initializeMermaidDiagrams()
      initializeFrappeCharts()

      return true
    } catch (e) {
      logError('Injection Update Error', e.message, { id, newBlock })
      return false
    }
  }

  /**
   * Destroy an injection and cleanup
   * @param {string} id - Injection ID
   */
  const destroyInjection = async (id) => {
    const injection = injectionRegistry.get(id)

    if (!injection) {
      console.error(`[Render.js] Injection not found: ${id}`)
      return false
    }

    try {
      // Execute onUnmount actions
      if (injection.lifecycle.onUnmount && actionExecutor) {
        await actionExecutor.execute(injection.lifecycle.onUnmount, { state, site })
      }

      // Clear DOM
      injection.element.innerHTML = ''

      // Remove from registry
      injectionRegistry.delete(id)

      return true
    } catch (e) {
      logError('Injection Destroy Error', e.message, { id })
      return false
    }
  }

  /**
   * Re-render injections that use specific state paths
   * @param {array} changedPaths - State paths that changed
   */
  const reRenderAffectedInjections = (changedPaths) => {
    injectionRegistry.forEach((injection, id) => {
      if (!injection.reactive) return

      // Check if this injection uses any of the changed paths
      // For simplicity, re-render all reactive injections
      // TODO: Track state dependencies for more granular updates
      try {
        // Support both single blocks and arrays
        const html = Array.isArray(injection.block)
          ? injection.block.map(b => renderBlock(b)).join('')
          : renderBlock(injection.block)
        injection.element.innerHTML = html

        // Initialize Lucide icons if available
        if (window.lucide) lucide.createIcons()
        initializeMermaidDiagrams()
        initializeFrappeCharts()
      } catch (e) {
        console.error(`[Render.js] Failed to re-render injection ${id}:`, e)
      }
    })
  }

  /**
   * Process injections from JSON manifest
   * @param {array} injections - Array of injection configs from site.json
   */
  const processInjections = async (injections) => {
    if (!Array.isArray(injections)) {
      console.error('[Render.js] processInjections: injections must be an array')
      return
    }

    for (const config of injections) {
      try {
        // Evaluate conditional
        if (config.if) {
          let condition = false

          if (expressionEvaluator) {
            try {
              condition = expressionEvaluator.evaluate(config.if, { state, site })
            } catch (e) {
              console.warn(`[Render.js] Failed to evaluate injection condition: ${config.if}`, e)
              continue
            }
          } else {
            // Fallback: simple state path check
            condition = eval(config.if.replace(/state\./g, 'state.'))
          }

          if (!condition) {
            continue
          }
        }

        // Inject
        await inject(config.target, config.block, {
          id: config.id,
          mode: config.mode,
          reactive: config.reactive !== false,
          onMount: config.onMount,
          onUnmount: config.onUnmount,
          fetch: config.fetch,
          loading: config.loading,
          error: config.error
        })
      } catch (e) {
        console.error('[Render.js] Failed to process injection:', e, config)
      }
    }
  }

  /**
   * Create a streaming injection
   * @param {string} selector - CSS selector for target element
   * @param {object} options - Streaming options
   * @returns {object} Stream object with append/complete methods
   */
  const createStream = (selector, options = {}) => {
    const targetElement = document.querySelector(selector)
    if (!targetElement) {
      throw new Error(`Stream target not found: ${selector}`)
    }

    const id = generateInjectionId()

    // Create parser
    const parser = StreamingJSONParser.create({
      debug: options.debug || false,
      onUpdate: (parsed, meta) => {
        try {
          // Render partial block
          const html = renderBlock(parsed)

          // Add streaming class if incomplete
          const wrapper = meta.isComplete
            ? html
            : `<div class="streaming-incomplete">${html}</div>`

          targetElement.innerHTML = wrapper

          // Initialize Lucide icons if available
          if (window.lucide) lucide.createIcons()
          initializeMermaidDiagrams()
          initializeFrappeCharts()

          // Call user callback
          if (options.onProgress) {
            options.onProgress(parsed, meta)
          }
        } catch (e) {
          console.error('[Render.js] Stream render error:', e)
        }
      },
      onComplete: (final, meta) => {
        try {
          // Final render without streaming class
          if (final) {
            const html = renderBlock(final)
            targetElement.innerHTML = html

            // Initialize Lucide icons if available
            if (window.lucide) lucide.createIcons()
            initializeMermaidDiagrams()
            initializeFrappeCharts()
          }

          // Register as regular injection
          if (final) {
            injectionRegistry.set(id, {
              id,
              selector,
              block: final,
              element: targetElement,
              mode: 'replace',
              reactive: options.reactive !== false,
              lifecycle: {
                onMount: null,
                onUnmount: null,
                mounted: true
              },
              isStreaming: false,
              parser: null
            })
          }

          // Call user callback
          if (options.onComplete) {
            options.onComplete(final, meta)
          }
        } catch (e) {
          console.error('[Render.js] Stream complete error:', e)
        }
      },
      onError: (error) => {
        if (options.onError) {
          options.onError(error)
        }
      }
    })

    // Register as streaming injection
    injectionRegistry.set(id, {
      id,
      selector,
      block: null,
      element: targetElement,
      mode: 'replace',
      reactive: false,
      lifecycle: { onMount: null, onUnmount: null, mounted: false },
      isStreaming: true,
      parser
    })

    // Return stream object
    return {
      id,
      append: (chunk) => parser.append(chunk),
      complete: () => parser.complete(),
      cancel: () => {
        parser.cancel()
        destroyInjection(id)
      },
      getState: () => parser.getState()
    }
  }

  // ============================================================================
  // END INJECTION SYSTEM
  // ============================================================================

  // Public API
  return {
    init,
    navigate: async (path) => {
      history.pushState({}, '', path)
      await render()
    },
    toggleTheme,
    showError: showErrorModal,
    get state() { return state },
    get errors() { return errors },
    on: (event, fn) => document.addEventListener(`render:${event}`, fn),
    // Injection API
    inject,
    updateInjection,
    destroyInjection,
    processInjections,
    createStream,
    getInjections: () => Array.from(injectionRegistry.values())
  }
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Render
  globalThis.Render = Render
}
