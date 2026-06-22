// ConditionalRenderer - Conditional block rendering for Render.js v2
// Enables if/then/else logic in JSON blocks

const ConditionalRenderer = (() => {
  let expressionEvaluator = null
  let blockRenderer = null

  // Initialize with dependencies
  const init = (evaluator, renderer) => {
    expressionEvaluator = evaluator
    blockRenderer = renderer
  }

  // Check if a block is a conditional
  const isConditional = (block) => {
    return !!(block && typeof block === 'object' && 'if' in block)
  }

  // Render conditional block
  const render = (block, context) => {
    if (!expressionEvaluator) {
      throw new Error('ConditionalRenderer not initialized. Call init() with ExpressionEvaluator and block renderer.')
    }

    if (!isConditional(block)) {
      throw new Error('Block is not a conditional (missing "if" property)')
    }

    try {
      // Evaluate condition
      const condition = expressionEvaluator.evaluate(block.if, context)

      // Determine which block to render
      let blockToRender

      if (condition) {
        // Condition is truthy - render 'then' branch or the block itself
        if ('then' in block) {
          blockToRender = block.then
        } else {
          // If no explicit 'then', use the block without the conditional properties
          const { if: _, else: __, ...restBlock } = block
          blockToRender = restBlock
        }
      } else {
        // Condition is falsy - render 'else' branch or nothing
        if ('else' in block) {
          blockToRender = block.else
        } else {
          // No else branch - render nothing
          return ''
        }
      }

      // Handle arrays (multiple blocks)
      if (Array.isArray(blockToRender)) {
        return blockToRender.map(b => blockRenderer(b, context)).join('')
      }

      // Render the selected block
      if (blockToRender && typeof blockToRender === 'object') {
        return blockRenderer(blockToRender, context)
      }

      // Primitive value (shouldn't normally happen, but handle gracefully)
      return String(blockToRender || '')

    } catch (error) {
      throw new Error(`Conditional evaluation failed: ${error.message}`)
    }
  }

  // Render with error handling (returns error HTML on failure)
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
          <h4 style="color: #dc2626; margin: 0 0 0.5rem 0;">Conditional Render Error</h4>
          <p style="margin: 0; color: #991b1b;">${escapeHtml(error.message)}</p>
          <details style="margin-top: 0.5rem;">
            <summary style="cursor: pointer; color: #b91c1c;">View condition</summary>
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
    isConditional,
    render,
    renderSafe
  }
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConditionalRenderer
  globalThis.ConditionalRenderer = ConditionalRenderer
}
