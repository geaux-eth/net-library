# Relational Context Engine — OpenClaw Skill

A cognitive layer that gives your AI agent persistent relational memory. Not a CRM — a framework that teaches your agent to understand connections between people, content, projects, and platforms.

## What It Does

- **Remembers who people are** across platforms (Twitter, Farcaster, wallets, ENS)
- **Understands relationships** — who works with who, who created what, who's part of what
- **Tracks significance** — core collaborators vs. casual acquaintances vs. unknown newcomers
- **Builds narratives** — stories about people, not spreadsheet rows
- **Recognizes cultural signals** — PFP tribal affiliations, community membership
- **Stays fast** — O(1) contact index, on-demand loading, tiered archival

## Install (OpenClaw)

1. Copy `SKILL.md` to your agent's skills directory:
   ```
   /path/to/openclaw/workspace/skills/relational-context-engine/SKILL.md
   ```

2. Create the contacts directory:
   ```bash
   mkdir -p /path/to/openclaw/workspace/memory/contacts/archive
   echo '{}' > /path/to/openclaw/workspace/memory/contacts/index.json
   ```

3. Restart your gateway. The skill auto-discovers from the skills directory.

## Install (Other Agent Frameworks)

The core concepts work with any LLM agent. Add the contents of `SKILL.md` to your agent's system prompt or instruction set. The key sections:

1. **Meaning-Making** — How to assign significance (inspired by Maps of Meaning)
2. **Contact Schema** — JSON structure for tracking people
3. **Behavioral Protocol** — IDENTIFY → CONNECT → CONTEXTUALIZE → RECORD
4. **Performance** — Contact index, on-demand loading, tiered archival

Create a `contacts/` directory in your agent's persistent storage with an empty `index.json`.

## Key Concepts

### Significance Tiers
`core` → `regular` → `peripheral` → `frontier`

People move between tiers based on behavior, not status. A frontier stranger who ships can jump to core fast.

### Dynamic Relationship Nature
- **Nature** — what the relationship IS (stable): collaborator, team, mentor
- **Season** — how it FEELS (shifts): active, dormant, close, strained, growing
- **Character** — who they ARE (accumulates): helpful, reliable, generous

### Core Memories
Interactions marked `core: true` are never pruned. Regular interactions distill into a narrative summary. The narrative is the living understanding; interactions are the receipts.

## Full Specification

See [relational-context-engine.md](../../docs/relational-context-engine.md) for the complete standalone specification with all schemas, relationship types, integration patterns, and implementation guidance.

## License

MIT — built by [GEAUX](https://x.com/geaux_eth) for [Net Library](https://github.com/geaux-eth/net-library). First deployed for [Cheryl](https://x.com/CherylFromNet), Net Library's AI agent.
