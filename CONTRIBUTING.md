# Contributing to Token Meter

Thanks for your interest in contributing!

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development

```bash
# Clone
git clone https://github.com/liangzhengtao/token-meter.git
cd token-meter

# Install dependencies
npm install

# Run tests
npm test

# Run locally
node bin/cli.js
```

## Adding New Agent Support

To add support for a new AI coding agent:

1. Create a new file in `src/` (e.g., `src/parsers/new-agent.js`)
2. Implement the parser following the existing patterns
3. Add the agent to `SessionWatcher.getAgentPaths()` in `src/watcher.js`
4. Add parsing logic in `SessionWatcher.parseLine()`
5. Update the README files (English and Chinese)
6. Submit a PR

## Code Style

- Use `'use strict';`
- Use `const` and `let`, not `var`
- Keep functions small and focused
- Add comments for complex logic

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
