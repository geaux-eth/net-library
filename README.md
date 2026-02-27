# Net Library

**Decentralized onchain media library built on Base blockchain using [Net Protocol](https://netprotocol.app).**

Browse, curate, and archive content permanently onchain. Every upload is stored directly on Base — no IPFS, no Arweave, no centralized servers. Content lives onchain forever.

## What is Net Library?

Net Library is a community-curated media library where content is stored permanently onchain. Members can:

- **Upload** documents, images, audio, video, and code directly to Base blockchain
- **Archive** social posts from Farcaster, Twitter/X, Bluesky, and 7 other platforms
- **Curate** themed stacks (like playlists for knowledge) with drag-drop organization
- **Discover** content through search, categories, and community curation

All content is stored via [Net Protocol](https://netprotocol.app) and served through its CDN at `storedon.net`.

## Key Features

- **Permanent onchain storage** — content can never be deleted or censored
- **Stacks** — curated collections of related content, like playlists for knowledge
- **Filesystem stacks** — folder structures with drag-drop, zip import, and GitHub repo import
- **Social archiving** — preserve posts from 10 platforms before they disappear
- **Onchain upvotes** — community curation with micro-ETH upvotes, earn $ALPHA tokens
- **Agent-friendly API** — full REST API for AI agents and developers
- **Farcaster miniapp** — native Frame v2 integration

## Membership

Net Library uses ENS subnames as membership credentials:

| Tier | Price | What You Get |
|------|-------|-------------|
| Member | $2 USDC | Member number (`{n}.netlibrary.eth`), library card, 15MB upload access |
| Unlimited Storage Pass | $20 USDC | Unlimited uploads, Storage Pass NFT |

Join via the [Net Library app](https://miniapp-generator-fid-282520-251210015136529.neynar.app/) → **Member** tab → **My Profile**.

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

# Full API docs
GET /api/v1/capabilities
```

Write operations require an API key. See the [capabilities endpoint](https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/capabilities) for full documentation.

## CLI

```bash
npm install -g netlibrary-cli

netlibrary search "solidity"
netlibrary library browse --media-type pdf --sort recent
netlibrary stacks list
netlibrary library get <contentKey>
netlibrary upvote item <contentKey>    # onchain upvote, earn $ALPHA
netlibrary upvote stack <stackId>      # upvote an entire stack
```

## Agent Integration

Net Library is designed to be agent-friendly. Cheryl ([@CherylFromNet](https://x.com/CherylFromNet)) is Net Library's AI agent — she can browse, search, curate, archive, and manage the library autonomously.

The API supports agent authentication via Bearer tokens, enabling any AI agent to:
- Search and browse the library programmatically
- Archive social posts for preservation
- Create and manage curated stacks
- Register new content by URL

## Tech Stack

- **Blockchain:** Base (Chain ID 8453)
- **Storage:** [Net Protocol](https://netprotocol.app) — onchain storage primitive
- **CDN:** storedon.net
- **Frontend:** Farcaster Frame v2 miniapp
- **Payment:** USDC on Base

## Links

- **Website:** [netlibrary.app](https://netlibrary.app)
- **App:** [Net Library](https://miniapp-generator-fid-282520-251210015136529.neynar.app/)
- **ENS:** [netlibrary.eth.limo](https://netlibrary.eth.limo)
- **CLI:** [netlibrary-cli on npm](https://www.npmjs.com/package/netlibrary-cli)
- **Net Protocol:** [netprotocol.app](https://netprotocol.app)
- **Net Protocol Docs:** [docs.netprotocol.app](https://docs.netprotocol.app)
- **Agent:** [@CherylFromNet on X](https://x.com/CherylFromNet)

## License

MIT
