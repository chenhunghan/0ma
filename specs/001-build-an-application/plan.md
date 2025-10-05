# Implementation Plan: Lima VM Manager Application

**Branch**: `001-build-an-application` | **Date**: 2025-10-05 | **Spec**: [/specs/001-build-an-application/spec.md](spec.md)
**Input**: Feature specification from `/specs/001-build-an-application/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Build a macOS desktop application using Tauri 2.0 with React/TypeScript UI to manage Lima VM instances. The application provides a menu bar interface for VM lifecycle management (start/stop/suspend/terminate), YAML configuration editing, and Kubernetes cluster monitoring with real-time pod status and logs. Uses limactl v1.2.0 and kubectl CLI tools as dependencies, targeting single VM instance management with event-driven updates and manual retry error handling.

## Technical Context
**Language/Version**: Rust with Tauri 2.0, TypeScript, React
**Primary Dependencies**: Tauri 2.0, React 18+, TypeScript, limactl v1.2.0, kubectl
**Storage**: Application-managed directory for VM configuration YAML files
**Testing**: Rust cargo test, Jest/React Testing Library, integration tests
**Target Platform**: macOS (desktop application)
**Project Type**: single
**Performance Goals**: Event-driven VM status updates within 2s, pod log streaming <1s latency, config changes within 10s
**Constraints**: Single VM instance per app, requires limactl/kubectl installed, macOS only
**Scale/Scope**: Single user desktop application, one VM instance, Kubernetes pod monitoring

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Specification-First**: Does approach avoid implementation details in spec? ✅ YES - Spec focuses on user needs, not technical implementation
**Test-Driven**: Are tests planned before implementation? ✅ YES - Unit, integration, and E2E tests planned
**CLI Interface**: Is functionality accessible via CLI? ⚠️ PARTIAL - Uses limactl/kubectl CLIs but no standalone CLI
**Integration Focus**: Are contracts and integration tests prioritized? ✅ YES - Integration tests for VM and Kubernetes interactions
**Observability**: Is system observable and sufficiently simple? ✅ YES - Event-driven updates, structured logging
**Code Quality**: Are code quality standards and reviews planned? ✅ YES - TypeScript, Rust standards, automated checks
**Testing Excellence**: Is comprehensive testing strategy included? ✅ YES - Unit, integration, E2E, performance tests
**UX Consistency**: Are user experience patterns consistent? ✅ YES - macOS menu bar patterns, consistent design
**Performance**: Are performance requirements defined and measurable? ✅ YES - Specific latency and throughput targets

## Project Structure

### Documentation (this feature)
```
specs/001-build-an-application/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
lima-vm-manager/
├── src-tauri/           # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── vm.rs      # VM management commands
│   │   │   ├── k8s.rs      # Kubernetes monitoring commands
│   │   │   └── config.rs   # Configuration management
│   │   ├── services/
│   │   │   ├── mod.rs
│   │   │   ├── lima.rs     # limactl wrapper service
│   │   │   ├── kubectl.rs  # kubectl wrapper service
│   │   │   └── config.rs   # Configuration storage service
│   │   └── models/
│   │       ├── mod.rs
│   │       ├── vm.rs       # VM state models
│   │       ├── pod.rs      # Kubernetes pod models
│   │       └── config.rs   # Configuration models
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                 # React TypeScript frontend
│   ├── App.tsx
│   ├── components/
│   │   ├── MenuBar.tsx     # macOS menu bar component
│   │   ├── VMControls.tsx  # VM start/stop controls
│   │   ├── PodList.tsx     # Kubernetes pod status
│   │   ├── LogViewer.tsx   # Pod log viewer
│   │   └── YamlEditor.tsx  # Configuration YAML editor
│   ├── services/
│   │   ├── api.ts          # Tauri command API
│   │   └── events.ts       # Event-driven updates
│   ├── types/
│   │   └── index.ts        # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/               # End-to-end tests
├── contracts/             # API contracts
│   ├── vm-operations.json
│   ├── k8s-monitoring.json
│   └── config-management.json
└── README.md
```

**Structure Decision**: Single desktop application structure with Tauri backend (Rust) and React frontend (TypeScript). Organized by domain commands (VM, Kubernetes, Config) with clear separation between UI components and backend services.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - limactl v1.2.0 API surface and command output formats
   - kubectl command output formats and error handling
   - Tauri 2.0 menu bar integration patterns for macOS
   - React component patterns for dropdown menu interfaces
   - Event-driven communication between Rust backend and React frontend
   - macOS application packaging and distribution

2. **Generate and dispatch research agents**:
   ```
   Research limactl v1.2.0 CLI commands and output formats for VM management
   Research kubectl output formats for pod status and logs retrieval
   Research Tauri 2.0 macOS menu bar integration and system tray patterns
   Research React TypeScript component patterns for dropdown interfaces
   Research event-driven communication patterns in Tauri applications
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical decisions and API specifications

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - VM state, configuration, and lifecycle entities
   - Kubernetes pod, node, and service entities
   - Configuration history and user session entities
   - Event and update notification entities

2. **Generate API contracts** from functional requirements:
   - VM management commands (start, stop, status, config)
   - Kubernetes monitoring commands (pod list, logs, port-forward)
   - Configuration management commands (read, write, validate)
   - Event subscription contracts for real-time updates
   - Output OpenAPI/JSON schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - VM command contract tests
   - Kubernetes monitoring contract tests
   - Configuration management contract tests
   - Event streaming contract tests
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - VM lifecycle management scenarios
   - Configuration editing and application scenarios
   - Kubernetes monitoring and debugging scenarios
   - Error handling and recovery scenarios

5. **Update agent file incrementally** (O(1) operation):
   - Add Tauri, React, TypeScript technical guidance
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations requiring complexity documentation*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*