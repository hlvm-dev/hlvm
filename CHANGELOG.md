# Changelog

All notable changes to HLVM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Cross-platform binary releases
- Homebrew installation support
- GitHub Actions CI/CD pipeline
- Comprehensive documentation

### Changed
- Improved build system with multi-platform support
- Enhanced error handling and user feedback

## [0.0.6] - 2025-01-XX

### Added
- AI integration with Ollama support
- System automation (keyboard, mouse, screen)
- File system operations with async support
- Clipboard integration
- Notification system
- Persistent storage with SQLite
- Module system with hot reloading
- REPL interface with tab completion

### Changed
- Refactored core architecture for better modularity
- Improved error handling and user experience
- Enhanced documentation and examples

### Fixed
- Memory leaks in long-running sessions
- Platform-specific path handling issues
- Async operation race conditions

## [0.0.5] - 2024-12-XX

### Added
- Basic REPL functionality
- Core system operations
- Platform detection

### Changed
- Initial Deno-based implementation

## [0.0.1] - 2024-11-XX

### Added
- Initial project structure
- Basic build system
- Core architecture design

---

## Version History

- **0.0.6**: Current stable release with full feature set
- **0.0.5**: Basic REPL and core functionality
- **0.0.1**: Initial project setup and architecture

## Release Notes

### Breaking Changes

- **0.0.6**: Complete rewrite with new architecture
- **0.0.5**: Initial public release

### Migration Guide

#### From 0.0.5 to 0.0.6

The 0.0.6 release introduces a completely new architecture. Key changes:

- New namespace structure: `hlvm.core.*`, `hlvm.app.*`, `hlvm.stdlib.*`
- Async-first API design
- Enhanced error handling and validation
- Improved module system

Example migration:
```javascript
// Old (0.0.5)
hlvm.system.os

// New (0.0.6)
hlvm.core.system.os
```

### Deprecation Notices

- No deprecated features in current release

---

For detailed information about each release, see the [GitHub releases page](https://github.com/hlvm-dev/hlvm/releases).
