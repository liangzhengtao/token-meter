let chalk;
try {
  chalk = require('chalk');
} catch {
  chalk = { green: s => s, red: s => s, yellow: s => s, gray: s => s, bold: s => s, cyan: s => s, magenta: s => s, blue: s => s, dim: s => s, white: s => s, hex: () => s => s };
}

/**
 * Real-time terminal display for token consumption
 */
class LiveDisplay {
  constructor(options = {}) {
    this.showBanner = options.showBanner !== false;
    this.interval = options.interval || 1000;
    this.events = [];
    this.stats = null;
    this.startTime = Date.now();
    this._renderInterval = null;
  }

  /**
   * Start the display
   */
  start() {
    if (this.showBanner) {
      this._printBanner();
    }

    // Render loop
    this._renderInterval = setInterval(() => {
      this._render();
    }, this.interval);
  }

  /**
   * Stop the display
   */
  stop() {
    if (this._renderInterval) {
      clearInterval(this._renderInterval);
    }
    // Move cursor below the display area
    process.stdout.write('\n');
  }

  /**
   * Update stats
   */
  update(stats) {
    this.stats = stats;
  }

  /**
   * Add a new event to the feed
   */
  addEvent(event) {
    this.events.push(event);
    if (this.events.length > 200) {
      this.events = this.events.slice(-100);
    }
  }

  /**
   * Print the banner
   */
  _printBanner() {
    console.log('');
    console.log(chalk.bold.cyan('  ⚡ token-meter — Real-time Token Cost Monitor'));
    console.log(chalk.gray('  ─────────────────────────────────────────────────'));
    console.log(chalk.gray('  Watching for AI agent activity... (Ctrl+C to exit)'));
    console.log('');
  }

  /**
   * Format time as HH:MM:SS
   */
  _formatTime(date) {
    if (!date) return '??:??:??';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /**
   * Format duration
   */
  _formatDuration(seconds) {
    if (!seconds || seconds < 0) return '?';
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  }

  /**
   * Format token count with K/M suffix
   */
  _formatTokens(count) {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  }

  /**
   * Render the display
   */
  _render() {
    if (!this.stats) return;

    const TERM_WIDTH = process.stdout.columns || 80;
    const now = new Date();
    const elapsed = (Date.now() - this.startTime) / 1000;

    // Build the status bar
    const totalTokens = this.stats.totalTokens.input + this.stats.totalTokens.output;
    const costStr = `$${this.stats.totalCost.toFixed(4)}`;
    const tokensStr = this._formatTokens(totalTokens);
    const msgsStr = String(this.stats.totalMessages);
    const toolsStr = String(this.stats.totalToolCalls);
    const sessionsStr = String(this.stats.sessionCount);

    // Status line
    const statusLine = [
      chalk.gray('  '),
      chalk.cyan('Sessions: ') + chalk.bold(sessionsStr),
      chalk.gray(' │ '),
      chalk.green('Tokens: ') + chalk.bold(tokensStr),
      chalk.gray(' │ '),
      chalk.yellow('Cost: ') + chalk.bold(costStr),
      chalk.gray(' │ '),
      chalk.magenta('Msgs: ') + chalk.bold(msgsStr),
      chalk.gray(' │ '),
      chalk.blue('Tools: ') + chalk.bold(toolsStr),
      chalk.gray(' │ '),
      chalk.dim(this._formatTime(now)),
    ].join('');

    // Recent events feed (last 15) - use stats.events if local is empty
    const sourceEvents = this.events.length > 0 ? this.events : (this.stats.events || []);
    const recentEvents = sourceEvents.slice(-15);
    const eventLines = recentEvents.map(event => {
      const time = this._formatTime(event.timestamp);
      const timeRight = chalk.dim(`[${time}]`);

      if (event.type === 'message') {
        if (event.role === 'user') {
          const preview = event.content.substring(0, 60).replace(/\n/g, ' ');
          return `  ${chalk.cyan('YOU')} ${preview} ${timeRight}`;
        } else {
          const preview = event.content.substring(0, 60).replace(/\n/g, ' ');
          return `  ${chalk.green('AI ')} ${preview} ${timeRight}`;
        }
      }

      if (event.type === 'tool_call') {
        const toolName = event.tool || 'unknown';
        const preview = event.content ? event.content.substring(0, 40).replace(/\n/g, ' ') : '';
        return `  ${chalk.yellow('TL ')} ${chalk.bold(toolName)} ${preview} ${timeRight}`;
      }

      if (event.type === 'usage' && event.tokens) {
        const input = this._formatTokens(event.tokens.input);
        const output = this._formatTokens(event.tokens.output);
        return `  ${chalk.gray('📊 ')} ${chalk.dim(`+${input}in / +${output}out`)} ${timeRight}`;
      }

      return null;
    }).filter(Boolean);

    // Clear previous render area
    const linesToRender = eventLines.length + 3; // events + divider + status + blank

    // Move cursor up and clear
    if (this._lastRenderLines) {
      process.stdout.write(`\x1b[${this._lastRenderLines}A`);
      for (let i = 0; i < this._lastRenderLines; i++) {
        process.stdout.write('\x1b[2K\x1b[1B');
      }
      process.stdout.write(`\x1b[${this._lastRenderLines}A`);
    }

    // Render
    const divider = chalk.gray('  ' + '─'.repeat(Math.min(TERM_WIDTH - 4, 76)));

    console.log(divider);
    console.log(statusLine);
    console.log(divider);

    if (eventLines.length === 0) {
      console.log(chalk.dim('  Waiting for activity...'));
    } else {
      for (const line of eventLines) {
        // Truncate to terminal width
        const maxLen = TERM_WIDTH - 2;
        console.log(line.substring(0, maxLen));
      }
    }

    this._lastRenderLines = linesToRender;
  }
}

module.exports = { LiveDisplay };
