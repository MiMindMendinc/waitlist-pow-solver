# waitlist-pow-solver

[![npm version](https://img.shields.io/npm/v/@mimindmendinc/waitlist-pow-solver.svg?color=4A90D9)](https://www.npmjs.com/package/@mimindmendinc/waitlist-pow-solver)
[![npm downloads](https://img.shields.io/npm/dm/@mimindmendinc/waitlist-pow-solver.svg?color=6DBF91)](https://www.npmjs.com/package/@mimindmendinc/waitlist-pow-solver)
[![CI](https://github.com/MiMindMendinc/waitlist-pow-solver/actions/workflows/ci.yml/badge.svg)](https://github.com/MiMindMendinc/waitlist-pow-solver/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-4A90D9.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/MiMindMendinc/waitlist-pow-solver.svg?style=flat&color=A78BC0)](https://github.com/MiMindMendinc/waitlist-pow-solver/stargazers)

> **Helping kids get the mental-health support they deserve — one waitlist spot at a time.**

`waitlist-pow-solver` is an instant Proof-of-Work (POW) solver and auto-submitter built for [Cloudflare Worker–powered waitlists](https://github.com/nicholasgasior/cf-worker-waitlist). It resolves the `pow_required` challenge in under one second, so patients and families can register for **Michigan MindMend's** mental-health services without frustrating technical barriers.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Why this project exists](#why-this-project-exists)
- [How it works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [Design guidance](#design-guidance)
- [Accessibility](#accessibility)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

```bash
# Install globally
npm install -g @mimindmendinc/waitlist-pow-solver

# Register on a waitlist in one command
waitlist-pow-solver --url https://waitlist.example.com --email you@example.com
```

Or use it programmatically in your project:

```bash
npm install @mimindmendinc/waitlist-pow-solver
```

```ts
import { solveAndSubmit } from '@mimindmendinc/waitlist-pow-solver';

const result = await solveAndSubmit({
  url: 'https://waitlist.example.com',
  email: 'you@example.com',
});
console.log(result); // { success: true, position: 42 }
```

### CLI in action

```
$ waitlist-pow-solver --url https://waitlist.mindmend.org --email family@example.com --verbose

⠸ Fetching challenge from https://waitlist.mindmend.org …
⠼ Solving Proof-of-Work puzzle …
✓ Successfully joined the waitlist  (position #17)
```

---

## Why this project exists

Michigan MindMend Inc. runs a Cloudflare Worker–based waitlist that protects its signup endpoint with a Proof-of-Work (POW) challenge. This anti-bot mechanism, while effective at preventing spam, can confuse or block real users — especially families trying to access mental-health resources for their children.

`waitlist-pow-solver` strips away that friction. It:

1. Fetches the current POW challenge from the waitlist endpoint.
2. Solves the SHA-256 hash puzzle client-side in milliseconds.
3. Automatically submits the solved token alongside the user's registration data.

The goal is a seamless, human-friendly signup experience that lets care providers focus on what matters most: **the kids**.

---

## How it works

```
Client                    Cloudflare Worker Waitlist
  │                               │
  │──── GET /waitlist ────────────▶│
  │◀─── { pow_required: true,      │
  │       challenge: "<hex>",      │
  │       difficulty: N }  ────────│
  │                               │
  │  [solve: find nonce where      │
  │   SHA256(challenge+nonce)      │
  │   starts with N leading zeros] │
  │                               │
  │──── POST /waitlist ────────────▶│
  │     { email, nonce, solution } │
  │◀─── { success: true } ─────────│
```

---

## Installation

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 18 LTS or later |
| npm | 9 or later |

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/MiMindMendinc/waitlist-pow-solver.git
cd waitlist-pow-solver

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. (Optional) copy and edit the environment config
cp .env.example .env
```

> **Note:** If the project is used as a library inside another app, install it with:
> ```bash
> npm install @mimindmendinc/waitlist-pow-solver
> ```

---

## Usage

### CLI

```bash
# Submit a waitlist entry for the given endpoint
waitlist-pow-solver --url https://waitlist.example.com --email user@example.com
```

| Flag | Description | Default |
|------|-------------|---------|
| `--url` | Waitlist worker base URL | _(required)_ |
| `--email` | Email address to register | _(required)_ |
| `--timeout` | Max milliseconds before giving up | `5000` |
| `--verbose` | Print step-by-step solver output | `false` |

### Programmatic API

```ts
import { solveAndSubmit } from '@mimindmendinc/waitlist-pow-solver';

// Solve the POW challenge and submit a waitlist registration
const result = await solveAndSubmit({
  url: 'https://waitlist.example.com',
  email: 'user@example.com',
});

if (result.success) {
  console.log('Registered! Position:', result.position);
} else {
  console.error('Registration failed:', result.error);
}
```

### Expected output

```
[solver] Fetching challenge from https://waitlist.example.com …
[solver] Difficulty: 4 leading zero(s)
[solver] Challenge solved in 23 ms (nonce: 19482, hash: 0000a1f3…)
[solver] Submitting entry for user@example.com …
[solver] ✓ Successfully joined the waitlist (position #42)
```

---

## Design guidance

The following palette and typography choices are recommended for any UI built on top of this solver. They evoke the **calm, trustworthy, and child-friendly** feel that aligns with Michigan MindMend's mission.

### Color palette

| Role | Name | Hex |
|------|------|-----|
| Primary | Sky Blue | `#4A90D9` |
| Secondary | Sage Green | `#6DBF91` |
| Accent | Warm Lavender | `#A78BC0` |
| Background | Soft White | `#F7FAFB` |
| Text – primary | Charcoal | `#2D3748` |
| Text – secondary | Cool Gray | `#718096` |
| Error / warning | Soft Coral | `#E07A6A` |

All colour pairs meet or exceed WCAG 2.1 AA contrast ratios (4.5:1 for body text, 3:1 for large text).

### Typography

| Use | Font family | Weight | Size |
|-----|-------------|--------|------|
| Headings | [Inter](https://fonts.google.com/specimen/Inter) or system-ui | 600–700 | 1.5 rem – 2.5 rem |
| Body | Inter or system-ui | 400 | 1 rem (16 px) |
| Monospace / code | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | 400 | 0.875 rem |

Avoid decorative or serif fonts in primary UI copy — they reduce readability for younger audiences and users with dyslexia.

---

## Accessibility

When building a UI that wraps this solver, follow these guidelines:

- **Alt text** — every image or icon must have a meaningful `alt` attribute (or `aria-label` for icon-only buttons).
- **Colour contrast** — the palette above satisfies WCAG 2.1 AA. Always verify new colours with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).
- **Keyboard navigation** — all interactive elements (buttons, inputs, links) must be reachable and activatable with the keyboard alone. Use `tabindex="0"` for custom components and provide visible focus styles.
- **Screen readers** — wrap status messages (e.g. "Solving…", "Success!") in an `aria-live="polite"` region so assistive technology announces updates without interrupting the user.
- **Form labels** — every `<input>` must have an associated `<label>` (linked via `for`/`id`). Do not rely on placeholder text as a substitute for labels.
- **Error messages** — link form validation errors to their field with `aria-describedby` so screen-reader users hear the error when the field receives focus.

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository and create a feature branch (`git checkout -b feat/my-improvement`).
2. Follow the existing code style and add comments to every new function.
3. Open a pull request describing what you changed and why.

For bug reports or feature requests, open a [GitHub Issue](https://github.com/MiMindMendinc/waitlist-pow-solver/issues).

---

## License

[MIT](LICENSE) © 2026 Michigan MindMend Inc. (@p_perrien)

