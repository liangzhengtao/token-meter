let chalk;
try {
  chalk = require('chalk');
} catch {
  chalk = { green: s => s, red: s => s, yellow: s => s, gray: s => s, bold: s => s, cyan: s => s, magenta: s => s, blue: s => s, dim: s => s, white: s => s };
}

/**
 * Lightweight status bar that sits at the bottom of the terminal
 * Shows real-time token consumption without blocking the screen
 */
class StatusBar {
  constructor(options = {}) {
    this.interval = options.interval || 1000;
    this.stats = null;
    this.events = [];
    this.startTime = Date.now();
    this._renderInterval = null;
    this._lastLine = '';
    this._enabled = true;
  }

  start() {
    // Save cursor position and set up scrolling region
    process.stdout.write('\x1b[s'); // Save cursor position

    // Initial render
    this._render();

    // Render loop
    this._renderInterval = setInterval(() => {
      this._render();
    }, this.interval);

    // Handle terminal resize
    process.stdout.on('resize', () => {
      this._render();
    });
  }

  stop() {
    if (this._renderInterval) {
      clearInterval(this._renderInterval);
    }
    // Clear the status bar line
    this._clearLine();
    process.stdout.write('\n');
  }

  update(stats) {
    this.stats = stats;
  }

  addEvent(event) {
    this.events.push(event);
    if (this.events.length > 100) {
      this.events = this.events.slice(-50);
    }
  }

  _formatTime(date) {
    if (!date) return '??:??:??';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  _formatTokens(count) {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  }

  _clearLine() {
    process.stdout.write('\r\x1b[K');
  }

  _render() {
    if (!this.stats || !this._enabled) return;

    const now = new Date();
    const totalTokens = this.stats.totalTokens.input + this.stats.totalTokens.output;
    const cost = this.stats.totalCost;
    const msgs = this.stats.totalMessages;
    const tools = this.stats.totalToolCalls;
    const sessions = this.stats.sessionCount;

    // Get last event info
    let lastEvent = '';
    if (this.events.length > 0) {
      const last = this.events[this.events.length - 1];
      if (last.type === 'message') {
        if (last.role === 'user') {
          lastEvent = chalk.cyan('YOU: ') + (last.content || '').substring(0, 30).replace(/\n/g, ' ');
        } else {
          lastEvent = chalk.green('AI:  ') + (last.content || '').substring(0, 30).replace(/\n/g, ' ');
        }
      } else if (last.type === 'tool_call') {
        lastEvent = chalk.yellow('TL:  ') + (last.tool || 'unknown');
      }
    }

    // Build status bar
    const parts = [
      chalk.gray('│'),
      chalk.cyan('⚡'),
      chalk.bold(this._formatTime(now)),
      chalk.gray('│'),
      chalk.green(`T:${this._formatTokens(totalTokens)}`),
      chalk.gray('│'),
      chalk.yellow(`$${cost.toFixed(2)}`),
      chalk.gray('│'),
      chalk.magenta(`M:${msgs}`),
      chalk.gray('│'),
      chalk.blue(`TL:${tools}`),
      chalk.gray('│'),
      chalk.dim(`S:${sessions}`),
    ];

    if (lastEvent) {
      parts.push(chalk.gray('│'));
      parts.push(lastEvent);
    }

    parts.push(chalk.gray('│'));

    const line = parts.join(' ');

    // Move to bottom of terminal and render
    const termHeight = process.stdout.rows || 24;
    process.stdout.write(`\x1b[${termHeight};1H`); // Move to last row
    this._clearLine();
    process.stdout.write(line);

    // Restore cursor position
    process.stdout.write('\x1b[u');
  }
}

module.exports = { StatusBar };
