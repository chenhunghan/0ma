# Component State Management Conventions

This document outlines state management patterns for React components in the ZeroMa project.

## Core Principle: Child-Owned State

Components should own and manage their internal state when possible. Pass only callbacks to the parent for coordination.

## When to Move State Into Child Component

Move state into the child component when:

- **Single Consumer**: Only that component uses the state
- **Internal Concern**: State represents component-specific behavior (loading, errors, display data)
- **Streaming Data**: Frequent updates that don't affect parent decisions
- **Self-Contained**: Component can function independently with just callbacks

### Benefits

1. **Encapsulation**: Hide implementation details from parent
2. **Performance**: Prevent unnecessary parent re-renders on internal state changes
3. **Reusability**: Component works anywhere without parent setup overhead
4. **Simpler Parent**: Reduce parent complexity and cognitive load
5. **Easier Testing**: Test components independently without parent mocking

## When to Keep State in Parent

Keep state in parent when:

- **Multiple Children**: State coordinates behavior across sibling components
- **Parent Decisions**: Parent needs the state value to make routing/logic decisions
- **Global Concern**: State represents app-level or cross-cutting concerns
- **Persistence**: State survives component unmount/remount cycles

### Example: Modal Coordination

```
App (Parent)
├── showCreateModal (stays in parent - controls which modal is open)
├── showStartModal (stays in parent - controls which modal is open)
├── createdInstanceName (stays in parent - shared between modals)
│
├── CreateInstanceModal (Child)
│   ├── logs (moved to child - only used internally)
│   ├── isCreating (moved to child - internal display state)
│   └── error (moved to child - internal error handling)
│
└── StartInstanceModal (Child)
    ├── logs (moved to child - only used internally)
    ├── isStarting (moved to child - internal display state)
    └── error (moved to child - internal error handling)
```

## Implementation Pattern

### Child Component Interface

Prefer callbacks over state props:

```typescript
// ✅ Good: Callbacks for coordination
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: string) => void;
  onError?: (error: string) => void;
}

// ❌ Avoid: Passing internal state
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: Log[];
  isProcessing: boolean;
  error: string | null;
}
```

### Child Manages Own Data

Use custom hooks inside child components to manage their own data fetching and state:

- `useLimaCreateLogs()` inside `CreateInstanceModal`
- `useLimaStartLogs()` inside `StartInstanceModal`
- Parent only receives notifications via callbacks

## Current Implementation

The following components manage their own state:

- **CreateInstanceModal**: Manages creation logs, loading state, and errors internally
- **StartInstanceModal**: Manages start logs, loading state, and errors internally
- **CreateLogViewer**: Reusable log display component (purely presentational)

Parent (App) only manages:
- Modal visibility flags
- Instance name for coordination between modals
- Instance selection and lifecycle actions

---

**Last Updated**: 2025-12-25  
**Maintained By**: Development Team & AI Agents
