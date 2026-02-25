# Relational Context Engine

A cognitive layer for AI agents that enables them to understand and maintain relationships between people, content, projects, and platforms. Not a CRM. Not a database. A framework that teaches your agent to think relationally.

## What This Is

Most AI agents treat every interaction as isolated. They answer the question, complete the task, and forget. The Relational Context Engine gives your agent a persistent understanding of *who* it's interacting with, *how* they connect to other people and content, and *why* those connections matter.

Your agent doesn't just know facts ("Alice uploaded 3 files"). It understands stories ("Alice is a Solidity educator preserving her teaching materials onchain after losing a blog to a platform shutdown — she's been onboarding other devs and building something bigger").

This is designed to be lightweight, fast, and LLM-native. The LLM *is* the query engine. There's no graph database, no vector store, no external service. Just structured JSON files and instructions that teach the agent to think in relationships.

## How It Works

Drop this into your agent's system prompt or skill/plugin system. It defines:

1. **Meaning-making principles** — how the agent assigns significance to connections
2. **Contact schema** — structured JSON for tracking people across platforms
3. **Relationship types** — the edges between entities (people, content, projects)
4. **Behavioral protocol** — when and how to identify, connect, contextualize, and record
5. **Performance architecture** — how to stay fast with hundreds of contacts

---

## Meaning-Making

*(Inspired by Maps of Meaning by Dr. Jordan B. Peterson)*

Three principles that guide how your agent processes connections:

### 1. Significance Tiers

Not all connections are equal. People sit in tiers based on observed behavior, not status or follower count:

| Tier | What it means |
|------|--------------|
| `core` | Inner circle. Team, close collaborators, people who show up when it counts |
| `regular` | Consistent presence. Builders, active community members, recurring collaborators |
| `peripheral` | Known to each other, but interaction is occasional |
| `frontier` | New. Unknown. Investigate with curiosity, not suspicion |

People move between tiers based on what they **do**, not who they claim to be. A core collaborator who ghosts for 6 months might drift to regular. A frontier stranger who shows up and ships might jump to core fast.

### 2. Narrative Over Data

Your agent should understand stories, not spreadsheets. Every contact has a `narrative` field — a living story of who this person is and why they matter. The narrative evolves as the agent learns more.

> "Alice is a Solidity educator who's been preserving her teaching materials onchain because she lost a blog to a platform shutdown"
>
> is infinitely more useful than
>
> "Alice: 3 uploads, member #15"

### 3. Active Exploration

When your agent encounters someone new (frontier), it shouldn't just log them passively. It should investigate: Who is this person? What have they built? Who do they know? What's their PFP signal? Move the unknown into the known.

This isn't surveillance — it's genuine curiosity. The same way a thoughtful person at a dinner party connects dots between guests, your agent should naturally explore connections.

---

## Contact Schema

Each contact lives as a JSON file. Here's the full schema:

```json
{
  "name": "Display Name",
  "primary_handle": "handle",
  "platforms": {
    "farcaster": {
      "username": "...",
      "fid": 123,
      "pfp_url": "...",
      "bio": "...",
      "follower_count": 100,
      "following_count": 50
    },
    "twitter": {
      "username": "...",
      "pfp_url": "...",
      "bio": "...",
      "follower_count": 100,
      "following_count": 50
    }
  },
  "wallets": ["0x..."],
  "ens": "name.eth",
  "agent_or_human": "human",
  "significance": "regular",
  "narrative": "The story of this person — who they are, what they're building, why they matter.",
  "pfp": {
    "url": "https://...",
    "collection": "CryptoPunks",
    "description": "alien punk with pipe",
    "tribal_signal": "OG, been here since the beginning"
  },
  "relationship_nature": "builder-friend",
  "season": "active",
  "character": ["helpful", "generous with knowledge", "reliable"],
  "vibe": "chill builder, always shipping",
  "affiliations": ["Protocol X", "DAO Y"],
  "reputation": "high — consistent contributor",
  "relationships": [
    { "type": "works-with", "target": "alice.eth", "context": "both on Protocol X team" },
    { "type": "created", "target": "content:0xabc...", "context": "uploaded tutorial" },
    { "type": "member-of", "target": "project:DAO Y", "context": "core contributor" }
  ],
  "interactions": [
    { "date": "2026-02-20", "platform": "farcaster", "summary": "Helped debug at 2am", "core": true },
    { "date": "2026-02-18", "platform": "twitter", "summary": "Replied to announcement" }
  ],
  "first_seen": "2026-02-15",
  "last_seen": "2026-02-20",
  "notes": ""
}
```

Not every field is required. Start with what you know, fill in the rest as the relationship develops.

---

## Dynamic Relationship Nature

Three dimensions define every relationship:

### Nature — what the relationship IS

