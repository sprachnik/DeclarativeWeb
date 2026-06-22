/**
 * StreamingJSONParser - Incremental JSON parser for real-time LLM streaming
 *
 * Handles incomplete/broken JSON gracefully by auto-completing partial structures.
 * Designed for progressive rendering as JSON streams in chunk-by-chunk.
 *
 * Features:
 * - Incremental parsing (parses as chunks arrive)
 * - Auto-completion of incomplete JSON
 * - Error recovery and fallback strategies
 * - Progressive callbacks on valid updates
 * - Visual state tracking (complete/incomplete)
 */

const StreamingJSONParser = (() => {
  class StreamingJSONParser {
    constructor(options = {}) {
      // Configuration
      this.onUpdate = options.onUpdate || (() => {})
      this.onComplete = options.onComplete || (() => {})
      this.onError = options.onError || (() => {})
      this.debug = options.debug || false

      // Buffer state
      this.buffer = ''
      this.lastValidJSON = null
      this.lastValidBuffer = ''
      this.lastIsComplete = false
      this.parseAttempts = 0
      this.completed = false

      // Metadata
      this.startTime = Date.now()
      this.updateCount = 0
    }

    /**
     * Strip markdown code fences from LLM responses
     * Handles ```json, ```, and variations
     */
    stripMarkdownFences(text) {
      if (!text) return text
      return text
        .replace(/^```(?:json)?\s*\n?/gm, '')  // Opening fence: ```json or ```
        .replace(/\n?```\s*$/gm, '')            // Closing fence: ```
    }

    /**
     * Append a chunk of JSON data
     */
    append(chunk) {
      if (this.completed) {
        console.warn('StreamingJSONParser: Parser already completed, ignoring append')
        return
      }

      if (typeof chunk !== 'string') {
        console.error('StreamingJSONParser: Chunk must be a string')
        return
      }

      // Filter out markdown fences from incoming chunks
      const cleanedChunk = chunk
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')

      this.buffer += cleanedChunk
      this.parseAttempts++

      const parsed = this.tryParse()

      if (parsed !== null) {
        // Check if content or completion status changed
        const isComplete = this.isLikelyComplete()
        const contentChanged = JSON.stringify(parsed) !== JSON.stringify(this.lastValidJSON)
        const completionChanged = this.lastIsComplete !== isComplete
        const hasChanged = contentChanged || completionChanged

        this.lastValidJSON = parsed
        this.lastValidBuffer = this.buffer
        this.lastIsComplete = isComplete

        if (hasChanged) {
          this.updateCount++

          try {
            this.onUpdate(parsed, {
              isComplete,
              buffer: this.buffer,
              updateCount: this.updateCount
            })
          } catch (error) {
            console.error('StreamingJSONParser: Error in onUpdate callback:', error)
          }
        }
      }

      return parsed
    }

    /**
     * Try to parse the current buffer
     */
    tryParse() {
      // Strip any remaining markdown fences from the buffer
      const cleanBuffer = this.stripMarkdownFences(this.buffer)
      if (cleanBuffer !== this.buffer) {
        this.buffer = cleanBuffer
      }

      // Strategy 1: Try complete JSON first
      try {
        const parsed = JSON.parse(this.buffer)
        return parsed
      } catch (e) {
        // Complete parse failed, try partial
      }

      // Strategy 2: Try partial completion
      const partial = this.parsePartial()
      if (partial !== null) {
        return partial
      }

      // Strategy 3: Return last valid
      if (this.lastValidJSON !== null) {
        return this.lastValidJSON
      }

      return null
    }

    /**
     * Parse partial/incomplete JSON by auto-completing it
     */
    parsePartial() {
      let completed = this.buffer.trim()

      if (!completed) {
        return null
      }

      // Track what we need to close
      const toClose = this.analyzeStructure(completed)

      // Apply completion strategies in order
      completed = this.completeString(completed)
      completed = this.completeProperty(completed)
      completed = this.closeStructures(completed, toClose)

      // Try to parse the completed version
      try {
        return JSON.parse(completed)
      } catch (e) {
        // Fallback: try more aggressive completion strategies
        return this.tryAggressiveCompletion()
      }
    }

    /**
     * Try more aggressive completion strategies when standard completion fails
     */
    tryAggressiveCompletion() {
      let str = this.buffer.trim()

      if (!str) return null

      // Strategy 1: Remove trailing incomplete tokens and close
      const strategies = [
        // Remove trailing comma and close
        () => {
          let s = str
          s = s.replace(/,\s*$/, '')
          const analysis = this.analyzeStructure(s)
          s = this.closeStructures(s, analysis)
          return JSON.parse(s)
        },
        // Remove last incomplete property entirely
        () => {
          let s = str
          // Find last complete property (ends with a complete value before comma or brace)
          const lastCompleteMatch = s.match(/^(.*"[^"]*"\s*:\s*(?:"[^"]*"|true|false|null|-?\d+(?:\.\d+)?|\{[^{}]*\}|\[[^\[\]]*\]))\s*,?\s*"[^"]*$/s)
          if (lastCompleteMatch) {
            s = lastCompleteMatch[1]
            const analysis = this.analyzeStructure(s)
            s = this.closeStructures(s, analysis)
            return JSON.parse(s)
          }
          throw new Error('No match')
        },
        // Try truncating to last valid-looking JSON structure
        () => {
          let s = str
          // Find the last closing brace/bracket and truncate there
          for (let i = s.length - 1; i >= 0; i--) {
            if (s[i] === '}' || s[i] === ']') {
              const attempt = s.substring(0, i + 1)
              try {
                return JSON.parse(attempt)
              } catch {
                // Continue looking
              }
            }
          }
          throw new Error('No valid truncation point')
        }
      ]

      for (const strategy of strategies) {
        try {
          const result = strategy()
          if (result !== null && typeof result === 'object') {
            return result
          }
        } catch {
          // Try next strategy
        }
      }

      return null
    }

    /**
     * Analyze structure to determine what needs closing
     */
    analyzeStructure(str) {
      const stack = []
      let inString = false
      let escapeNext = false

      for (let i = 0; i < str.length; i++) {
        const char = str[i]

        if (escapeNext) {
          escapeNext = false
          continue
        }

        if (char === '\\') {
          escapeNext = true
          continue
        }

        if (char === '"' && !inString) {
          inString = true
        } else if (char === '"' && inString) {
          inString = false
        }

        if (inString) continue

        if (char === '{') {
          stack.push('object')
        } else if (char === '[') {
          stack.push('array')
        } else if (char === '}') {
          if (stack[stack.length - 1] === 'object') {
            stack.pop()
          }
        } else if (char === ']') {
          if (stack[stack.length - 1] === 'array') {
            stack.pop()
          }
        }
      }

      return {
        stack,
        inString,
        needsClosing: stack.length > 0 || inString
      }
    }

    /**
     * Complete unclosed strings
     */
    completeString(str) {
      let inString = false
      let escapeNext = false
      let lastQuoteIndex = -1

      for (let i = 0; i < str.length; i++) {
        const char = str[i]

        if (escapeNext) {
          escapeNext = false
          continue
        }

        if (char === '\\') {
          escapeNext = true
          continue
        }

        if (char === '"') {
          if (inString) {
            inString = false
          } else {
            inString = true
            lastQuoteIndex = i
          }
        }
      }

      // If we're in a string, close it
      if (inString) {
        str += '"'
      }

      return str
    }

    /**
     * Complete incomplete property definitions
     * e.g., {"name": "value", "incomplete -> {"name": "value", "incomplete": ""}
     */
    completeProperty(str) {
      // Check if we're in the middle of a property definition
      const lastColon = str.lastIndexOf(':')
      const lastComma = str.lastIndexOf(',')
      const lastBrace = Math.max(str.lastIndexOf('{'), str.lastIndexOf('['))
      const lastCloseBrace = Math.max(str.lastIndexOf('}'), str.lastIndexOf(']'))

      // If last colon is after last value delimiter, we might need to add a value
      if (lastColon > lastComma && lastColon > lastCloseBrace) {
        const afterColon = str.substring(lastColon + 1).trim()

        // If nothing after colon, or incomplete value
        if (!afterColon || (afterColon && !this.isCompleteValue(afterColon))) {
          // If starts with quote, close the string
          if (afterColon.startsWith('"')) {
            if (!afterColon.endsWith('"') || afterColon.length === 1) {
              // String already closed by completeString
            }
          } else if (afterColon.startsWith('{')) {
            // Object, will be closed by closeStructures
          } else if (afterColon.startsWith('[')) {
            // Array, will be closed by closeStructures
          } else if (!afterColon) {
            // No value started, add empty string
            str += '""'
          }
        }
      }

      // Check for incomplete property name after a comma (e.g., {"a": "b", "inc)
      // Find the last comma that's not inside a string
      let inString = false
      let escapeNext = false
      let lastRelevantComma = -1

      for (let i = 0; i < str.length; i++) {
        const char = str[i]
        if (escapeNext) {
          escapeNext = false
          continue
        }
        if (char === '\\') {
          escapeNext = true
          continue
        }
        if (char === '"') {
          inString = !inString
        }
        if (!inString && char === ',') {
          lastRelevantComma = i
        }
      }

      // If there's a comma after the last colon, check for incomplete property name
      if (lastRelevantComma > lastColon && lastRelevantComma > lastCloseBrace) {
        const afterComma = str.substring(lastRelevantComma + 1).trim()

        // Check if we have an incomplete property name (starts with " but no colon)
        if (afterComma && afterComma.startsWith('"') && !afterComma.includes(':')) {
          const quoteCount = (afterComma.match(/"/g) || []).length
          if (quoteCount === 1) {
            // Incomplete property name, close it and add empty value
            str += '": ""'
          } else if (quoteCount === 2 && afterComma.endsWith('"')) {
            // Property name complete but no colon
            str += ': ""'
          }
        }
      }

      // Check for incomplete property name at the start of an object
      const lastOpenBrace = str.lastIndexOf('{')
      if (lastOpenBrace !== -1 && lastOpenBrace > lastColon) {
        const afterBrace = str.substring(lastOpenBrace + 1).trim()

        // If we have a property name without colon
        if (afterBrace && !afterBrace.includes(':') && afterBrace.startsWith('"')) {
          // Check if property name is incomplete
          const quoteCount = (afterBrace.match(/"/g) || []).length
          if (quoteCount === 1) {
            // Close the property name and add empty value
            str += '": ""'
          } else if (quoteCount === 2) {
            // Property name complete but no colon
            str += ': ""'
          }
        }
      }

      return str
    }

    /**
     * Check if a value looks complete
     */
    isCompleteValue(str) {
      str = str.trim()

      // Complete string
      if (str.startsWith('"') && str.endsWith('"') && str.length > 1) {
        return true
      }

      // Complete number
      if (/^-?\d+(\.\d+)?$/.test(str)) {
        return true
      }

      // Complete boolean or null
      if (['true', 'false', 'null'].includes(str)) {
        return true
      }

      // Complete object or array
      if ((str.startsWith('{') && str.endsWith('}')) ||
          (str.startsWith('[') && str.endsWith(']'))) {
        return true
      }

      return false
    }

    /**
     * Close all unclosed structures
     */
    closeStructures(str, analysis) {
      // Close in reverse order (LIFO)
      for (let i = analysis.stack.length - 1; i >= 0; i--) {
        const type = analysis.stack[i]

        // Remove trailing comma if present before closing
        str = str.trimEnd()
        if (str.endsWith(',')) {
          str = str.slice(0, -1)
        }

        if (type === 'object') {
          str += '}'
        } else if (type === 'array') {
          str += ']'
        }
      }

      return str
    }

    /**
     * Check if buffer looks like complete JSON
     */
    isLikelyComplete() {
      const trimmed = this.buffer.trim()

      if (!trimmed) {
        return false
      }

      // Check balanced braces
      const analysis = this.analyzeStructure(trimmed)

      if (analysis.stack.length > 0 || analysis.inString) {
        return false
      }

      // Try to parse
      try {
        JSON.parse(trimmed)
        return true
      } catch {
        return false
      }
    }

    /**
     * Mark parsing as complete
     */
    complete() {
      if (this.completed) {
        return this.lastValidJSON
      }

      this.completed = true

      const final = this.tryParse()

      if (final !== null) {
        this.lastValidJSON = final
      }

      try {
        this.onComplete(this.lastValidJSON, {
          buffer: this.buffer,
          parseAttempts: this.parseAttempts,
          updateCount: this.updateCount,
          duration: Date.now() - this.startTime
        })
      } catch (error) {
        console.error('StreamingJSONParser: Error in onComplete callback:', error)
      }

      return this.lastValidJSON
    }

    /**
     * Reset parser to initial state
     */
    reset() {
      this.buffer = ''
      this.lastValidJSON = null
      this.lastValidBuffer = ''
      this.lastIsComplete = false
      this.parseAttempts = 0
      this.completed = false
      this.startTime = Date.now()
      this.updateCount = 0
    }

    /**
     * Get current state
     */
    getState() {
      return {
        buffer: this.buffer,
        lastValidJSON: this.lastValidJSON,
        isComplete: this.isLikelyComplete(),
        completed: this.completed,
        parseAttempts: this.parseAttempts,
        updateCount: this.updateCount,
        duration: Date.now() - this.startTime
      }
    }

    /**
     * Get the last successfully parsed JSON
     */
    getLastValid() {
      return this.lastValidJSON
    }

    /**
     * Cancel parsing
     */
    cancel() {
      this.completed = true
      this.buffer = ''
    }
  }

  // Factory function
  const create = (options) => {
    return new StreamingJSONParser(options)
  }

  return {
    create,
    StreamingJSONParser
  }
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StreamingJSONParser
  globalThis.StreamingJSONParser = StreamingJSONParser
}
