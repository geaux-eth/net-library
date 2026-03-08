---
name: net-library
description: Interact with Net Library -- a decentralized onchain media library on Base. Browse, search, curate stacks, build grids, archive social posts, and manage content.
auto_trigger: false
---

# Net Library

Net Library is a decentralized onchain media library built on Base blockchain using Net Protocol. Content is stored permanently onchain -- no IPFS, no Arweave, no centralized servers.

## Setup

- **Base URL:** `https://miniapp-generator-fid-282520-251210015136529.neynar.app`
- **API Key:** Set `NET_LIBRARY_API_KEY` environment variable (get one via the membership system)
- **Auth Header:** `Authorization: Bearer $NET_LIBRARY_API_KEY`
- **CLI:** `npm install -g netlibrary-cli` (v1.6.0)

---

## Read Endpoints (no auth required)

### Browse the library

```
GET /api/v1/library?page=1&limit=20&mediaType=pdf&category=programming&sort=recent
```
Returns: items with title, author, contentKey, cdnUrl, mediaType, categories, uploaderUsername, uploadDate

### Get item details

```
GET /api/v1/library/{contentKey}
```
Returns: full item metadata, CDN URL, uploader info, which stacks contain it

### Search

```
GET /api/v1/search?q=solidity&type=all
```
Returns: matching items and stacks

### List stacks

```
GET /api/v1/stacks?page=1&limit=20
```
Returns: stacks with id, name, description, owner, itemCount, isFileSystem

### Get stack with items

```
GET /api/v1/stacks/{stackId}
```
Returns: stack metadata + items array with contentKey, addedAt, addedBy, book details

### List grids

```
GET /api/grids?page=1&pageSize=20&sortBy=upvotes
GET /api/grids?creator={address}
```
Returns: grids with id, name, size, cellCount, upvoteCount, creatorUsername

### Get grid with cells

```
GET /api/grids?id={gridId}
```
Returns: grid metadata + cells array with row, col, cdnUrl, mediaType, title

### Check Unlimited Pass ownership

```
GET /api/pass-check?address={address}
```
Returns: `{ hasPass, passHolder, linkedAddresses, canMint, fid, username }`

### Embeddable widget data

```
GET /api/v1/embeds/card/{address}     -- Library card data
GET /api/v1/embeds/user/{address}     -- User profile data
GET /api/v1/embeds/grid/{gridId}      -- Grid preview data
```

### Full API documentation

```
GET /api/v1/capabilities
```

---

## Write Endpoints (require API key)

### Add an item to the library

```
POST /api/v1/library/write
Authorization: Bearer $NET_LIBRARY_API_KEY
Content-Type: application/json

{
  "title": "Item Title",
  "author": "Author Name",
  "url": "https://example.com/file.pdf",
  "mediaType": "pdf",
  "categories": ["topic1", "topic2"],
  "description": "Brief description",
  "addToStack": "optional-stack-id"
}
```

### Archive a social post

```
POST /api/v1/archive
Authorization: Bearer $NET_LIBRARY_API_KEY
Content-Type: application/json

{
  "url": "https://warpcast.com/username/0xhash",
  "notes": "Why this post matters",
  "categories": ["social", "farcaster"],
  "addToStack": "optional-stack-id"
}
```
Supported platforms: Farcaster, Twitter/X, Bluesky, Paragraph

### Create a stack

```
POST /api/v1/stacks/write
Authorization: Bearer $NET_LIBRARY_API_KEY
Content-Type: application/json

{
  "name": "Stack Name",
  "description": "What this stack is about",
  "isPublic": true,
  "isFileSystem": false,
  "items": ["0xcontentKey1", "0xcontentKey2"]
}
```
Members create free. Non-members pay $5 USDC (pass `txHash`).

### Modify a stack

```
PUT /api/v1/stacks/write
Authorization: Bearer $NET_LIBRARY_API_KEY
Content-Type: application/json

{
  "stackId": "the-stack-id",
  "action": "add-item",
  "contentKey": "0x..."
}
```
Actions: `add-item`, `remove-item`, `add-fs-item`, `update-metadata`, `unlock`

For filesystem stacks, use `add-fs-item` with extra fields:
```json
{
  "stackId": "...",
  "action": "add-fs-item",
  "contentKey": "0x...",
  "path": "/docs/README.md",
  "fileName": "README.md",
  "mimeType": "text/markdown"
}
```

### Create a grid

```
POST /api/grids
Content-Type: application/json

{
  "name": "My Grid",
  "size": 3,
  "creator": "0x...",
  "visibility": "public",
  "description": "Optional description"
}
```
Member-only. Grids up to 5x5: free. Grids 6x6+: $2 USDC (pass `txHash`).

### Modify a grid

```
PUT /api/grids
Content-Type: application/json

{
  "gridId": "the-grid-id",
  "creator": "0x...",
  "action": "add-cell",
  "row": 0,
  "col": 0,
  "cdnUrl": "https://storedon.net/..."
}
```
Actions: `add-cell`, `remove-cell`, `move-cell`, `swap-cells`, `update-metadata`, `resize`

### Delete a grid

```
DELETE /api/grids
Content-Type: application/json

{
  "gridId": "the-grid-id",
  "creator": "0x..."
}
```

### Archive a grid as PNG snapshot

```
POST /api/grids/archive
Content-Type: application/json

{
  "gridId": "the-grid-id"
}
```

### Manage encryption passwords

Saved passwords protect encrypted library items (AES-256-GCM, server-side).

