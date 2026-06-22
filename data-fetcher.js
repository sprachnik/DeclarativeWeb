// DataFetcher - API data fetching with caching for Render.js v2
// Enables declarative data loading from APIs with state integration

const DataFetcher = (() => {
  // Factory function to create DataFetcher with dependencies
  const createDataFetcher = (options = {}) => {
    const { stateManager, expressionEvaluator } = options

    // Cache for fetched data
    const cache = new Map()

    // Pending requests (for deduplication)
    const pending = new Map()

    // Evaluate expressions in a value using state context
    const evaluateValue = (value) => {
      if (!expressionEvaluator || !stateManager) {
        return value
      }

      if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
        try {
          const context = {
            state: stateManager.getState()
          }

          // Replace all {{...}} expressions in the string
          return value.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
            try {
              const result = expressionEvaluator.evaluate(expr.trim(), context)
              return String(result)
            } catch (err) {
              console.warn(`DataFetcher: Failed to evaluate expression: ${match}`, err)
              return match
            }
          })
        } catch (error) {
          console.warn(`DataFetcher: Failed to evaluate expression: ${value}`, error)
          return value
        }
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

    // Evaluate expressions in config (url, headers, params)
    const evaluateConfig = (config) => {
      return {
        ...config,
        url: evaluateValue(config.url),
        headers: config.headers ? evaluateValue(config.headers) : {},
        params: config.params ? evaluateValue(config.params) : {}
      }
    }

    // Build cache key from request config
    const getCacheKey = (config) => {
      const url = config.url
      const method = config.method || 'GET'
      const params = config.params ? JSON.stringify(config.params) : ''
      return `${method}:${url}:${params}`
    }

    // Build full URL with query params (for GET requests)
    const buildUrl = (url, params, method) => {
      if (!params || method !== 'GET') {
        return url
      }

      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value != null) {
          searchParams.append(key, String(value))
        }
      })

      const queryString = searchParams.toString()
      if (!queryString) {
        return url
      }

      return url + (url.includes('?') ? '&' : '?') + queryString
    }

    // Perform the actual fetch
    const performFetch = async (config) => {
      const url = config.url
      const method = config.method || 'GET'
      const headers = config.headers || {}
      const params = config.params || {}

      // Build request options
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }

      // Add body for non-GET requests
      if (method !== 'GET' && Object.keys(params).length > 0) {
        options.body = JSON.stringify(params)
      }

      // Build final URL
      const finalUrl = buildUrl(url, params, method)

      // Fetch (use globalThis to avoid name collision with internal fetch function)
      const globalFetch = typeof window !== 'undefined' ? window.fetch : globalThis.fetch
      const response = await globalFetch(finalUrl, options)

      // Check for errors
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Parse JSON
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      }

      // Fallback to text
      return await response.text()
    }

    // Fetch data with caching and deduplication
    const fetch = async (config) => {
      // Validate config
      if (!config || !config.url) {
        throw new Error('DataFetcher: url is required')
      }

      // Evaluate expressions in config
      const evaluatedConfig = evaluateConfig(config)

      const cacheKey = getCacheKey(evaluatedConfig)

      // Check cache first (if not disabled)
      if (!evaluatedConfig.noCache && cache.has(cacheKey)) {
        return cache.get(cacheKey)
      }

      // Check if request is already pending (deduplication)
      if (pending.has(cacheKey)) {
        return await pending.get(cacheKey)
      }

      // Create new request
      const requestPromise = performFetch(evaluatedConfig)
        .then(data => {
          // Store in cache
          if (!evaluatedConfig.noCache) {
            cache.set(cacheKey, data)
          }

          // Remove from pending
          pending.delete(cacheKey)

          return data
        })
        .catch(error => {
          // Remove from pending on error
          pending.delete(cacheKey)
          throw error
        })

      // Store in pending
      pending.set(cacheKey, requestPromise)

      return await requestPromise
    }

    // Clear cache entry or entire cache
    const clearCache = (url) => {
      if (url) {
        // Clear specific URL (all methods/params)
        const keys = Array.from(cache.keys())
        keys.forEach(key => {
          if (key.includes(url)) {
            cache.delete(key)
          }
        })
      } else {
        // Clear entire cache
        cache.clear()
      }
    }

    // Get cache statistics
    const getCacheStats = () => {
      return {
        size: cache.size,
        pending: pending.size,
        keys: Array.from(cache.keys())
      }
    }

    // Prefetch data (for preloading)
    const prefetch = async (config) => {
      try {
        await fetch(config)
        return true
      } catch (error) {
        console.warn('DataFetcher prefetch failed:', error.message)
        return false
      }
    }

    // Batch fetch multiple requests
    const fetchAll = async (configs) => {
      if (!Array.isArray(configs)) {
        throw new Error('fetchAll requires an array of configs')
      }

      const promises = configs.map(config =>
        fetch(config).catch(error => ({ error: error.message }))
      )

      return await Promise.all(promises)
    }

    // Transform response data
    const transform = (data, transformFn) => {
      if (typeof transformFn !== 'function') {
        return data
      }

      try {
        return transformFn(data)
      } catch (error) {
        throw new Error(`Transform function failed: ${error.message}`)
      }
    }

    // Main fetch with all features
    const fetchData = async (config) => {
      try {
        // Fetch the data
        let data = await fetch(config)

        // Apply transform if specified
        if (config.transform) {
          data = transform(data, config.transform)
        }

        return {
          data,
          error: null,
          loading: false
        }
      } catch (error) {
        return {
          data: null,
          error: error.message,
          loading: false
        }
      }
    }

    return {
      fetch,
      fetchData,
      fetchAll,
      prefetch,
      clearCache,
      getCacheStats,
      transform
    }
  }

  // Create default instance (for backward compatibility)
  const defaultInstance = createDataFetcher()

  // Export both factory and default instance
  return {
    create: createDataFetcher,
    ...defaultInstance
  }
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataFetcher
  globalThis.DataFetcher = DataFetcher
}
