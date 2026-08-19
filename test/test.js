const assert = require('assert');
const { SessionWatcher } = require('../src/watcher');

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try { fn(); console.log(`  ✓ ${name}`); passed++; }
    catch (error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
  }

  console.log('\n🧪 Running token-meter tests...\n');

  console.log('📋 Session Watcher:');
  test('SessionWatcher is a class', () => {
    const w = new SessionWatcher();
    assert(w instanceof SessionWatcher);
  });

  test('SessionWatcher has start/stop methods', () => {
    const w = new SessionWatcher();
    assert(typeof w.start === 'function');
    assert(typeof w.stop === 'function');
  });

  test('SessionWatcher emits events', () => {
    const w = new SessionWatcher();
    assert(typeof w.on === 'function');
    assert(typeof w.emit === 'function');
  });

  test('getAgentPaths returns array', () => {
    const w = new SessionWatcher();
    const paths = w.getAgentPaths();
    assert(Array.isArray(paths));
  });

  test('parseLine handles invalid JSON', () => {
    const w = new SessionWatcher();
    const result = w.parseLine('not json', 'kimi-code');
    assert.strictEqual(result, null);
  });

  test('parseLine parses kimi-code user message', () => {
    const w = new SessionWatcher();
    const line = JSON.stringify({
      type: 'turn.prompt',
      input: [{ type: 'text', text: 'Hello' }],
      time: '2026-01-01T00:00:00Z',
    });
    const result = w.parseLine(line, 'kimi-code');
    assert(result);
    assert.strictEqual(result.role, 'user');
    assert.strictEqual(result.content, 'Hello');
  });

  test('parseLine parses claude-code user message', () => {
    const w = new SessionWatcher();
    const line = JSON.stringify({
      type: 'user',
      message: { content: 'Test message' },
      timestamp: '2026-01-01T00:00:00Z',
    });
    const result = w.parseLine(line, 'claude-code');
    assert(result);
    assert.strictEqual(result.role, 'user');
    assert.strictEqual(result.content, 'Test message');
  });

  test('parseLine parses codex user message', () => {
    const w = new SessionWatcher();
    const line = JSON.stringify({
      type: 'event_msg',
      timestamp: '2026-01-01T00:00:00Z',
      payload: {
        type: 'user_message',
        message: 'Test',
      },
    });
    const result = w.parseLine(line, 'codex');
    assert(result);
    assert.strictEqual(result.role, 'user');
  });

  test('findSessionFiles returns array', () => {
    const w = new SessionWatcher();
    const files = w.findSessionFiles();
    assert(Array.isArray(files));
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error(err); process.exit(1); });
