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
