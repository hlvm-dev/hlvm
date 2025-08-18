# Contributing to HLVM

Thank you for your interest in contributing to HLVM! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- [Deno](https://deno.land/) 1.40+
- Node.js 18+ (for some build tools)
- Git
- Make (for build system)

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/hlvm.git
   cd hlvm
   ```

2. **Install dependencies**
   ```bash
   # Deno will automatically download dependencies
   deno cache src/hlvm-repl.ts
   ```

3. **Build the project**
   ```bash
   make build
   ```

4. **Run tests**
   ```bash
   make test
   ```

## Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug fixes** - Report and fix issues
- ✨ **New features** - Add new functionality
- 📚 **Documentation** - Improve docs and examples
- 🧪 **Tests** - Add or improve test coverage
- 🔧 **Infrastructure** - CI/CD, build system improvements
- 🌍 **Localization** - Translations and locale support

### Before You Start

1. **Check existing issues** - Avoid duplicate work
2. **Discuss major changes** - Open an issue for discussion
3. **Follow the roadmap** - Check our project milestones

## Code Style

### General Principles

- **Readability** - Code should be self-documenting
- **Consistency** - Follow existing patterns
- **Simplicity** - Prefer simple solutions over complex ones
- **Performance** - Consider performance implications

### JavaScript/TypeScript

- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use async/await for asynchronous operations
- Add JSDoc comments for public APIs
- Follow Deno formatting standards

### File Organization

```
src/
├── stdlib/          # Standard library modules
│   ├── core/        # Core functionality
│   ├── ai/          # AI services
│   ├── computer/    # System automation
│   └── ui/          # User interface
├── docs/            # Documentation
└── test/            # Test files
```

### Naming Conventions

- **Files**: kebab-case (e.g., `file-system.js`)
- **Functions**: camelCase (e.g., `readFile`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **Classes**: PascalCase (e.g., `FileManager`)

## Testing

### Test Structure

- Unit tests for individual functions
- Integration tests for module interactions
- End-to-end tests for complete workflows

### Running Tests

```bash
# Run all tests
make test

# Run specific test file
deno test src/test/specific-test.ts

# Run tests with coverage
deno test --coverage=coverage
```

### Writing Tests

```typescript
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { readFile } from "../src/stdlib/fs/filesystem.ts";

Deno.test("readFile should read file contents", async () => {
  const content = await readFile("test.txt");
  assertEquals(content, "expected content");
});
```

## Pull Request Process

### Creating a PR

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow code style guidelines
   - Add tests for new functionality
   - Update documentation

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

### PR Guidelines

- **Title**: Clear, descriptive title
- **Description**: Explain what and why, not how
- **Related issues**: Link to relevant issues
- **Screenshots**: Include for UI changes
- **Tests**: Ensure all tests pass

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(ai): add support for new AI model
fix(ui): resolve notification display issue
docs(readme): update installation instructions
```

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major** (x.0.0): Breaking changes
- **Minor** (0.x.0): New features, backward compatible
- **Patch** (0.0.x): Bug fixes, backward compatible

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes written
- [ ] Binaries built for all platforms
- [ ] GitHub release created

### Building Releases

```bash
# Build for all platforms
make release-all

# Build for specific platform
make release-macos
make release-linux
make release-windows
```

## Getting Help

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas
- **Discord**: Join our community server (link in README)

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes
- Project documentation
- Community acknowledgments

Thank you for contributing to HLVM! 🚀
