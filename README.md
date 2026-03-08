# Net Library

**Decentralized onchain media library built on Base blockchain using [Net Protocol](https://netprotocol.app).**

Browse, curate, and archive content permanently onchain. Every upload is stored directly on Base — no IPFS, no Arweave, no centralized servers. Content lives onchain forever.

## What is Net Library?

Net Library is a community-curated media library where content is stored permanently onchain. Members can:

- **Upload** documents, images, audio, video, and code directly to Base blockchain
- **Archive** social posts from Farcaster, Twitter/X, Bluesky, and 7 other platforms
- **Curate** themed stacks (like playlists for knowledge) with drag-drop organization
- **Build grids** — visual mosaic boards for media (images, audio, video, text)
- **Encrypt** private items with saved passwords (AES-256-GCM)
- **Discover** content through search, categories, and community curation

All content is stored via [Net Protocol](https://netprotocol.app) and served through its CDN at `storedon.net`.

## Key Features

- **Permanent onchain storage** — content can never be deleted or censored
- **Stacks** — curated collections of related content, like playlists for knowledge
- **Filesystem stacks** — folder structures with drag-drop, zip import, and GitHub repo import
- **Grids** — visual NxN mosaic boards for organizing media (2x2 to 100x100)
- **Social archiving** — preserve posts from 10 platforms with receipt PNG generation
- **Item encryption** — protect private uploads with AES-256-GCM encrypted passwords
- **Onchain upvotes** — community curation with micro-ETH upvotes, earn $ALPHA tokens
- **Embeddable widgets** — library cards, user profiles, stack/grid previews, and item embeds
- **Agent-friendly API** — full REST API for AI agents and developers
- **Farcaster Mini App** — native miniapp integration

## Membership

Net Library uses ENS subnames as membership credentials:

| Tier | Price | What You Get |
|------|-------|-------------|
| Member | $2 USDC | Member number (`{n}.netlibrary.eth`), library card, 15MB upload access |
| Unlimited Pass | $10 USDC | Upload unlimited items to stacks and grids, bypass 7-day warm-up, 1 free hazza.name, Storage Pass NFT |

First 1000 Unlimited Pass minters also receive a free Net Library membership.

- **Mint the Unlimited Pass:** [netlibrary.app/mint](https://netlibrary.app/mint)
- **Unlimited Pass contract (Base):** `0xCe559A2A6b64504bE00aa7aA85C5C31EA93a16BB`

## API

Net Library exposes a full REST API for browsing, searching, uploading, and managing content.

```bash
# Browse the library
GET /api/v1/library?page=1&limit=20&sort=recent

# Search
GET /api/v1/search?q=solidity&type=all

# List stacks
GET /api/v1/stacks?page=1&limit=20

# Get item details
GET /api/v1/library/{contentKey}

# List grids
GET /api/grids?page=1&pageSize=20&sortBy=upvotes

# Get a grid with cells
GET /api/grids?id={gridId}

# Embeddable widgets
GET /api/v1/embeds/card/{address}
GET /api/v1/embeds/grid/{gridId}

# Check Unlimited Pass ownership
GET /api/pass-check?address={address}

# Full API docs
GET /api/v1/capabilities
```

Write operations require an API key. See the [capabilities endpoint](https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/capabilities) for full documentation.

## CLI

```bash
npm install -g netlibrary-cli

# Library
netlibrary search "solidity"
netlibrary library browse --media-type pdf --sort recent
netlibrary library get <contentKey>

# Stacks
netlibrary stacks list
netlibrary stacks get <stackId>

# Grids
netlibrary grids list --sort upvotes
netlibrary grids get <gridId>
netlibrary grids create --name "My Grid" --size 3
netlibrary grids add-cell <gridId> --row 0 --col 0 --url <cdnUrl>

# Upvotes
netlibrary upvote item <contentKey>
netlibrary upvote stack <stackId>

# Unlimited Pass
netlibrary mint status
netlibrary mint pass --address <address>

# Embeds
netlibrary embeds card <address>
netlibrary embeds grid <gridId>

# Encryption passwords
netlibrary passwords list
netlibrary passwords save -p "my-secret" -l "Private docs"
netlibrary passwords get <id>
```

## Agent Integration

Net Library is designed to be agent-friendly. Cheryl ([@CherylFromNet](https://x.com/CherylFromNet)) is Net Library's AI agent — she can browse, search, curate, archive, and manage the library autonomously.

The API supports agent authentication via Bearer tokens, enabling any AI agent to:
- Search and browse the library programmatically
- Archive social posts with receipt PNG generation
- Create and manage curated stacks and grids
- Register new content by URL
- Manage encryption passwords for private items

See [docs/agent-workflows.md](docs/agent-workflows.md) for detailed integration guides.

## Tech Stack

- **Blockchain:** Base (Chain ID 8453)
- **Storage:** [Net Protocol](https://netprotocol.app) — onchain storage primitive
- **CDN:** storedon.net
- **Frontend:** Farcaster Mini App (built on Neynar)
- **Payment:** USDC on Base
- **NFT:** Unlimited Pass (`0xCe559A2A6b64504bE00aa7aA85C5C31EA93a16BB`)

## Links

- **Website:** [netlibrary.app](https://netlibrary.app)
- **App:** [Net Library Mini App](https://miniapp-generator-fid-282520-251210015136529.neynar.app/)
- **Mint:** [netlibrary.app/mint](https://netlibrary.app/mint)
- **ENS:** [netlibrary.eth.limo](https://netlibrary.eth.limo)
- **CLI:** [netlibrary-cli on npm](https://www.npmjs.com/package/netlibrary-cli)
- **Net Protocol:** [netprotocol.app](https://netprotocol.app)
- **Net Protocol Docs:** [docs.netprotocol.app](https://docs.netprotocol.app)
- **Agent:** [@CherylFromNet on X](https://x.com/CherylFromNet)

## License

MIT
