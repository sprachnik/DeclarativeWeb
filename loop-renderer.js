// LoopRenderer - Loop/iteration rendering for Render.js v2
// Enables each/as loops with metadata (index, first, last, length)

const LoopRenderer = (() => {
  let expressionEvaluator = null
  let blockRenderer = null

  // Initialize with dependencies
  const init = (evaluator, renderer) => {
    expressionEvaluator = evaluator
    blockRenderer = renderer
  }

  // Check if a block is a loop
  const isLoop = (block) => {
    return !!(block && typeof block === 'object' && 'each' in block)
  }

  // Resolve the array to iterate over
  const resolveArray = (expression, context) => {
    if (!expressionEvaluator) {
      throw new Error('LoopRenderer not initialized. Call init() with ExpressionEvaluator and block renderer.')
    }

    // Evaluate the expression to get the array
    const value = expressionEvaluator.evaluate(expression, context)

    // Ensure it's an array
    if (value == null) {
      return []
    }

    if (!Array.isArray(value)) {
      throw new Error(`Loop expression must evaluate to an array, got ${typeof value}`)
    }

    return value
  }

  // Render loop
  const render = (block, context) => {
    if (!isLoop(block)) {
      throw new Error('Block is not a loop (missing "each" property)')
    }

    try {
      // Resolve the array
      const items = resolveArray(block.each, context)

      // Handle empty array
      if (items.length === 0) {
        if (block.empty) {
          // Render empty state
          if (Array.isArray(block.empty)) {
            return block.empty.map(b => blockRenderer(b, context)).join('')
          }
          return blockRenderer(block.empty, context)
        }
        return ''
      }

      // Determine variable name for loop item
      const itemVar = block.as || 'item'

      // Render each item
      const results = items.map((item, index) => {
        // Create loop context with metadata
        const loopContext = {
          ...context,
          [itemVar]: item,
          loop: {
            index,
            number: index + 1,
            first: index === 0,
            last: index === items.length - 1,
            length: items.length
          }
        }

        // Determine what to render
        let blockToRender

        if (block.template) {
          // Render a specific template/component
          if (typeof block.template === 'string') {
            // Component reference
            blockToRender = { $ref: block.template }
          } else {
            // Inline template block
            blockToRender = block.template
          }
        } else {
          // Use the block itself (without loop properties)
          const { each, as, empty, ...restBlock } = block
          blockToRender = restBlock
        }

        return blockRenderer(blockToRender, loopContext)
      })

      return results.join('')

    } catch (error) {
      throw new Error(`Loop rendering failed: ${error.message}`)
    }
  }

  // Render with error handling
  const renderSafe = (block, context, options = {}) => {
    try {
      return render(block, context)
    } catch (error) {
      if (options.throwOnError) {
        throw error
      }

      // Return error card
      return `
        <div class="error-card" style="border: 1px solid #ef4444; background: #fef2f2; padding: 1rem; border-radius: 0.375rem; margin: 1rem 0;">
          <h4 style="color: #dc2626; margin: 0 0 0.5rem 0;">Loop Render Error</h4>
          <p style="margin: 0; color: #991b1b;">${escapeHtml(error.message)}</p>
          <details style="margin-top: 0.5rem;">
            <summary style="cursor: pointer; color: #b91c1c;">View loop definition</summary>
            <pre style="margin: 0.5rem 0 0 0; padding: 0.5rem; background: #fff; border-radius: 0.25rem; overflow-x: auto;"><code>${escapeHtml(JSON.stringify(block, null, 2))}</code></pre>
          </details>
        </div>
      `
    }
  }

  // Helper: Escape HTML for error messages
  const escapeHtml = (str) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  return {
    init,
    isLoop,
    render,
    renderSafe
  }
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoopRenderer
  globalThis.LoopRenderer = LoopRenderer
}