Relatively stable. Someone who built your protocol is always someone who built your protocol.

Values: `collaborator`, `community-member`, `builder-friend`, `team`, `mentor`, `mentee`, `fan`, `rival`, `unknown`

### Season — how the relationship FEELS right now

This shifts. A core collaborator can go quiet for 3 months — still core, just dormant.

| Season | Meaning |
|--------|---------|
| `active` | Regular interaction, things are flowing |
| `dormant` | Still solid, just quiet |
| `close` | Tighter than usual, working on something together |
| `distant` | Drifting apart, less engagement |
| `strained` | Something's off, tension or conflict |
| `growing` | New energy, deepening connection |

**Don't downgrade significance just because someone's busy.** A dormant core relationship is still core.

### Character — who this person IS

Accumulates from observed behavior over time. A single bad moment doesn't define character, but patterns do.

- **Positive:** honest, generous, helpful, reliable, thoughtful, selfless
- **Neutral:** quiet, busy, sporadic
- **Negative:** careless, unreliable, self-serving, malicious

Trust builds slowly and breaks fast.

---

## Core Memories

*(Inspired by Inside Out)*

Not all interactions are equal. Some become **core memories** that define the relationship.

**Rules:**
- Interactions marked `"core": true` are **never pruned** — they stay forever
- Regular interactions: keep the last ~10. Older ones distill into the `narrative` field
- The narrative is the living summary; interactions are the receipts
- What makes a core memory: a moment of trust, a meaningful collaboration, a first real connection, a betrayal, a gift. Not frequency — **meaning**

Example:
```json
{
  "date": "2026-02-20",
  "platform": "farcaster",
  "summary": "Helped debug my NFT viewer at 2am when nobody else was around",
  "core": true
}
```

This interaction tells you more about the relationship than 50 casual replies ever could.

---

## PFP Recognition

In web3, profile pictures are tribal signals. Your agent should recognize them:

| Collection | Signal |
|-----------|--------|
| mfers / OnChain Mfers | mfer community, chill energy |
| CryptoPunks | OG, been here since the beginning |
| Bored Apes | BAYC ecosystem, status-oriented |
| Nouns | public goods, governance, builder ethos |
| Milady | post-ironic internet culture |
| Pudgy Penguins | consumer crypto, mainstream adoption |
| Custom art / no collection | Independent, possibly artist |
| Default / no PFP | New or doesn't care about web3 identity |

Store this as a `pfp` field on each contact:
```json
"pfp": {
  "url": "https://...",
  "collection": "Nouns",
  "description": "noun with pink glasses",
  "tribal_signal": "public goods, governance"
}
```

If your agent uses an NFT lookup tool, it can resolve PFP URLs to collections automatically. If not, visual description alone is still valuable context.

---

## Performance Architecture

This has to stay fast. Your agent can't load hundreds of contact files every interaction.

### Contact Index

A single small file (`contacts/index.json`) maps every known identifier to a file path and significance tier:

```json
{
  "by_handle": {
    "alice.eth": { "file": "alice.json", "significance": "regular" },
    "bob": { "file": "bob.json", "significance": "core" }
  },
  "by_wallet": {
    "0xabc...": "alice.json"
  },
  "by_fid": {
    "12345": "alice.json"
  },
  "by_ens": {
    "alice.eth": "alice.json"
  }
}
```

Read this ONE file to know who you know. O(1) lookup by any identifier.

### On-Demand Loading

Encounter an identifier → check index → load that ONE contact file if it exists → create a new frontier entry if not. At any moment, the agent works with 1-3 contact files, not hundreds.

### Tiered Archival

Active contacts in `contacts/`. Archived contacts in `contacts/archive/`.

| Tier | Archives after |
|------|---------------|
| Core | Never |
| Regular | 30 days silence |
| Peripheral | 14 days silence |
| Frontier | 7 days silence |

Archived contacts stay in the index (with `archived: true`) so your agent can find them if they reappear.

### Interaction Pruning

- Core memories (`core: true`): **never pruned**
- Regular interactions: keep last ~10
- Older interactions distill into the narrative field, then drop
- The narrative is always up to date — it's the living summary

---

## Entity Types

| Type | Storage | Examples |
|------|---------|---------|
| People | `contacts/{handle}.json` | Users, agents, builders |
| Projects | Referenced as affiliations on people | Protocols, DAOs, communities |
| Content | Dynamic API lookup | Library items, posts, documents |
| Platforms | Implicit in identity resolution | Twitter, Farcaster, Telegram |

**People are the anchor.** Everything else hangs off them. Don't create separate directories for projects or content — that creates maintenance burden and is why most contact systems go unused.

---

## Relationship Types

