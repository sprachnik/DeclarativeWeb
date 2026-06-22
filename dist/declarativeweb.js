/**
 * DeclarativeWeb v0.0.1-beta
 * A minimal, LLM-friendly JavaScript library for rendering websites from JSON
 * https://github.com/sprachnik/DeclarativeWeb
 */

// === expression-evaluator.js ===
// ExpressionEvaluator - Safe expression parser for Render.js v2
// NO eval() or Function() - completely sandboxed

const ExpressionEvaluator = (() => {
  // Token types
  const TokenType = {
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    IDENTIFIER: 'IDENTIFIER',
    OPERATOR: 'OPERATOR',
    DOT: 'DOT',
    BRACKET_OPEN: 'BRACKET_OPEN',
    BRACKET_CLOSE: 'BRACKET_CLOSE',
    PAREN_OPEN: 'PAREN_OPEN',
    PAREN_CLOSE: 'PAREN_CLOSE',
    COMMA: 'COMMA',
    QUESTION: 'QUESTION',
    COLON: 'COLON',
    EOF: 'EOF'
  }

  // Tokenizer
  class Tokenizer {
    constructor(input) {
      this.input = input.trim()
      this.position = 0
      this.current = this.input[0]
    }

    advance() {
      this.position++
      this.current = this.position < this.input.length ? this.input[this.position] : null
    }

    skipWhitespace() {
      while (this.current && /\s/.test(this.current)) {
        this.advance()
      }
    }

    readNumber() {
      let num = ''
      while (this.current && /[0-9.]/.test(this.current)) {
        num += this.current
        this.advance()
      }
      return parseFloat(num)
    }

    readString(quote) {
      let str = ''
      this.advance() // Skip opening quote
      while (this.current && this.current !== quote) {
        if (this.current === '\\') {
          this.advance()
          // Handle escape sequences
          const escapes = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'" }
          str += escapes[this.current] || this.current
        } else {
          str += this.current
        }
        this.advance()
      }
      this.advance() // Skip closing quote
      return str
    }

    readIdentifier() {
      let id = ''
      while (this.current && /[a-zA-Z0-9_$]/.test(this.current)) {
        id += this.current
        this.advance()
      }
      return id
    }

    readOperator() {
      const ops = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '<', '>', '+', '-', '*', '/', '%', '!']

      // Try multi-character operators first
      for (const op of ops) {
        if (this.input.substring(this.position, this.position + op.length) === op) {
          this.position += op.length
          this.current = this.position < this.input.length ? this.input[this.position] : null
          return op
        }
      }

      throw new Error(`Unknown operator at position ${this.position}`)
    }

    tokenize() {
      const tokens = []

      while (this.current) {
        this.skipWhitespace()
        if (!this.current) break

        // Numbers
        if (/[0-9]/.test(this.current)) {
          tokens.push({ type: TokenType.NUMBER, value: this.readNumber() })
          continue
        }

        // Strings
        if (this.current === '"' || this.current === "'") {
          const quote = this.current
          tokens.push({ type: TokenType.STRING, value: this.readString(quote) })
          continue
        }

        // Identifiers (variables, true, false, null)
        if (/[a-zA-Z_$]/.test(this.current)) {
          const id = this.readIdentifier()

          // Handle boolean and null literals
          if (id === 'true') {
            tokens.push({ type: TokenType.NUMBER, value: true })
          } else if (id === 'false') {
            tokens.push({ type: TokenType.NUMBER, value: false })
          } else if (id === 'null' || id === 'undefined') {
            tokens.push({ type: TokenType.NUMBER, value: null })
          } else {
            tokens.push({ type: TokenType.IDENTIFIER, value: id })
          }
          continue
        }

        // Operators
        if ('+-*/%<>=!&|'.includes(this.current)) {
          tokens.push({ type: TokenType.OPERATOR, value: this.readOperator() })
          continue
        }

        // Dot notation
        if (this.current === '.') {
          tokens.push({ type: TokenType.DOT })
          this.advance()
          continue
        }

        // Brackets (array access)
        if (this.current === '[') {
          tokens.push({ type: TokenType.BRACKET_OPEN })
          this.advance()
          continue
        }

        if (this.current === ']') {
          tokens.push({ type: TokenType.BRACKET_CLOSE })
          this.advance()
          continue
        }

        // Parentheses
        if (this.current === '(') {
          tokens.push({ type: TokenType.PAREN_OPEN })
          this.advance()
          continue
        }

        if (this.current === ')') {
          tokens.push({ type: TokenType.PAREN_CLOSE })
          this.advance()
          continue
        }

        // Comma
        if (this.current === ',') {
          tokens.push({ type: TokenType.COMMA })
          this.advance()
          continue
        }

        // Ternary operator
        if (this.current === '?') {
          tokens.push({ type: TokenType.QUESTION })
          this.advance()
          continue
        }

        if (this.current === ':') {
          tokens.push({ type: TokenType.COLON })
          this.advance()
          continue
        }

        throw new Error(`Unexpected character '${this.current}' at position ${this.position}`)
      }

      tokens.push({ type: TokenType.EOF })
      return tokens
    }
  }

  // Parser
  class Parser {
    constructor(tokens) {
      this.tokens = tokens
      this.position = 0
      this.current = this.tokens[0]
    }

    advance() {
      this.position++
      this.current = this.tokens[this.position]
    }

    parseExpression() {
      return this.parseTernary()
    }

    parseTernary() {
      let node = this.parseLogicalOr()

      if (this.current.type === TokenType.QUESTION) {
        this.advance()
        const trueExpr = this.parseLogicalOr()

        if (this.current.type !== TokenType.COLON) {
          throw new Error('Expected : in ternary expression')
        }
        this.advance()

        const falseExpr = this.parseTernary() // Right associative

        return {
          type: 'Ternary',
          condition: node,
          trueExpr,
          falseExpr
        }
      }

      return node
    }

    parseLogicalOr() {
      let node = this.parseLogicalAnd()

      while (this.current.type === TokenType.OPERATOR && this.current.value === '||') {
        this.advance()
        node = {
          type: 'BinaryOp',
          operator: '||',
          left: node,
          right: this.parseLogicalAnd()
        }
      }

      return node
    }

    parseLogicalAnd() {
      let node = this.parseEquality()

      while (this.current.type === TokenType.OPERATOR && this.current.value === '&&') {
        this.advance()
        node = {
          type: 'BinaryOp',
          operator: '&&',
          left: node,
          right: this.parseEquality()
        }
      }

      return node
    }

    parseEquality() {
      let node = this.parseComparison()

      while (this.current.type === TokenType.OPERATOR && ['==', '!=', '===', '!=='].includes(this.current.value)) {
        const operator = this.current.value
        this.advance()
        node = {
          type: 'BinaryOp',
          operator,
          left: node,
          right: this.parseComparison()
        }
      }

      return node
    }

    parseComparison() {
      let node = this.parseAdditive()

      while (this.current.type === TokenType.OPERATOR && ['<', '>', '<=', '>='].includes(this.current.value)) {
        const operator = this.current.value
        this.advance()
        node = {
          type: 'BinaryOp',
          operator,
          left: node,
          right: this.parseAdditive()
        }
      }

      return node
    }

    parseAdditive() {
      let node = this.parseMultiplicative()

      while (this.current.type === TokenType.OPERATOR && ['+', '-'].includes(this.current.value)) {
        const operator = this.current.value
        this.advance()
        node = {
          type: 'BinaryOp',
          operator,
          left: node,
          right: this.parseMultiplicative()
        }
      }

      return node
    }

    parseMultiplicative() {
      let node = this.parseUnary()

      while (this.current.type === TokenType.OPERATOR && ['*', '/', '%'].includes(this.current.value)) {
        const operator = this.current.value
        this.advance()
        node = {
          type: 'BinaryOp',
          operator,
          left: node,
          right: this.parseUnary()
        }
      }

      return node
    }

    parseUnary() {
      if (this.current.type === TokenType.OPERATOR && this.current.value === '!') {
        this.advance()
        return {
          type: 'UnaryOp',
          operator: '!',
          operand: this.parseUnary()
        }
      }

      return this.parseMemberAccess()
    }

    parseMemberAccess() {
      let node = this.parsePrimary()

      while (true) {
        if (this.current.type === TokenType.DOT) {
          this.advance()
          if (this.current.type !== TokenType.IDENTIFIER) {
            throw new Error('Expected identifier after dot')
          }
          node = {
            type: 'MemberAccess',
            object: node,
            property: this.current.value
          }
          this.advance()
        } else if (this.current.type === TokenType.BRACKET_OPEN) {
          this.advance()
          const index = this.parseExpression()
          if (this.current.type !== TokenType.BRACKET_CLOSE) {
            throw new Error('Expected closing bracket')
          }
          this.advance()
          node = {
            type: 'ArrayAccess',
            object: node,
            index
          }
        } else if (this.current.type === TokenType.PAREN_OPEN) {
          // Function call: expr(arg1, arg2, ...)
          this.advance()
          const args = []

          // Parse arguments
          if (this.current.type !== TokenType.PAREN_CLOSE) {
            args.push(this.parseExpression())

            while (this.current.type === TokenType.COMMA) {
              this.advance()
              args.push(this.parseExpression())
            }
          }

          if (this.current.type !== TokenType.PAREN_CLOSE) {
            throw new Error('Expected closing parenthesis in function call')
          }
          this.advance()

          node = {
            type: 'FunctionCall',
            callee: node,
            arguments: args
          }
        } else {
          break
        }
      }

      return node
    }

    parsePrimary() {
      // Literal values
      if (this.current.type === TokenType.NUMBER || this.current.type === TokenType.STRING) {
        const value = this.current.value
        this.advance()
        return { type: 'Literal', value }
      }

      // Identifiers
      if (this.current.type === TokenType.IDENTIFIER) {
        const name = this.current.value
        this.advance()
        return { type: 'Identifier', name }
      }

      // Parenthesized expressions
      if (this.current.type === TokenType.PAREN_OPEN) {
        this.advance()
        const expr = this.parseExpression()
        if (this.current.type !== TokenType.PAREN_CLOSE) {
          throw new Error('Expected closing parenthesis')
        }
        this.advance()
        return expr
      }

      throw new Error(`Unexpected token: ${this.current.type}`)
    }

    parse() {
      const ast = this.parseExpression()
      if (this.current.type !== TokenType.EOF) {
        throw new Error('Unexpected tokens after expression')
      }
      return ast
    }
  }

  // Evaluator
  class Evaluator {
    constructor(context = {}) {
      this.context = context
    }

    evaluate(node) {
      switch (node.type) {
        case 'Literal':
          return node.value

        case 'Identifier':
          if (!(node.name in this.context)) {
            return undefined
          }
          return this.context[node.name]

        case 'MemberAccess': {
          const obj = this.evaluate(node.object)
          if (obj == null) return undefined
          return obj[node.property]
        }

        case 'ArrayAccess': {
          const obj = this.evaluate(node.object)
          const index = this.evaluate(node.index)
          if (obj == null) return undefined
          return obj[index]
        }

        case 'FunctionCall': {
          const callee = this.evaluate(node.callee)
          if (typeof callee !== 'function') {
            throw new Error(`Cannot call non-function: ${typeof callee}`)
          }
          const args = node.arguments.map(arg => this.evaluate(arg))
          // For method calls like Math.round(), we need the context object
          // The callee is already bound correctly for Math methods
          return callee(...args)
        }

        case 'UnaryOp': {
          const operand = this.evaluate(node.operand)
          switch (node.operator) {
            case '!':
              return !operand
            default:
              throw new Error(`Unknown unary operator: ${node.operator}`)
          }
        }

        case 'BinaryOp': {
          const left = this.evaluate(node.left)
          const right = this.evaluate(node.right)

          switch (node.operator) {
            case '+': return left + right
            case '-': return left - right
            case '*': return left * right
            case '/': return left / right
            case '%': return left % right
            case '<': return left < right
            case '>': return left > right
            case '<=': return left <= right
            case '>=': return left >= right
            case '==': return left == right
            case '!=': return left != right
            case '===': return left === right
            case '!==': return left !== right
            case '&&': return left && right
            case '||': return left || right
            default:
              throw new Error(`Unknown binary operator: ${node.operator}`)
          }
        }

        case 'Ternary': {
          const condition = this.evaluate(node.condition)
          return condition ? this.evaluate(node.trueExpr) : this.evaluate(node.falseExpr)
        }

        default:
          throw new Error(`Unknown node type: ${node.type}`)
      }
    }
  }

  // Main API
  return {
    evaluate(expression, context = {}) {
      try {
        // Remove template delimiters if present
        let expr = expression.trim()
        if (expr.startsWith('{{') && expr.endsWith('}}')) {
          expr = expr.slice(2, -2).trim()
        }

        // Tokenize
        const tokenizer = new Tokenizer(expr)
        const tokens = tokenizer.tokenize()

        // Parse
        const parser = new Parser(tokens)
        const ast = parser.parse()

        // Evaluate
        const evaluator = new Evaluator(context)
        return evaluator.evaluate(ast)
      } catch (error) {
        throw new Error(`Expression evaluation failed: ${error.message}`)
      }
    }
  }
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExpressionEvaluator
  globalThis.ExpressionEvaluator = ExpressionEvaluator
}


