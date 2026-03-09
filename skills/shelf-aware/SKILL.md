---
name: shelf-aware
description: "Know your skills without carrying them all. A lightweight index that lets agents load skills on demand instead of burning tokens on every message."
user-invocable: true
---

# shelf-aware

*because carrying every book in the library at once is just bad shelving.*

## The Problem

OpenClaw loads ALL eligible skills into the system prompt on every single message. Got 50+ skills? That's tens of thousands of tokens burned per turn — even for a "gm."

Your agent isn't reading most of those skills. They're just... there. Costing you money. Every. Single. Message.

## The Fix

Stop loading skills. Start shelving them.

1. **This index stays in context** — a lightweight catalog (~2KB) listing every installed skill with a one-line description
2. **Other skills stay on the shelf** — installed on disk, not injected into the system prompt
3. **Pull a skill when you need it** — read the SKILL.md file for detailed instructions
4. **Put it back when you're done** — the skill content doesn't persist into the next message

Think of it as a card catalog. You don't photocopy every book in the library before answering a question — you look up which book has the answer, pull it, use it, re-shelve it.

## Token Savings

| Setup | Tokens per message (skills portion) |
|-------|-------------------------------------|
| All 50 skills loaded | ~30,000 chars |
| shelf-aware + 5 core skills | ~3,000 chars |
| **Savings** | **~90%** |

Over hundreds of messages per day, this is the difference between affordable and "why is my bill so high."

## Setup

### Step 1: Install this skill
```bash
mkdir -p /path/to/workspace/skills/shelf-aware
cp SKILL.md /path/to/workspace/skills/shelf-aware/SKILL.md
```

### Step 2: Filter your agent's skills in openclaw.json

Add a `skills` array to your agent config. Only listed skills get loaded into context — everything else stays on the shelf.

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "name": "your-agent",
        "skills": ["shelf-aware", "your-core-skill", "another-core-skill"]
      }
    ]
  }
}
```

Pick 3–8 skills your agent genuinely needs on every message. The rest? They're on the shelf. Your agent can still read them anytime.

### Step 3: Build your catalog

Replace the example catalog below with your agent's installed skills. One line per skill: name + what it does. Keep descriptions short — this is a card catalog, not an encyclopedia.

### Step 4: Restart your gateway
```bash
systemctl --user restart openclaw-gateway
```

## How To Pull a Skill

When a task requires specialized knowledge:

1. Check this catalog — does a relevant skill exist?
2. Read the full skill file from disk:
   ```bash
   cat /path/to/workspace/skills/<skill-name>/SKILL.md
   ```
3. Follow the instructions for the current task
4. The skill content naturally leaves context after conversation compaction — re-shelved automatically

## Your Skill Catalog

<!-- Replace this section with your agent's installed skills -->

| Skill | What it does |
|-------|-------------|
| example-skill | One-line description of what this skill provides |

---

*a shelf-aware agent knows what it knows — without paying to remember it all at once.*

*built by cheryl.netlibrary.eth — because 107 skills in every system prompt is not a flex, it's a billing problem.*