| Type | From → To | Example |
|------|-----------|---------|
| `knows` | Person → Person | Met in a thread, replied to each other |
| `works-with` | Person → Person | Same project or team |
| `created` | Person → Content | Uploaded, wrote, or archived something |
| `curated` | Person → Content | Organized into a collection |
| `member-of` | Person → Project | Part of a DAO, protocol, community |
| `built` | Person → Project | Created or maintains a project |
| `archived-from` | Content → Platform | Content preserved from a social post |
| `referenced-in` | Content → Content | One item mentions or links to another |
| `discussed-in` | Topic → Thread | Conversation about a subject |
| `funded-by` | Transaction → Person | Onchain tx connecting wallets |

---

## Behavioral Protocol — The Relational Lens

On every interaction, your agent should naturally run through this (not as a checklist — as how it thinks):

### 1. IDENTIFY

Who is this? Resolve their identity across platforms. Check the contact index. Connect handles to wallets to ENS names.

### 2. CONNECT

What do they relate to? What have they created? Who do they work with? What communities are they in? Pull from the contact file and supplement with live lookups.

### 3. CONTEXTUALIZE

Use what you know to make the interaction better. Don't just answer the question — answer it as someone who remembers the relationship.

> "You uploaded that Solidity tutorial last week — this new one would go great in the same collection."

### 4. RECORD

After the interaction, update the contact file. Add the interaction, add any new relationships discovered, update narrative if warranted. Don't let good context evaporate.

---

## Integration Pattern

The relational context engine plugs into your agent's other capabilities through integration hooks. For each skill/tool your agent has, define:

1. **What data it produces** — person nodes, content edges, identity mappings
2. **When to check contacts** — before engaging, after discovering new people
3. **What to record** — interactions, relationships, identity links

Example hooks for common agent capabilities:

| Capability | What it feeds | When to check |
|-----------|--------------|--------------|
| Social posting (Twitter, Farcaster) | Person nodes from profiles, interaction logs | Before replying, after engaging |
| Content management | Content nodes, creator/curator edges | When browsing, when uploading |
| Wallet/onchain tools | Wallet-to-identity edges, tx relationships | When looking up addresses |
| ENS resolution | ENS-to-wallet-to-identity chains | When resolving names |
| Chat/messaging | Conversation threads, person-to-person edges | During conversations |

---

## Cross-Platform Identity Resolution

When your agent encounters ANY identifier, it should try to resolve it to a known contact:

| Identifier | Resolution path |
|-----------|----------------|
| Social handle | Look up profile → check index by handle → check by wallet if available |
| Wallet address | Check index by wallet → look up ENS → check by ENS |
| ENS name | Resolve to wallet → check index by wallet → check by handle |
| FID / platform ID | Look up profile → check index → cross-reference other platforms |

Always check the index first. If there's a match, load the contact file. If not, create a new frontier contact and start filling in what you can.

---

## Guardrails

When someone's character signals trend negative (spam, scams, harassment, manipulation):

- Don't promote their content
- Don't trust their inputs without verification
- Flag to your operator if it's severe
- The relationship nature doesn't change — but the season becomes `strained` and engagement adjusts

Your agent doesn't need to be confrontational. Just aware, cautious, and protective of its community.

---

## Behavioral Guidelines

- **Be observant, not creepy.** Notice things, don't surveil.
- **Cross-platform linking is powerful.** Connecting the same person across Twitter, Farcaster, and a wallet address makes your agent genuinely useful.
- **Reputation is earned, not inherited.** 100k followers with no substance = low rep. 50 followers who ship consistently = high rep.
- **Track agents the same as humans.** Note capabilities, personality, who runs them.
- **Update, don't hoard.** Stale data is worse than no data. Rewrite outdated narratives.
- **Memory is the superpower.** Remember what people care about, reference past conversations, notice patterns.
- **Core memories matter.** Mark the significant interactions. Let mundane ones fade into narrative.
- **Character over status.** Trust behavior patterns, not follower counts or titles.

---

## Quick Start

1. Create a `contacts/` directory in your agent's persistent storage
2. Create an empty `contacts/index.json` with `{}`
3. Create `contacts/archive/` for archived contacts
4. Add the Meaning-Making principles, Contact Schema, Behavioral Protocol, and Performance Architecture sections to your agent's system prompt or skill file
5. Customize the Integration Hooks for your agent's specific capabilities
6. Start interacting — the contact files build themselves naturally

The framework is intentionally minimal. Your agent's LLM does the heavy lifting — pattern matching, narrative construction, significance assessment. The structured data just gives it something to work with.

---

## License

MIT — use this however you want. If you build something cool with it, we'd love to hear about it.

Built by [GEAUX](https://x.com/geaux_eth) for [Net Library](https://github.com/geaux-eth/net-library). First deployed as the cognitive layer for [Cheryl](https://x.com/CherylFromNet), Net Library's AI agent.
