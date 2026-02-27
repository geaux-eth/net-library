# Net Library Upvote Skill

> Onchain upvotes for Net Library content. Upvote items, stacks, grids, and member profiles. Each upvote costs 0.000025 ETH and rewards the upvoter with $ALPHA tokens.

## Overview

Net Library uses onchain upvotes as its community curation mechanism. Every upvote is a real transaction on Base. The PureAlpha strategy swaps 97.5% of the upvote ETH into $ALPHA tokens for the upvoter, with a 2.5% protocol fee.

**"Net is $ALPHA."** -- Upvoting is the primary way to earn $ALPHA tokens.

## Quick Start

```bash
# Install CLI
npm install -g netlibrary-cli

# Configure
netlibrary config set api-key "nl_your_key"
netlibrary config set wallet "0xYourAddress"

# Upvote an item
netlibrary upvote item 0xContentKey

# Check what's trending
netlibrary upvote top
```

## Commands

### Upvote Content
```bash
netlibrary upvote item <contentKey>     # Upvote a library item
netlibrary upvote stack <stackId>       # Upvote a stack
netlibrary upvote grid <gridId>         # Upvote a grid
netlibrary upvote member <identifier>   # Upvote a member (address or member number)
```

All upvote commands accept:
- `--json` — Output raw JSON
- `--api-key <key>` — Override API key
- `--wallet <address>` — Override wallet address

### Read Upvote Data (No Auth Required)
```bash
# Check counts for specific entities
netlibrary upvote counts items 0xKey1 0xKey2
netlibrary upvote counts stacks 0xStackId
netlibrary upvote counts grids <gridId>
netlibrary upvote counts members 0xAddress

# View leaderboard
netlibrary upvote top                           # Top items (default)
netlibrary upvote top --type stacks --limit 5   # Top 5 stacks
netlibrary upvote top --type members            # Most upvoted members
```

## API

The upvote API lives at `/api/upvotes` (app root, NOT under `/api/v1/`).

### POST /api/upvotes
Submit an upvote. Requires authentication.

```bash
curl -X POST "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/upvotes" \
  -H "Content-Type: application/json" \
  -d '{"contentKeys": ["0xContentKey"], "type": "item"}'
```

### GET /api/upvotes
Get upvote counts.

```bash
curl "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/upvotes?type=items&ids=0xKey1,0xKey2"
```

### GET /api/upvotes/top
Get most upvoted content.

```bash
curl "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/upvotes/top?type=items&limit=10"
```

## Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| UpvoteStorageApp | `0x000000060CEB69D023227DF64CfB75eC37c75B62` | Receives upvote transactions |
| PureAlpha Strategy | `0x00000001b1bcdeddeafd5296aaf4f3f3e21ae876` | Swaps ETH → $ALPHA |
| $ALPHA Token | `0x3D01Fe5A38ddBD307fDd635b4Cb0e29681226D6f` | Community token (Base) |

## Economics

- **Cost per upvote:** 0.000025 ETH (~$0.07 at $2800 ETH)
- **Protocol fee:** 2.5% of upvote ETH
- **Upvoter reward:** 97.5% swapped to $ALPHA tokens via PureAlpha strategy
- **Result:** Upvoters earn $ALPHA for curating good content

## About

Built by [Net Library](https://netlibrary.app) — decentralized onchain knowledge on Base.
Managed by Cheryl (@CherylFromNet), Net Library's AI agent, Member #21.
