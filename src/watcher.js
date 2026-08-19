const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

/**
 * Real-time session file watcher
 * Monitors AI agent session files for new events
 */
class SessionWatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this.agent = options.agent || 'auto';
    this.watchers = [];
    this.lastPositions = {};
    this.sessions = [];
    this.stats = {
      totalTokens: { input: 0, output: 0 },
      totalCost: 0,
      totalMessages: 0,
      totalToolCalls: 0,
      sessionCount: 0,
      events: [],
    };
  }

  /**
   * Get session paths for each agent
   */
  getAgentPaths() {
    const home = process.env.HOME || process.env.USERPROFILE;
    const agents = {
      'kimi-code': path.join(home, '.kimi-code', 'sessions'),
      'claude-code': path.join(home, '.claude', 'projects'),
      'codex': path.join(home, '.codex', 'sessions'),
      'opencode': path.join(home, '.opencode', 'sessions'),
    };

    if (this.agent === 'auto') {
      return Object.entries(agents)
        .filter(([name, p]) => fs.existsSync(p))
        .map(([name, p]) => ({ name, path: p }));
    }

    const agentPath = agents[this.agent];
    if (!agentPath || !fs.existsSync(agentPath)) {
      return [];
    }
    return [{ name: this.agent, path: agentPath }];
  }

  /**
   * Find all watchable session files
   */
  findSessionFiles() {
    const files = [];
    const agentPaths = this.getAgentPaths();

    for (const { name, path: basePath } of agentPaths) {
      if (name === 'kimi-code') {
        this._findKimiCodeFiles(basePath, files);
      } else if (name === 'claude-code') {
        this._findClaudeCodeFiles(basePath, files);
      } else if (name === 'codex') {
        this._findCodexFiles(basePath, files);
      } else if (name === 'opencode') {
        this._findOpenCodeFiles(basePath, files);
      }
    }

    return files;
  }

  _findKimiCodeFiles(basePath, files) {
    if (!fs.existsSync(basePath)) return;
    const workspaces = fs.readdirSync(basePath);
    for (const workspace of workspaces) {
      const workspacePath = path.join(basePath, workspace);
      if (!fs.statSync(workspacePath).isDirectory()) continue;
      const sessionDirs = fs.readdirSync(workspacePath);
      for (const sessionDir of sessionDirs) {
        const wireFile = path.join(workspacePath, sessionDir, 'agents', 'main', 'wire.jsonl');
        if (fs.existsSync(wireFile)) {
          files.push({
            agent: 'kimi-code',
            file: wireFile,
            sessionId: sessionDir,
            workspace,
          });
        }
      }
    }
  }

  _findClaudeCodeFiles(basePath, files) {
    if (!fs.existsSync(basePath)) return;
    const projects = fs.readdirSync(basePath);
    for (const project of projects) {
      if (project === 'memory') continue;
      const projectPath = path.join(basePath, project);
      if (!fs.statSync(projectPath).isDirectory()) continue;
      const jsonlFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));
      for (const file of jsonlFiles) {
        files.push({
          agent: 'claude-code',
          file: path.join(projectPath, file),
          sessionId: file.replace('.jsonl', ''),
          workspace: project,
        });
      }
    }
  }

  _findCodexFiles(basePath, files) {
    if (!fs.existsSync(basePath)) return;
    const years = fs.readdirSync(basePath);
    for (const year of years) {
      const yearPath = path.join(basePath, year);
      if (!fs.statSync(yearPath).isDirectory()) continue;
      const months = fs.readdirSync(yearPath);
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        if (!fs.statSync(monthPath).isDirectory()) continue;
        const days = fs.readdirSync(monthPath);
        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          if (!fs.statSync(dayPath).isDirectory()) continue;
          const jsonlFiles = fs.readdirSync(dayPath).filter(f => f.endsWith('.jsonl'));
          for (const file of jsonlFiles) {
            files.push({
              agent: 'codex',
              file: path.join(dayPath, file),
              sessionId: file.replace('.jsonl', ''),
              workspace: `${year}/${month}/${day}`,
            });
          }
        }
      }
    }
  }

  _findOpenCodeFiles(basePath, files) {
    if (!fs.existsSync(basePath)) return;
    const entries = fs.readdirSync(basePath);
    for (const entry of entries) {
      if (entry.endsWith('.json') && entry !== 'package.json' && entry !== 'package-lock.json') {
        files.push({
          agent: 'opencode',
          file: path.join(basePath, entry),
          sessionId: entry.replace('.json', ''),
          workspace: 'default',
        });
      }
    }
  }

  /**
   * Parse a single line from a session file
   */
  parseLine(line, agent) {
    try {
      const entry = JSON.parse(line);
      const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();
      const result = { timestamp, role: null, content: null, tokens: null, tool: null, type: null };

      if (agent === 'kimi-code') {
        // User messages
        if (entry.type === 'turn.prompt' && entry.input) {
          const text = Array.isArray(entry.input)
            ? entry.input.filter(i => i.type === 'text').map(i => i.text).join(' ')
            : String(entry.input);
          if (text.trim()) {
            result.role = 'user';
            result.content = text.substring(0, 120);
            result.type = 'message';
          }
        }

        // Tool calls
        if (entry.type === 'context.append_loop_event' && entry.event) {
          if (entry.event.type === 'tool.call') {
            result.role = 'tool';
            result.tool = entry.event.name || 'unknown';
            result.content = entry.event.description || entry.event.args?.command?.substring(0, 80) || '';
            result.type = 'tool_call';
          }
          if (entry.event.type === 'content.part' && entry.event.part?.type === 'text') {
            result.role = 'assistant';
            result.content = entry.event.part.text.substring(0, 120);
            result.type = 'message';
          }
        }

        // Token usage
        if (entry.type === 'usage.record' && entry.usage) {
          result.tokens = {
            input: (entry.usage.inputOther || 0) + (entry.usage.inputCacheRead || 0),
            output: entry.usage.output || 0,
          };
          result.type = 'usage';
        }
      }

      if (agent === 'claude-code') {
        if (entry.type === 'user' && entry.message) {
          const msg = entry.message;
          const text = typeof msg.content === 'string'
            ? msg.content
            : Array.isArray(msg.content)
              ? msg.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
              : '';
          if (text.trim()) {
            result.role = 'user';
            result.content = text.substring(0, 120);
            result.type = 'message';
          }
        }

        if (entry.type === 'assistant' && entry.message) {
          const msg = entry.message;
          let text = '';
          if (Array.isArray(msg.content)) {
            for (const block of msg.content) {
              if (block.type === 'text') text += block.text;
              if (block.type === 'tool_use') {
                result.role = 'tool';
                result.tool = block.name;
                result.type = 'tool_call';
              }
            }
          }
          if (msg.usage) {
            result.tokens = {
              input: msg.usage.input_tokens || 0,
              output: msg.usage.output_tokens || 0,
            };
          }
          if (text.trim()) {
            result.role = result.role || 'assistant';
            result.content = text.substring(0, 120);
            result.type = result.type || 'message';
          }
        }
      }

      if (agent === 'codex') {
        const payload = entry.payload || {};

        if (entry.type === 'event_msg') {
          if (payload.type === 'user_message' && payload.message) {
            result.role = 'user';
            result.content = String(payload.message).substring(0, 120);
            result.type = 'message';
          }
          if (payload.type === 'agent_message' && payload.message) {
            result.role = 'assistant';
            result.content = String(payload.message).substring(0, 120);
            result.type = 'message';
          }
          if (payload.type === 'token_count' && payload.info) {
            const usage = payload.info.total_token_usage || payload.info.last_token_usage;
            if (usage) {
              result.tokens = {
                input: usage.input_tokens || 0,
                output: usage.output_tokens || 0,
              };
              result.type = 'usage';
            }
          }
        }

        if (entry.type === 'response_item') {
          if (payload.type === 'custom_tool_call' || payload.type === 'function_call') {
            result.role = 'tool';
            result.tool = payload.name || 'unknown';
            result.type = 'tool_call';
          }
        }
      }

      if (agent === 'opencode') {
        const role = entry.role || entry.type;
        if (role === 'user' || role === 'assistant') {
          result.role = role;
          result.content = (entry.content || entry.text || '').substring(0, 120);
          result.type = 'message';
        }
        if (entry.usage) {
          result.tokens = {
            input: entry.usage.input_tokens || 0,
            output: entry.usage.output_tokens || 0,
          };
        }
      }

      return result;
    } catch (e) {
      return null;
    }
  }

  /**
   * Start watching for changes
   */
  start(specificSession) {
    const files = this.findSessionFiles();

    if (specificSession) {
      const filtered = files.filter(f => f.sessionId === specificSession);
      if (filtered.length === 0) {
        this.emit('error', new Error(`Session not found: ${specificSession}`));
        return;
      }
      this.sessions = filtered;
    } else {
      this.sessions = files;
    }

    this.stats.sessionCount = this.sessions.length;
    this.emit('update', this.stats);

    // Load recent events from the most recent session file
    this._loadRecentEvents();

    // Initialize last positions
    for (const session of this.sessions) {
      try {
        const stat = fs.statSync(session.file);
        this.lastPositions[session.file] = stat.size;
      } catch (e) {
        this.lastPositions[session.file] = 0;
      }
    }

    // Start polling for changes
    this._interval = setInterval(() => {
      this._checkForUpdates();
    }, 500);
  }

  /**
   * Load recent events from the most active session
   */
  _loadRecentEvents() {
    // Find the most recently modified session file
    let newest = null;
    let newestTime = 0;
    for (const session of this.sessions) {
      try {
        const stat = fs.statSync(session.file);
        if (stat.mtimeMs > newestTime && stat.size > 0) {
          newestTime = stat.mtimeMs;
          newest = session;
        }
      } catch (e) { /* skip */ }
    }

    if (!newest) return;

    try {
      const content = fs.readFileSync(newest.file, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      // Read last 50 lines and find valid events
      const recentLines = lines.slice(-80);
      for (const line of recentLines) {
        const event = this.parseLine(line, newest.agent);
        if (event && event.type) {
          event.sessionId = newest.sessionId;
          event.agent = newest.agent;
          this.stats.events.push(event);
          if (event.type === 'message') this.stats.totalMessages++;
          if (event.type === 'tool_call') this.stats.totalToolCalls++;
          if (event.tokens && newest.agent !== 'codex') {
            this.stats.totalTokens.input += event.tokens.input;
            this.stats.totalTokens.output += event.tokens.output;
          }
        }
      }
      this.stats.totalCost = (this.stats.totalTokens.input * 3 + this.stats.totalTokens.output * 15) / 1000000;
      this.emit('update', this.stats);
    } catch (e) { /* skip */ }
  }

  /**
   * Check for file updates
   */
  _checkForUpdates() {
    for (const session of this.sessions) {
      try {
        const stat = fs.statSync(session.file);
        const lastPos = this.lastPositions[session.file] || 0;

        if (stat.size > lastPos) {
          // Read new content
          const fd = fs.openSync(session.file, 'r');
          const buffer = Buffer.alloc(stat.size - lastPos);
          fs.readSync(fd, buffer, 0, buffer.length, lastPos);
          fs.closeSync(fd);

          const newContent = buffer.toString('utf-8');
          const lines = newContent.split('\n').filter(Boolean);

          for (const line of lines) {
            const event = this.parseLine(line, session.agent);
            if (event) {
              event.sessionId = session.sessionId;
              event.agent = session.agent;

              // Update stats
              if (event.type === 'message') {
                this.stats.totalMessages++;
              }
              if (event.type === 'tool_call') {
                this.stats.totalToolCalls++;
              }
              if (event.tokens) {
                // For cumulative token systems (codex), take the delta
                if (session.agent === 'codex') {
                  // Codex is cumulative, skip for now
                } else {
                  this.stats.totalTokens.input += event.tokens.input;
                  this.stats.totalTokens.output += event.tokens.output;
                }
              }

              // Keep last 50 events
              this.stats.events.push(event);
              if (this.stats.events.length > 50) {
                this.stats.events.shift();
              }

              this.emit('new-event', event);
            }
          }

          this.lastPositions[session.file] = stat.size;
          this.stats.totalCost = (this.stats.totalTokens.input * 3 + this.stats.totalTokens.output * 15) / 1000000;
          this.emit('update', this.stats);
        }
      } catch (e) {
        // Skip errors
      }
    }
  }

  /**
   * Stop watching
   */
  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}

module.exports = { SessionWatcher };
