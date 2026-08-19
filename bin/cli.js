#!/usr/bin/env node

'use strict';

const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const { SessionWatcher } = require('../src/watcher');
const { LiveDisplay } = require('../src/display');
const { StatusBar } = require('../src/statusbar');

const pkg = require(path.join(__dirname, '..', 'package.json'));

program
  .name('token-meter')
  .description('Real-time token cost meter for AI coding agents')
  .version(pkg.version)
  .option('-a, --agent <type>', 'Agent type (kimi-code, claude-code, codex, opencode)', 'auto')
  .option('-i, --interval <ms>', 'Refresh interval in milliseconds', '1000')
  .option('--no-banner', 'Hide the banner')
  .option('-s, --session <id>', 'Watch specific session ID')
  .option('--bar', 'Status bar mode (lightweight, bottom of terminal)')
  .addHelpText('after', `
${chalk.bold('Examples:')}
  $ ${chalk.cyan('token-meter')}                       # Full dashboard mode
  $ ${chalk.cyan('token-meter --bar')}                 # Status bar mode (bottom of terminal)
  $ ${chalk.cyan('token-meter -a kimi-code')}          # Watch Kimi Code sessions
  $ ${chalk.cyan('token-meter -a claude-code')}        # Watch Claude Code sessions
  $ ${chalk.cyan('token-meter -a codex')}              # Watch Codex sessions
  $ ${chalk.cyan('token-meter -i 500')}                # Refresh every 500ms

${chalk.bold('Supported Agents:')}
  ${chalk.green('kimi-code')}    - Kimi Code ✅
  ${chalk.green('claude-code')}  - Claude Code ✅
  ${chalk.green('codex')}        - Codex ✅
  ${chalk.green('opencode')}     - OpenCode ✅

${chalk.bold('Controls:')}
  ${chalk.cyan('Ctrl+C')}        - Exit
  ${chalk.cyan('Ctrl+L')}        - Clear screen
`)
  .parse(process.argv);

const opts = program.opts();

async function main() {
  const watcher = new SessionWatcher({ agent: opts.agent });

  // Handle graceful exit
  process.on('SIGINT', () => {
    if (display) display.stop();
    watcher.stop();
    process.exit(0);
  });

  let display;

  if (opts.bar) {
    // Status bar mode
    display = new StatusBar({ interval: parseInt(opts.interval) });
    console.log(chalk.dim('  token-meter status bar active (Ctrl+C to exit)'));
    console.log(chalk.dim('  ───────────────────────────────────────────────'));
  } else {
    // Full dashboard mode
    display = new LiveDisplay({ showBanner: opts.banner, interval: parseInt(opts.interval) });
  }

  // Start watching
  watcher.on('update', (data) => {
    display.update(data);
  });

  watcher.on('new-event', (event) => {
    display.addEvent(event);
  });

  display.start();
  watcher.start(opts.session);
}

main().catch(err => {
  console.error(chalk.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
