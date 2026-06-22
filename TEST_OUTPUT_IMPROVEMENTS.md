# Test Output Improvements

This document explains the changes made to reduce verbose test output in CI and improve debugging.

## Problem

GitHub Actions test logs were extremely verbose and long, making it difficult to:
- Find actual test failures
- Understand what went wrong quickly
- GitHub UI took a long time to render the logs

## Solutions Implemented

### 1. Reduced Jest Verbosity (package.json)

**Added flags to `test:ci` command:**
```json
"test:ci": "NODE_OPTIONS='--max-old-space-size=4096' jest --ci --coverage --maxWorkers=2 --silent --noStackTrace"
```

**What each flag does:**
- `--silent`: Suppresses `console.log`, `console.warn`, and `console.error` output from tests
- `--noStackTrace`: Hides stack traces for passing tests (failures still show traces)
- `NODE_OPTIONS='--max-old-space-size=4096'`: Increases Node heap size to prevent OOM errors

**Result:** ~90% reduction in log output while keeping failure information intact.

### 2. GitHub Actions Summary (.github/workflows/test.yml)

**Added a new "Create test summary" step that:**

1. Captures all test output to a file (`test-output.log`)
2. Creates a clean summary in GitHub Actions UI
3. Shows different information based on success/failure:

**On Success:**
```
## Test Results
✅ All tests passed!

Tests: 6 skipped, 199 passed, 205 total

### Coverage
All files      | 71.24 |  62.73 |  72.58 |  72.04 |
```

**On Failure:**
```
## Test Results
❌ Tests failed

### Failed Tests
FAIL tests/render.test.js
  ● Test Name
    Expected: value
    Received: different value

Tests: 3 failed, 196 passed, 199 total
```

**Benefits:**
- ✅ Clean summary at the top of the workflow run
- ✅ Failures are immediately visible
- ✅ Don't need to scroll through thousands of lines
- ✅ Full logs still available if needed (click "Run tests" step)

### 3. Memory Optimization

**Test cleanup improvements** (tests/render.test.js):
- Added `afterEach` hook that removes dynamically created window handlers
- Cleans up quiz handlers (`quizAnswer_*`, `quizReset_*`)
- Cleans up button action handlers (`btn_*`)
- Resets Frappe chart configs
- Prevents memory accumulation between tests

## How to Use

### Locally

**Run tests with full output:**
```bash
npm test
```

**Run tests with CI settings (silent):**
```bash
npm run test:ci
```

### In GitHub Actions

The workflow automatically:
1. Runs tests with reduced verbosity
2. Creates a summary with only relevant info
3. Shows failures prominently if they occur
4. Links to full logs if you need them

### Viewing Results

**Success:**
- Look at the "Create test summary" step output
- See test count and coverage at a glance

**Failure:**
- Summary shows which tests failed
- Shows expected vs received values
- Full logs available in "Run tests" step if needed

## Configuration

### Adjust Verbosity

To make tests **more verbose**, edit `package.json`:
```json
"test:ci": "jest --ci --coverage --maxWorkers=2"  // Remove --silent
```

To make tests **less verbose**, add:
```json
"test:ci": "jest --ci --coverage --maxWorkers=2 --silent --onlyFailures"
```

### Adjust Summary Content

Edit `.github/workflows/test.yml`, "Create test summary" step:

**Show more failure details:**
```bash
grep "FAIL\|●\|Expected\|Received" test-output.log | head -200  # Show 200 lines
```

**Show coverage on failure too:**
```bash
# Add after the FAIL grep block:
if grep -q "All files" test-output.log; then
  echo "### Coverage" >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
  grep -A 3 "All files" test-output.log | head -4 >> $GITHUB_STEP_SUMMARY
  echo '```' >> $GITHUB_STEP_SUMMARY
fi
```

## Memory Issues

If tests fail with "Maximum call stack size exceeded" or "out of memory":

1. **Increase heap size** (already done):
   ```json
   "test:ci": "NODE_OPTIONS='--max-old-space-size=6144' jest ..."
   ```

2. **Run serially instead of parallel**:
   ```json
   "test:ci": "jest --ci --coverage --runInBand --silent"
   ```

3. **Reduce test complexity** - use fewer test cases or simpler data

## Examples

### Before (1000+ lines of output)
```
PASS tests/form-gen.test.js
  ● Console
    console.warn
      Warning 1
      at Object.<anonymous> (tests/form-gen.test.js:42:13)
    console.warn
      Warning 2
      at Object.<anonymous> (tests/form-gen.test.js:89:13)
  ✓ should render form (52 ms)
  ✓ should handle input (12 ms)
  [... 800 more lines ...]

PASS tests/render.test.js
  ● Console
    console.error
      [Render.js] Error message
      at Object.<anonymous> (render.js:1234:56)
  [... 5000 more lines ...]
```

### After (<50 lines in summary)
```
## Test Results
✅ All tests passed!

Tests: 6 skipped, 199 passed, 205 total

### Coverage
All files      | 71.24 |  62.73 |  72.58 |  72.04 |
form-gen.js   |  90.9 |  84.21 |    100 |  91.35 |
render.js     | 69.37 |  61.06 |  70.17 |  70.25 |

Node.js: 20.x
```

## Troubleshooting

**Q: Tests pass locally but fail in CI**
- Check the full "Run tests" step logs
- Memory constraints might be different
- Try running `npm run test:ci` locally to reproduce

**Q: Can't see console.log output**
- Use `npm test` (not `npm run test:ci`)
- Or remove `--silent` flag temporarily

**Q: Need to see all test details**
- Click "Run tests" step in GitHub Actions
- Download artifacts if configured
- Run locally without --silent

**Q: Summary not showing failures correctly**
- Check if grep patterns match your Jest output
- Test output format may vary between Jest versions
- Adjust the grep pattern in workflow file

## Future Improvements

Potential enhancements:
- [ ] Add failed test artifacts (screenshots, logs)
- [ ] Create GitHub annotations for failures
- [ ] Generate HTML test report
- [ ] Add performance metrics to summary
- [ ] Highlight coverage changes vs main branch