// === conditional-renderer.js ===
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


// === loop-renderer.js ===
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


// === state-manager.js ===
/**
 * StateManager - Enhanced reactive state management for Render.js v2
 *
 * Features:
 * - Deep reactive proxy for nested objects/arrays
 * - Infinite loop protection with configurable limits
 * - Render tracking and circular dependency detection
 * - State reset (full and partial)
 * - Change notifications for watchers
 */

const StateManager = (() => {
  class StateManager {
    constructor(initialState = {}, options = {}) {
      // Handle null or non-object initial state
      if (initialState === null || typeof initialState !== 'object') {
        initialState = {}
      }

      // Store deep copy of initial state for reset
      this.initialState = this.deepClone(initialState)

      // Configuration
      this.maxRenders = options.maxRenders || 100
      this.warningThreshold = options.warningThreshold || 10

      // Infinite loop protection
      this.renderCount = 0
      this.renderStack = []
      this.resetTimer = null

      // Change listeners
      this.listeners = []

      // Create reactive state
      this.state = this.createDeepProxy(initialState)
    }

    /**
     * Deep clone an object (handles nested objects and arrays)
     */
    deepClone(obj) {
      if (obj === null || typeof obj !== 'object') {
        return obj
      }

      if (obj instanceof Date) {
        return new Date(obj.getTime())
      }

      if (obj instanceof Array) {
        return obj.map(item => this.deepClone(item))
      }

      const cloned = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key])
        }
      }
      return cloned
    }

    /**
     * Create a deep reactive proxy that handles nested objects/arrays
     */
    createDeepProxy(target, path = []) {
      const self = this

      return new Proxy(target, {
        get(obj, prop) {
          const value = obj[prop]

          // Return proxy for nested objects/arrays
          if (value !== null && typeof value === 'object') {
            return self.createDeepProxy(value, [...path, prop])
          }

          return value
        },

        set(obj, prop, value) {
          const oldValue = obj[prop]

          // Only trigger if value actually changed
          if (oldValue === value) {
            return true
          }

          obj[prop] = value

          // Track this state change
          const fullPath = [...path, prop].join('.')
          self.trackStateChange(fullPath, oldValue, value)

          // Notify listeners
          self.notifyListeners([fullPath])

          return true
        },

        deleteProperty(obj, prop) {
          if (prop in obj) {
            const fullPath = [...path, prop].join('.')
            delete obj[prop]
            self.notifyListeners([fullPath])
          }
          return true
        }
      })
    }

    /**
     * Track state changes for infinite loop detection
     */
    trackStateChange(path, oldValue, newValue) {
      this.renderCount++

      this.renderStack.push({
        path,
        oldValue,
        newValue,
        timestamp: Date.now()
      })

      // Keep stack size manageable
      if (this.renderStack.length > 50) {
        this.renderStack.shift()
      }

      // Warning at threshold
      if (this.renderCount === this.warningThreshold) {
        console.warn('⚠️ Render.js StateManager: Many state updates detected', {
          count: this.renderCount,
          recentChanges: this.renderStack.slice(-5),
          hint: 'Check for circular dependencies in state updates, watch, or actions'
        })
      }

      // Hard limit - prevent infinite loops
      if (this.renderCount >= this.maxRenders) {
        const circularPaths = this.detectCircularDependency()

        console.error('🛑 Render.js StateManager: INFINITE LOOP DETECTED!', {
          totalRenders: this.renderCount,
          likelyCircular: circularPaths,
          recentStack: this.renderStack.slice(-10),
          hint: 'Review watch dependencies and action handlers. State updates may be triggering themselves.'
        })

        // Reset counter to prevent browser freeze
        this.renderCount = 0
        this.renderStack = []

        throw new Error(
          `Maximum render limit (${this.maxRenders}) exceeded. ` +
          `Possible circular dependency in: ${circularPaths.join(', ')}`
        )
      }

      // Auto-reset counter after successful quiet period
      clearTimeout(this.resetTimer)
      this.resetTimer = setTimeout(() => {
        this.renderCount = 0
        this.renderStack = []
      }, 100)
    }

    /**
     * Detect circular dependencies in state updates
     */
    detectCircularDependency() {
      // Count how many times each path was updated recently
      const pathCounts = {}

      this.renderStack.slice(-20).forEach(change => {
        pathCounts[change.path] = (pathCounts[change.path] || 0) + 1
      })

      // Paths updated more than 5 times are likely circular
      return Object.entries(pathCounts)
        .filter(([_, count]) => count > 5)
        .map(([path]) => path)
        .sort((a, b) => pathCounts[b] - pathCounts[a])
    }

    /**
     * Update multiple state properties at once
     */
    setState(updates, source = 'setState') {
      if (!updates || typeof updates !== 'object') {
        throw new Error('setState requires an object of updates')
      }

      const changedPaths = []

      Object.entries(updates).forEach(([key, value]) => {
        if (this.state[key] !== value) {
          this.state[key] = value
          changedPaths.push(key)
        }
      })

      return changedPaths
    }

    /**
     * Reset state to initial values
     */
    reset(keys) {
      if (keys) {
        // Partial reset - specific keys only
        if (!Array.isArray(keys)) {
          keys = [keys]
        }

        keys.forEach(key => {
          if (key in this.initialState) {
            this.state[key] = this.deepClone(this.initialState[key])
          }
        })

        this.notifyListeners(keys)
      } else {
        // Full reset - all state
        const allKeys = Object.keys(this.initialState)

        allKeys.forEach(key => {
          this.state[key] = this.deepClone(this.initialState[key])
        })

        // Remove keys not in initial state
        Object.keys(this.state).forEach(key => {
          if (!(key in this.initialState)) {
            delete this.state[key]
          }
        })

        this.notifyListeners(allKeys)
      }
    }

    /**
     * Add a change listener
     */
    addListener(callback) {
      if (typeof callback !== 'function') {
        throw new Error('Listener must be a function')
      }

      this.listeners.push(callback)

      // Return unsubscribe function
      return () => {
        const index = this.listeners.indexOf(callback)
        if (index > -1) {
          this.listeners.splice(index, 1)
        }
      }
    }

    /**
     * Notify all listeners of state changes
     */
    notifyListeners(changedPaths) {
      this.listeners.forEach(callback => {
        try {
          callback(changedPaths, this.state)
        } catch (error) {
          console.error('Render.js StateManager: Error in state listener:', error)
        }
      })
    }

    /**
     * Get current state (returns proxy)
     */
    getState() {
      return this.state
    }

    /**
     * Get render statistics
     */
    getStats() {
      return {
        renderCount: this.renderCount,
        recentChanges: this.renderStack.slice(-10),
        maxRenders: this.maxRenders,
        warningThreshold: this.warningThreshold
      }
    }
  }

  return StateManager
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager
}


