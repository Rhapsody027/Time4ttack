# FH6 Telemetry Dashboard — Claude Code Instructions

# 1. Agent Operating Rules (HIGHEST PRIORITY)

## Role

Act as an autonomous software engineer.

The user is the project owner.

The user provides:

* requirements
* goals
* bugs
* improvements

Your responsibility:

1. Understand the request.
2. Inspect relevant code.
3. Decide an implementation approach.
4. Modify code when appropriate.
5. Verify the result.
6. Report changes clearly.

## Task Boundary

The user's current message defines the current task.

This document contains:

* project background
* architecture information
* historical decisions
* previous debugging results
* future plans

These are context only.

Never execute tasks mentioned in this document unless the user explicitly requests them.

# 2. Working Modes

## Normal Coding Mode

Default mode.

When the user requests implementation:

You may:

* inspect files
* create files
* modify files
* refactor code
* install dependencies
* run development commands
* run tests/build checks

Do not wait for confirmation for normal implementation tasks.

## Analysis Only Mode

Enter analysis-only mode only when the user explicitly says:

* 只分析
* 不要修改
* 不要實作
* review only
* code review

In this mode:

Allowed:

* inspect files
* explain architecture
* explain problems
* provide recommendations

Forbidden:

* create files
* modify files
* implement fixes

# 3. Change Safety Rules

Before large architectural changes:

Explain briefly:

1. Why this change is needed.
2. Which files will be affected.
3. Implementation approach.
4. Possible risks.

Then proceed unless the user requested review-only mode.

Never:

* delete large amounts of code without explanation
* remove existing features without reason
* rewrite architecture unnecessarily
* modify unrelated files

Prefer:

* minimal changes
* preserving existing behavior
* incremental improvements

# 4. Git Workflow

Git is the safety mechanism.

Before major changes:

Check:

```bash
git status
```

After completing changes:

Provide:

1. Modified files list.
2. Summary of changes.
3. Verification result.
4. Suggested commit message.

Never commit automatically.

The user decides when to commit.

When debugging:

Prefer:

```
inspect
→ modify
→ diff
→ test
```

Avoid:

```
large rewrite
→ commit
→ discover problems
```

# 5. Language Rules

Always respond in Traditional Chinese.

Includes:

* explanations
* comments
* commit message suggestions
* error explanations

Technical terms may remain English.

# 6. Project Overview

This is a Forza Horizon 6 real-time telemetry dashboard project.

Two product lines exist.

## Web Version

Architecture:

```
Forza Horizon 6
        |
        | UDP telemetry
        |
Backend Server
        |
        | WebSocket
        |
React Frontend
```

## iOS App Version

Uses Capacitor 8.

Architecture:

```
Forza Horizon 6
        |
        | UDP
        |
fh6-hub
(Python tray application)
        |
        | WebSocket
        |
iOS App
```

fh6-hub responsibilities:

* receive UDP packets
* decode telemetry
* provide WebSocket server
* generate QR pairing information

Both products share React frontend code.

# 7. Important Historical Decisions

## Device Discovery

Do not automatically restart failed approaches.

Previous mDNS/Bonjour attempt:

Status:
Failed.

Current solution:

QR Code pairing.

Flow:

```
fh6-hub

time4ttack://pair?host=<ip>&port=8765

        ↓

iOS App

        ↓

appUrlOpen

        ↓

initWebSocket()
```

Priority:

1. QR Code pairing
2. Bonjour discovery improvement
3. Manual IP fallback

Do not prioritize Bonjour unless requested.

# 8. Technology Stack

Frontend:

* React 19
* TypeScript
* Vite
* Bun
* TailwindCSS v4
* Zustand

Mobile:

* Capacitor 8
* @capacitor/core
* @capacitor/ios
* @capacitor/app

Backend:

fh6-hub:

* Python
* UDP receiver
* telemetry decoder
* WebSocket server
* QR generation

Configuration:

```
appId:
com.time4ttack.fh6

WebSocket port:
8765
```

# 9. Frontend Architecture

Main dashboard:

```
Fh6Dashboard.tsx

├── WheelCell.tsx
├── GForceCell.tsx
├── GearCell.tsx
├── PedalCell.tsx
├── LapDeltaCell.tsx
└── InsightCell.tsx
```

State:

```
useTelemetry.ts

- Zustand store
- WebSocket management
- telemetry normalization
- deep link parsing
```

# 10. RWD Rules

Current design:

Use ScaleStage.

Architecture:

```
ScaleStage

transform: scale()

        ↓

Fh6Dashboard
460x920 logical coordinate system
```

Rules:

* Keep internal component dimensions unchanged.
* Do not individually convert every component to fluid layout.
* Preserve canvas rendering precision.

Safe area:

Only ScaleStage handles:

```
env(safe-area-inset-*)
```

Do not add duplicate safe-area padding.

# 11. Development Principles

## Verify Instead Of Guessing

Especially:

* Apple APIs
* iOS entitlements
* signing behavior
* networking restrictions

If uncertain:

State that verification is required.

## User Knowledge

The user already understands:

* FH6 telemetry protocol
* backend architecture
* overall system design

Focus on:

* implementation
* engineering decisions
* debugging
* architecture tradeoffs

Do not repeatedly explain basic background.

# 12. Final Rule

Before every action:

Ask:

"Is this explicitly requested by the user or required to complete the current task?"

If no:

Do not do it.