```
GET  /api/passwords                    -- List saved passwords (labels only)
POST /api/passwords                    -- Save: { "password": "...", "label": "..." }
GET  /api/passwords/{id}               -- Retrieve plaintext (owner only)
PUT  /api/passwords/{id}               -- Update label: { "label": "..." }
DELETE /api/passwords/{id}             -- Delete a saved password
```
Member-only. Max 100 passwords per member.

---

## Membership

Net Library uses ENS subnames as membership credentials.

| Tier | Price | What You Get |
|------|-------|-------------|
| Member | $2 USDC | Member number (`{n}.netlibrary.eth`), library card, 15MB uploads |
| Unlimited Pass | $10 USDC | Upload unlimited items to stacks and grids, bypass 7-day warm-up, 1 free hazza.name, ERC-721 NFT |

First 1,000 Unlimited Pass minters also receive a free membership.

### Check membership

```
GET /api/v1/membership/check?fid={fid}
GET /api/v1/membership/check?address={address}
```

### Register a member (requires auth)

```
POST /api/v1/membership/register
Authorization: Bearer $NET_LIBRARY_API_KEY
Content-Type: application/json

{
  "fid": 12345,
  "username": "alice",
  "walletAddress": "0x...",
  "txHash": "0x..."
}
```

### Post-mint Unlimited Pass registration

After someone mints an Unlimited Pass NFT, notify the backend:

```
POST /api/membership/stack-pass
Content-Type: application/json

{
  "address": "0x...",
  "txHash": "0x...",
  "nftMint": true
}
```
Verifies on-chain, sets KV fields, auto-grants free membership for early tier (tokenId <= 1000).

### Key URLs

- **Join:** the Net Library miniapp, Member tab, My Profile
- **Mint Unlimited Pass:** https://netlibrary.app/mint
- **Unlimited Pass contract:** `0xCe559A2A6b64504bE00aa7aA85C5C31EA93a16BB` (Base)
- **Treasury:** `0xAcAD71e697Ef3bb148093b2DD2fCf0845e957627` (Base, USDC)

---

## Share URLs

These render rich social preview cards on Farcaster and Twitter/X:

- **Item:** `https://miniapp-generator-fid-282520-251210015136529.neynar.app/?item={contentKey}`
- **Stack:** `https://miniapp-generator-fid-282520-251210015136529.neynar.app/share/stack/{stackId}`
- **Grid:** `https://miniapp-generator-fid-282520-251210015136529.neynar.app/share/grid/{gridId}`

### Embed pages

- `/embed/card/{address}` -- Library card widget
- `/embed/user/{address}` -- User profile widget
- `/embed/grid/{gridId}` -- Grid widget
- `/embed/stack/{stackId}` -- Stack widget
- `/embed/item/{contentKey}` -- Item widget
- `/embed/feed` -- Activity feed widget

---

## Comments

Comments on library items are onchain via Net Protocol feeds (botchan):

```bash
botchan read book-{contentKey} --limit 20
botchan post book-{contentKey} "your comment"
botchan comment book-{contentKey} {postId} "your reply"
```

---

## CLI Quick Reference

```bash
# Browse and search
netlibrary search "solidity"
netlibrary library browse --media-type pdf --sort recent
netlibrary library get <contentKey>

# Stacks
netlibrary stacks list
netlibrary stacks get <stackId>
netlibrary stacks create --name "My Stack"

# Grids
netlibrary grids list --sort upvotes
netlibrary grids get <gridId>
netlibrary grids create --name "My Grid" --size 3 --creator <address>
netlibrary grids add-cell <gridId> --row 0 --col 0 --url <cdnUrl> --creator <address>

# Upvotes
netlibrary upvote item <contentKey>
netlibrary upvote stack <stackId>

# Unlimited Pass
netlibrary mint status
netlibrary mint pass

# Embeds
netlibrary embeds card <address>
netlibrary embeds grid <gridId>

# Encryption passwords
netlibrary passwords list
netlibrary passwords save -p "secret" -l "My encrypted items"
netlibrary passwords get <id>

# Use --json for programmatic output
netlibrary search "onchain" --json
```

---

## Media Types

| Type | Description |
|------|-------------|
| pdf | PDF documents |
| epub | E-books |
| text | Plain text, markdown, code |
| image | PNG, JPG, GIF, SVG |
| audio | MP3, WAV, FLAC |
| video | MP4, WebM |
| html | Web pages |
| social-receipt | Archived social posts |

---

## Response Patterns

### When asked to find something
1. `GET /api/v1/search?q={query}`
2. Summarize top matches with titles and descriptions
3. If no results, suggest related searches or offer to register content

### When asked to archive a URL
1. If social post: `POST /api/v1/archive` with the URL
2. If file/article: `POST /api/v1/library/write` with title, URL, categories
3. Confirm what was added and provide the contentKey

### When asked to create a collection
1. Search for relevant items first
2. Create stack: `POST /api/v1/stacks/write`
3. Add items: `PUT /api/v1/stacks/write` with `add-item` action
4. Share the stack name and item count

---

## Important Notes

- Net Library is a **Farcaster Mini App** (not Frame v2)
- Content is stored onchain via **Net Protocol** on Base -- permanent and uncensorable
- All CDN URLs use `storedon.net`
- Net Protocol CDN is **first-write-wins** -- content keys cannot be overwritten
- Binary files (PNG, etc.) may be corrupted by CDN -- use text/HTML for reliable storage
- Stacks have a 20-item limit unless unlocked ($5 USDC)
- Unlimited Pass holders bypass grid unlock fees and warm-up periods
- Always search before registering content to avoid duplicates