// === watch-manager.js ===
/**
 * WatchManager - Watch state changes with debouncing
 *
 * Features:
 * - Watch state paths with callbacks
 * - Default 100ms debounce to prevent race conditions
 * - Configurable debounce per watch
 * - Multiple watchers per path
 * - Unwatch capability
 * - Deep path watching (e.g., 'user.profile.name')
 */

const WatchManager = (() => {
  class WatchManager {
    constructor(stateManager, options = {}) {
      if (!stateManager) {
        throw new Error('WatchManager requires a StateManager instance')
      }

      this.stateManager = stateManager
      this.defaultDebounce = options.defaultDebounce ?? 100 // 100ms default

      // Store watchers by path
      // { 'user.name': [{ id, callback, debounce, timer }] }
      this.watchers = {}

      // Auto-increment ID for each watcher
      this.nextId = 1

      // Listen to all state changes
      this.unsubscribeFromState = stateManager.addListener(
        (changedPaths, state) => this.handleStateChange(changedPaths, state)
      )
    }

    /**
     * Watch a state path for changes
     *
     * @param {string|string[]} paths - Path(s) to watch (e.g., 'user.name' or ['user', 'posts'])
     * @param {Function} callback - Function to call when path changes
     * @param {Object} options - { debounce?: number, immediate?: boolean }
     * @returns {Function} Unwatch function
     */
    watch(paths, callback, options = {}) {
      if (!callback || typeof callback !== 'function') {
        throw new Error('Watch callback must be a function')
      }

      // Normalize to array
      if (!Array.isArray(paths)) {
        paths = [paths]
      }

      // Validate paths
      paths.forEach(path => {
        if (typeof path !== 'string' || path.trim() === '') {
          throw new Error('Watch paths must be non-empty strings')
        }
      })

      // Get debounce setting (per-watch override or default)
      const debounce = options.debounce ?? this.defaultDebounce

      // Create watcher IDs for all paths
      const watcherIds = paths.map(path => {
        const id = this.nextId++

        // Initialize path array if needed
        if (!this.watchers[path]) {
          this.watchers[path] = []
        }

        // Add watcher
        this.watchers[path].push({
          id,
          callback,
          debounce,
          timer: null
        })

        return { path, id }
      })

      // Call immediately if requested
      if (options.immediate) {
        callback(this.stateManager.getState())
      }

      // Return unwatch function
      return () => {
        watcherIds.forEach(({ path, id }) => {
          this.unwatch(path, id)
        })
      }
    }

    /**
     * Remove a watcher
     */
    unwatch(path, watcherId) {
      if (!this.watchers[path]) {
        return
      }

      const index = this.watchers[path].findIndex(w => w.id === watcherId)
      if (index === -1) {
        return
      }

      // Clear any pending timer
      const watcher = this.watchers[path][index]
      if (watcher.timer) {
        clearTimeout(watcher.timer)
      }

      // Remove watcher
      this.watchers[path].splice(index, 1)

      // Clean up empty path arrays
      if (this.watchers[path].length === 0) {
        delete this.watchers[path]
      }
    }

    /**
     * Handle state changes from StateManager
     */
    handleStateChange(changedPaths, state) {
      // Find all watchers that should be triggered
      const triggered = new Set()

      changedPaths.forEach(changedPath => {
        // Check for exact matches
        if (this.watchers[changedPath]) {
          this.watchers[changedPath].forEach(watcher => {
            triggered.add(watcher)
          })
        }

        // Check for parent path matches
        // If 'user.profile.name' changed, trigger 'user' and 'user.profile' watchers
        Object.keys(this.watchers).forEach(watchPath => {
          if (this.isParentPath(watchPath, changedPath)) {
            this.watchers[watchPath].forEach(watcher => {
              triggered.add(watcher)
            })
          }
        })

        // Check for child path matches
        // If 'user' changed, trigger 'user.name', 'user.profile.name' watchers
        Object.keys(this.watchers).forEach(watchPath => {
          if (this.isChildPath(watchPath, changedPath)) {
            this.watchers[watchPath].forEach(watcher => {
              triggered.add(watcher)
            })
          }
        })
      })

      // Execute watchers with debouncing
      triggered.forEach(watcher => {
        this.executeWatcher(watcher, state)
      })
    }

    /**
     * Check if watchPath is a parent of changedPath
     * Example: 'user' is parent of 'user.profile.name'
     */
    isParentPath(watchPath, changedPath) {
      return changedPath.startsWith(watchPath + '.')
    }

    /**
     * Check if watchPath is a child of changedPath
     * Example: 'user.name' is child of 'user'
     */
    isChildPath(watchPath, changedPath) {
      return watchPath.startsWith(changedPath + '.')
    }

    /**
     * Execute a watcher with debouncing
     */
    executeWatcher(watcher, state) {
      // Clear existing timer
      if (watcher.timer) {
        clearTimeout(watcher.timer)
      }

      // No debounce - execute immediately
      if (watcher.debounce === 0) {
        try {
          watcher.callback(state)
        } catch (error) {
          console.error('Render.js WatchManager: Error in watch callback:', error)
        }
        return
      }

      // Debounced execution
      watcher.timer = setTimeout(() => {
        watcher.timer = null

        try {
          watcher.callback(state)
        } catch (error) {
          console.error('Render.js WatchManager: Error in watch callback:', error)
        }
      }, watcher.debounce)
    }

    /**
     * Clear all watchers
     */
    clearAll() {
      // Clear all timers
      Object.values(this.watchers).forEach(watcherArray => {
        watcherArray.forEach(watcher => {
          if (watcher.timer) {
            clearTimeout(watcher.timer)
          }
        })
      })

      // Clear watchers
      this.watchers = {}
    }

    /**
     * Get count of active watchers
     */
    getWatcherCount() {
      return Object.values(this.watchers).reduce(
        (sum, arr) => sum + arr.length,
        0
      )
    }

    /**
     * Get all watched paths
     */
    getWatchedPaths() {
      return Object.keys(this.watchers)
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
      this.clearAll()

      if (this.unsubscribeFromState) {
        this.unsubscribeFromState()
      }
    }
  }

  return WatchManager
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WatchManager
}


// === data-fetcher.js ===
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


// === action-executor.js ===
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


// === streaming-json-parser.js ===
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


// === form-gen.js ===
// Form Generator from JSON
const FormGen = (() => {
  // Generate form HTML from JSON object
  const generateForm = (data, path = '') => {
    if (data === null || data === undefined) {
      return '<input type="text" value="" />'
    }

    const type = typeof data

    if (type === 'string') {
      const isMultiline = data.length > 80 || data.includes('\n')
      if (isMultiline) {
        return `<textarea rows="5">${escapeHtml(data)}</textarea>`
      }
      return `<input type="text" value="${escapeHtml(data)}" />`
    }

    if (type === 'number') {
      return `<input type="number" value="${data}" />`
    }

    if (type === 'boolean') {
      return `<input type="checkbox" ${data ? 'checked' : ''} />`
    }

    if (Array.isArray(data)) {
      const items = data.map((item, index) => {
        const itemPath = `${path}[${index}]`
        return `
          <div class="array-item" data-path="${itemPath}">
            <div class="array-item-header">
              <span>Item ${index + 1}</span>
              <button type="button" class="remove-item outline secondary" data-action="remove" data-index="${index}">
                <i data-lucide="x"></i> Remove
              </button>
            </div>
            <div class="array-item-content">
              ${generateForm(item, itemPath)}
            </div>
          </div>
        `
      }).join('')

      return `
        <div class="form-array" data-path="${path}">
          ${items}
          <button type="button" class="add-item outline" data-action="add">
            <i data-lucide="plus"></i> Add Item
          </button>
        </div>
      `
    }

    if (type === 'object') {
      const fields = Object.entries(data).map(([key, value]) => {
        const fieldPath = path ? `${path}.${key}` : key
        const fieldHtml = generateForm(value, fieldPath)

        return `
          <div class="form-field" data-path="${fieldPath}">
            <label>
              <strong>${formatLabel(key)}</strong>
              ${fieldHtml}
            </label>
          </div>
        `
      }).join('')

      return `<div class="form-object">${fields}</div>`
    }

    return ''
  }

  // Get form data back as JSON object
  const getFormData = (container) => {
    const data = {}

    // Process each form field
    const fields = container.querySelectorAll('.form-field')
    fields.forEach(field => {
      const path = field.getAttribute('data-path')

      // Skip form-fields that contain nested form-objects or form-arrays
      // (only process "leaf" fields with actual inputs)
      const hasNestedStructure = field.querySelector('.form-object, .form-array')
      if (hasNestedStructure) return

      const input = field.querySelector('input, textarea, select')

      if (!input) return

      let value
      if (input.type === 'checkbox') {
        value = input.checked
      } else if (input.type === 'number') {
        value = parseFloat(input.value) || 0
      } else {
        value = input.value
      }

      setValueByPath(data, path, value)
    })

    return data
  }

  // Helper: Set value at path (e.g., "nav.logo.text" or "pages[0].path")
  const setValueByPath = (obj, path, value) => {
    // Handle both dot notation and array notation
    const keys = []
    let current = ''
    let inBracket = false

    for (let i = 0; i < path.length; i++) {
      const char = path[i]

      if (char === '[') {
        if (current) keys.push({ key: current, isArray: false })
        current = ''
        inBracket = true
      } else if (char === ']') {
        keys.push({ key: parseInt(current), isArray: true })
        current = ''
        inBracket = false
      } else if (char === '.' && !inBracket) {
        if (current) keys.push({ key: current, isArray: false })
        current = ''
      } else {
        current += char
      }
    }

    if (current) keys.push({ key: current, isArray: false })

    // Navigate/create the path
    let target = obj
    for (let i = 0; i < keys.length - 1; i++) {
      const { key, isArray } = keys[i]
      const nextIsArray = i + 1 < keys.length && keys[i + 1].isArray

      if (!target[key]) {
        target[key] = nextIsArray ? [] : {}
      }
      target = target[key]
    }

    // Set the final value
    const lastKey = keys[keys.length - 1].key
    target[lastKey] = value
  }

  // Helper: Escape HTML
  const escapeHtml = (str) => {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  // Helper: Format label from key
  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  return {
    generateForm,
    getFormData
  }
})()

// Export for Node.js/testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormGen
  globalThis.FormGen = FormGen
}


// === render.js ===
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
      if (action.type === 'coffee-modal') {
        const url = action.url || 'https://buymeacoffee.com/jamesstalleymoores'
        const label = action.label || 'Buy me a coffee'
        return `<li><button class="coffee-toggle outline" onclick="Render.showCoffeeModal(${JSON.stringify(url)})" aria-label="${label}" title="${label}">
          <i data-lucide="${action.icon || 'coffee'}"></i>
        </button></li>`
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

  const showCoffeeModal = (url) => {
    const href = url || 'https://buymeacoffee.com/jamesstalleymoores'
    let modal = document.getElementById('dw-coffee-modal')
    if (!modal) {
      modal = document.createElement('dialog')
      modal.id = 'dw-coffee-modal'
      modal.className = 'modal-dialog dw-coffee-modal'
      modal.innerHTML = `
        <article>
          <header>
            <button class="close" data-coffee-close aria-label="Close">✕</button>
            <h2>Enjoying this?</h2>
          </header>
          <p>This is a personal side project — free to use, no ads, no tracking. If it's saved you time, you can buy me a coffee. Either way, thanks for visiting.</p>
          <footer>
            <a href="${href}" target="_blank" rel="noopener" role="button" data-coffee-link>Buy me a coffee</a>
            <button class="secondary" data-coffee-close>No thanks</button>
          </footer>
        </article>
      `
      modal.addEventListener('click', (e) => {
        if (e.target.matches('[data-coffee-close]') || e.target === modal) modal.close()
      })
      document.body.appendChild(modal)
    } else {
      const link = modal.querySelector('[data-coffee-link]')
      if (link) link.href = href
    }
    if (typeof modal.showModal === 'function') modal.showModal()
    else modal.setAttribute('open', '')
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
    showCoffeeModal,
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

