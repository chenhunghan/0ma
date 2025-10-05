<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0 (new principles added)
- Modified principles: N/A (all existing principles preserved)
- Added sections: Core Principles (4 new principles)
  - VI. Code Quality Standards
  - VII. Testing Excellence
  - VIII. User Experience Consistency
  - IX. Performance Requirements
- Removed sections: N/A
- Templates requiring updates:
  ✅ .specify/templates/plan-template.md (Constitution Check updated with new principles)
  ✅ .specify/templates/spec-template.md (aligned with new principles)
  ✅ .specify/templates/tasks-template.md (new principle-driven task types)
  ✅ .specify/templates/commands/*.md (generic agent guidance)
- Follow-up TODOs: N/A
-->

# Specify Constitution

## Core Principles

### I. Specification-First Development
Every feature MUST begin with a clear, user-focused specification that defines WHAT users need and WHY, without prescribing technical implementation details. Specifications must be testable, unambiguous, and written for business stakeholders. Technical decisions MUST be deferred to the planning phase.

### II. Test-Driven Development (NON-NEGOTIABLE)
TDD is mandatory: Tests MUST be written BEFORE implementation. The Red-Green-Refactor cycle is strictly enforced. Contract tests MUST be written first and MUST fail before any feature implementation begins. Integration tests validate user stories end-to-end.

### III. CLI Interface
All functionality MUST be accessible via command-line interface following stdin/stdout/stderr conventions. CLIs MUST support both human-readable and structured JSON output formats. This ensures composability, automation, and debuggability.

### IV. Integration over Implementation
Focus on contracts between components rather than internal implementation details. Integration tests MUST validate component interactions. New features MUST define API contracts first, implementation second. Shared schemas MUST be versioned and documented.

### V. Observability and Simplicity
Systems MUST be observable through structured logging and text-based I/O. Start simple and follow YAGNI (You Aren't Gonna Need It) principles. Every addition MUST be justified by concrete user value. Complexity MUST be explicitly documented and approved.

### VI. Code Quality Standards
All code MUST adhere to established quality standards: consistent formatting, comprehensive documentation, and maintainable structure. Code MUST be reviewed for clarity, performance, and security implications. Technical debt MUST be tracked and addressed systematically. Every function, module, and component MUST have clear purpose and responsibility.

### VII. Testing Excellence
Beyond TDD, comprehensive testing strategies MUST be implemented: unit tests, integration tests, end-to-end tests, and performance tests. Test coverage MUST meet minimum thresholds (80% for critical paths). Tests MUST be maintainable, fast, and deterministic. Performance regressions MUST be caught by automated benchmarks. Security testing MUST be included for all user-facing features.

### VIII. User Experience Consistency
All user interfaces MUST follow consistent design patterns, terminology, and interaction models. User flows MUST be intuitive and predictable. Error messages MUST be clear, actionable, and helpful. Accessibility standards MUST be met for all user interfaces. User feedback MUST be collected and incorporated systematically. Documentation MUST be user-centric and task-oriented.

### IX. Performance Requirements
All features MUST meet defined performance criteria: response times, throughput, and resource usage constraints. Performance MUST be measured, monitored, and optimized continuously. Performance budgets MUST be established and enforced. Scalability considerations MUST be addressed from the beginning. Performance regressions MUST be treated as bugs and fixed immediately.

## Development Workflow

### Feature Lifecycle
1. **Specification Phase**: User requirements → feature spec (no technical details)
2. **Planning Phase**: Spec → technical design, contracts, research
3. **Task Generation**: Design → ordered, dependency-aware tasks
4. **Implementation**: TDD cycle with tests before code
5. **Validation**: Automated tests, manual validation, performance verification

### Quality Gates
- Specifications MUST pass review checklist before planning
- Plans MUST pass Constitution compliance check before task generation
- Tasks MUST include failing tests before implementation
- Features MUST pass integration tests before completion
- Code MUST pass quality gates (coverage, performance, security) before merge
- User experience MUST be validated before release

## Governance

### Amendment Process
- Proposals MUST include rationale, impact analysis, and migration plan
- Changes affecting core principles require MAJOR version increment
- Additions or expansions require MINOR version increment
- Clarifications and wording fixes require PATCH version increment

### Compliance Review
- All automated workflows MUST verify Constitution compliance
- Human reviews MUST check constitutional adherence
- Violations MUST be documented with explicit justification
- Repeated violations trigger mandatory governance review

### Version Policy
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Current version MUST be referenced in all template files
- Template consistency MUST be maintained across all artifacts

**Version**: 1.1.0 | **Ratified**: 2025-10-05 | **Last Amended**: 2025-10-05