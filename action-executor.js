/**
 * ActionExecutor - Execute actions with state management
 *
 * Features:
 * - Core actions: setState, navigate, resetState, logout
 * - Action chaining (execute multiple actions in sequence)
 * - Result storage (save action results to state)
 * - Expression evaluation in action parameters
 * - Error handling and logging
 */

const ActionExecutor = (() => {
  class ActionExecutor {
    constructor(dependencies = {}) {
      // Dependencies
      this.stateManager = dependencies.stateManager
      this.dataFetcher = dependencies.dataFetcher
      this.expressionEvaluator = dependencies.expressionEvaluator
      this.router = dependencies.router

      // Action handlers registry
      this.handlers = {
        setState: this.handleSetState.bind(this),
        navigate: this.handleNavigate.bind(this),
        resetState: this.handleResetState.bind(this),
        logout: this.handleLogout.bind(this),
        fetch: this.handleFetch.bind(this)
      }

      // Action execution history (for debugging)
      this.history = []
      this.maxHistorySize = 50
    }

    /**
     * Register a custom action handler
     */
    registerAction(type, handler) {
      if (typeof handler !== 'function') {
        throw new Error('Action handler must be a function')
      }

      this.handlers[type] = handler
    }

    /**
     * Execute a single action or array of actions
     *
     * @param {Object|Array} action - Action or array of actions to execute
     * @param {Object} context - Execution context (state, event data, etc.)
     * @returns {Promise<any>} Result of the action(s)
     */
    async execute(action, context = {}) {
      // Handle action arrays (chaining)
      if (Array.isArray(action)) {
        return this.executeChain(action, context)
      }

      // Validate action
      if (!action || typeof action !== 'object') {
        throw new Error('Action must be an object or array of objects')
      }

      if (!action.type) {
        throw new Error('Action must have a "type" property')
      }

      // Get handler
      const handler = this.handlers[action.type]
      if (!handler) {
        console.warn(`Unknown action type: ${action.type}`)
        return null
      }

      // Build execution context
      const execContext = {
        ...context,
        state: this.stateManager ? this.stateManager.getState() : {},
        results: context.results || {}
      }

      // Evaluate expressions in action parameters
      const evaluatedAction = this.evaluateActionParams(action, execContext)

      try {
        // Execute handler
        const result = await handler(evaluatedAction, execContext)

        // Record in history
        this.recordHistory(action.type, evaluatedAction, result)

        // Save result if requested
        if (action.saveAs && this.stateManager) {
          this.stateManager.state[action.saveAs] = result
        }

        return result
      } catch (error) {
        console.error(`Render.js ActionExecutor: Error executing action "${action.type}":`, error)
        throw error
      }
    }

    /**
     * Execute a chain of actions in sequence
     */
    async executeChain(actions, context = {}) {
      const results = {}
      let lastResult = null

      for (const action of actions) {
        const execContext = {
          ...context,
          results,
          lastResult
        }

        lastResult = await this.execute(action, execContext)

        // Store result if saveAs is specified
        if (action.saveAs) {
          results[action.saveAs] = lastResult
        }
      }

      return {
        results,
        lastResult
      }
    }

    /**
     * Evaluate expressions in action parameters
     */
    evaluateActionParams(action, context) {
      if (!this.expressionEvaluator) {
        return action
      }

      const evaluated = { ...action }

      // Recursively evaluate object properties
      const evaluateValue = (value) => {
        if (typeof value === 'string') {
          // Check for expression syntax {{...}}
          if (value.includes('{{') && value.includes('}}')) {
            try {
              // Check if the entire string is a single expression
              const singleExprMatch = value.match(/^\{\{([^}]+)\}\}$/)
              if (singleExprMatch) {
                // Return raw value to preserve type
                try {
                  return this.expressionEvaluator.evaluate(singleExprMatch[1].trim(), context)
                } catch (err) {
                  console.warn(`ActionExecutor: Failed to evaluate expression: ${value}`, err)
                  return value
                }
              }

              // Replace all {{...}} expressions in the string
              return value.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
                try {
                  const result = this.expressionEvaluator.evaluate(expr.trim(), context)
                  return String(result)
                } catch (err) {
                  console.warn(`ActionExecutor: Failed to evaluate expression: ${match}`, err)
                  return match
                }
              })
            } catch (error) {
              console.warn(`ActionExecutor: Failed to evaluate expression: ${value}`, error)
              return value
            }
          }
          return value
        }

        if (Array.isArray(value)) {
          return value.map(evaluateValue)
        }

        if (value && typeof value === 'object') {
          const result = {}
          for (const [key, val] of Object.entries(value)) {
            result[key] = evaluateValue(val)
          }
          return result
        }

        return value
      }

      // Evaluate all action parameters
      for (const [key, value] of Object.entries(action)) {
        if (key !== 'type') {
          evaluated[key] = evaluateValue(value)
        }
      }

      return evaluated
    }

    /**
     * setState action handler
     * Updates state with provided values
     */
    handleSetState(action, context) {
      if (!this.stateManager) {
        console.warn('setState action requires a StateManager')
        return null
      }

      if (!action.updates || typeof action.updates !== 'object') {
        throw new Error('setState action requires "updates" object')
      }

      const changedPaths = this.stateManager.setState(action.updates)

      return {
        type: 'setState',
        changedPaths,
        updates: action.updates
      }
    }

    /**
     * navigate action handler
     * Navigate to a route
     */
    handleNavigate(action, context) {
      if (!action.path) {
        throw new Error('navigate action requires "path" property')
      }

      // Use router if available
      if (this.router && typeof this.router.navigate === 'function') {
        this.router.navigate(action.path)
      } else if (typeof window !== 'undefined') {
        // Fallback to window.location
        window.location.href = action.path
      } else {
        console.warn('No router available for navigation')
      }

      return {
        type: 'navigate',
        path: action.path
      }
    }

    /**
     * resetState action handler
     * Reset state to initial values
     */
    handleResetState(action, context) {
      if (!this.stateManager) {
        console.warn('resetState action requires a StateManager')
        return null
      }

      // Reset specific keys or all state
      this.stateManager.reset(action.keys)

      return {
        type: 'resetState',
        keys: action.keys || 'all'
      }
    }

    /**
     * logout action handler
     * Clear state, cache, and optionally redirect
     */
    handleLogout(action, context) {
      // Reset state
      if (this.stateManager) {
        this.stateManager.reset()
      }

      // Clear cache
      if (this.dataFetcher && typeof this.dataFetcher.clearCache === 'function') {
        this.dataFetcher.clearCache()
      }

      // Clear localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        // Only clear app-specific keys if specified
        if (action.clearLocalStorage !== false) {
          window.localStorage.clear()
        }
      }

      // Redirect
      if (action.redirect) {
        if (this.router && typeof this.router.navigate === 'function') {
          this.router.navigate(action.redirect)
        } else if (typeof window !== 'undefined') {
          window.location.href = action.redirect
        }
      }

      return {
        type: 'logout',
        redirect: action.redirect || null
      }
    }

    /**
     * fetch action handler
     * Fetch data from an API
     */
    async handleFetch(action, context) {
      if (!this.dataFetcher) {
        console.warn('fetch action requires a DataFetcher')
        return null
      }

      if (!action.url) {
        throw new Error('fetch action requires "url" property')
      }

      // Build fetch config (DataFetcher expects a config object)
      const fetchConfig = {
        url: action.url,
        method: action.method || 'GET',
        headers: action.headers || {},
        params: action.params || {},
        body: action.body
      }

      // Execute fetch
      const result = await this.dataFetcher.fetch(fetchConfig)

      return result
    }

    /**
     * Record action in history
     */
    recordHistory(type, action, result) {
      this.history.push({
        type,
        action,
        result,
        timestamp: Date.now()
      })

      // Keep history size manageable
      if (this.history.length > this.maxHistorySize) {
        this.history.shift()
      }
    }

    /**
     * Get execution history
     */
    getHistory() {
      return this.history.slice()
    }

    /**
     * Clear execution history
     */
    clearHistory() {
      this.history = []
    }
  }

  return ActionExecutor
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActionExecutor
}
