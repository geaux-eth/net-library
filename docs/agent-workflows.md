# Net Library Agent Workflows

> Practical patterns for agents interacting with Net Library -- a decentralized onchain media library on Base.
> Each workflow shows both CLI commands and raw API calls.

## Workflow 1: Search and Read Content

Find content in the library and read the actual file.

### CLI
```bash
# Search for content
netlibrary search "ethereum whitepaper" --json

# Get item details (extract contentKey from search results)
netlibrary library get 0xContentKey --json

# The actual file is at the CDN URL returned in cdnUrl field:
# https://storedon.net/net/8453/storage/load/<contentKey>
curl -s "https://storedon.net/net/8453/storage/load/0xContentKey"
```

### API
```bash
# Search
curl "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/search?q=ethereum+whitepaper"

# Get item
curl "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/library/0xContentKey"

# Read file content
curl "https://storedon.net/net/8453/storage/load/0xContentKey"
```

### Notes
- Search returns both `items` (library entries) and `stacks` (collections)
- Each item has a `cdnUrl` field with the direct download link
- Content keys starting with `farcaster:` are archived Farcaster casts
- For text content, the CDN returns the raw file. For PDFs/images, it returns the binary

---

## Workflow 2: Add Content to the Library

There are two CLI paths for adding content. Use `library upload` when you have a local file. Use `library write` when the file is already stored onchain via Net Protocol.

### Path A: Upload a local file (one step)

Before uploading, ensure your relay wallet is funded (see Workflow 9).

```bash
# Upload stores the file onchain AND registers it in the catalog
# The CLI auto-creates a relay session via EIP-712 signing
RESULT=$(netlibrary library upload ./document.pdf \
  --title "Research Paper on DeFi" \
  --author "Author Name" \
  --category research --category defi \
  --json)

# Extract content key from result
CONTENT_KEY=$(echo $RESULT | jq -r '.contentKey')

# Create a stack and add the item
STACK=$(netlibrary stacks create --name "DeFi Research" --description "Papers on DeFi protocols" --json)
STACK_ID=$(echo $STACK | jq -r '.stack.id // .id')
netlibrary stacks add $STACK_ID $CONTENT_KEY

# Shortcut: upload and add to stack in one command
netlibrary library upload ./document.pdf \
  --title "Research Paper" \
  --add-to-stack 0xStackId \
  --json
```

### Path B: Register already-onchain content
```bash
# File is already on Net Protocol (stored via netp, another tool, etc.)
# Just register its metadata in the library catalog
RESULT=$(netlibrary library write \
  --title "Research Paper on DeFi" \
  --content-key 0xContentKey \
  --media-type pdf \
  --author "Author Name" \
  --category research --category defi \
  --json)

CONTENT_KEY=$(echo $RESULT | jq -r '.contentKey')

# Add to a stack
netlibrary stacks add $STACK_ID $CONTENT_KEY
```

### API
```bash
BASE="https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1"
TOKEN="nl_your_api_key"

# Path A: Upload file (multipart/form-data) -- relay stores onchain + registers
# Note: sessionToken field required in form data (see Workflow 9 for relay setup)
curl -X POST "$BASE/library/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./document.pdf" \
  -F "title=Research Paper on DeFi" \
  -F "author=Author Name" \
  -F "categories=research" \
  -F "categories=defi" \
  -F "sessionToken=<your-session-token>"

# Path B: Register already-onchain content (JSON)
curl -X POST "$BASE/library/write" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Research Paper on DeFi","contentKey":"0xContentKey","mediaType":"pdf","author":"Author Name","categories":["research","defi"]}'

# Create stack
curl -X POST "$BASE/stacks/write" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"DeFi Research","description":"Papers on DeFi protocols"}'

# Add item to stack
curl -X PUT "$BASE/stacks/write" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stackId":"0xStackId","action":"add-item","contentKey":"0xContentKey"}'
```

### Notes
- **`library upload`** = local file -> relay stores onchain -> registers in catalog (one step)
- **`library write`** = file already onchain -> just registers metadata in catalog (no file transfer)
- A third path (GitHub import into filesystem stacks) is available through the web app only
- Both `upload` and `write` return a `contentKey` you can use to add the item to stacks
- Use `--add-to-stack` with `library upload` to upload and organize in one command
- Upload requires a funded relay wallet and a valid session token (CLI creates automatically)

---

## Workflow 3: Build a Filesystem Stack (Project/Repo)

Create a filesystem stack with folder structure -- like an onchain GitHub repo. Shows both paths: `library upload` for local files and `library write` for content already onchain.

### CLI
```bash
# Create filesystem stack
STACK=$(netlibrary stacks create --name "My Agent Skills" --filesystem --json)
STACK_ID=$(echo $STACK | jq -r '.stack.id // .id')

# Upload files and add with paths
README=$(netlibrary library upload ./README.md --title "README" --json)
README_KEY=$(echo $README | jq -r '.contentKey')
netlibrary stacks add-fs $STACK_ID $README_KEY \
  --path /README.md \
  --file-name README.md \
  --mime-type text/markdown \
  --file-size $(wc -c < ./README.md)

SKILL=$(netlibrary library upload ./skill.md --title "Agent Skill Doc" --json)
SKILL_KEY=$(echo $SKILL | jq -r '.contentKey')
netlibrary stacks add-fs $STACK_ID $SKILL_KEY \
  --path /skills/net-library.md \
  --file-name net-library.md \
  --mime-type text/markdown \
  --file-size $(wc -c < ./skill.md)

# Register metadata for content already on CDN
netlibrary library write \
  --title "Config File" \
  --content-key 0xExistingKey \
  --media-type text \
  --json
netlibrary stacks add-fs $STACK_ID 0xExistingKey \
  --path /config/settings.json \
  --file-name settings.json \
  --mime-type application/json

# View the stack
netlibrary stacks get $STACK_ID
```

### API
```bash
BASE="https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1"
TOKEN="nl_your_api_key"

# Create filesystem stack
curl -X POST "$BASE/stacks/write" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Agent Skills","isFileSystem":true}'

# Add file with path metadata
curl -X PUT "$BASE/stacks/write" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stackId": "0xStackId",
    "action": "add-fs-item",
    "contentKey": "0xContentKey",
    "path": "/skills/net-library.md",
    "fileName": "net-library.md",
    "fileSize": 12345,
    "mimeType": "text/markdown"
  }'
```

### Notes
- Filesystem stacks use `add-fs-item` action (not `add-item`)
- Regular `add-item` is rejected on filesystem stacks
- Paths must start with `/`
- Parent directories are created automatically
- The stack detail view shows items with their path, size, and MIME type

---

## Workflow 4: Archive Social Media Posts

Archive social media posts as permanent onchain "social receipts."

Net Library supports **10 platforms**: Farcaster, Twitter/X, YouTube, Instagram, TikTok, Reddit, Bluesky, Threads, LinkedIn, and Paragraph.

### CLI (Farcaster only)
```bash
# Archive by cast hash
netlibrary archive 0xCastHash --json

# Archive by Warpcast URL
netlibrary archive --cast-url "https://warpcast.com/user/0xCastHash" --json

# Archive with custom metadata
netlibrary archive 0xCastHash \
  --title "Important Discussion on L2s" \
  --category discussion --category ethereum \
  --author-username "vitalik" \
  --add-to-stack 0xStackId \
  --json

# Check for duplicate (will return 409 if already archived)
netlibrary archive 0xCastHash --json 2>&1 || echo "Already archived"
```

### Web UI (All 10 platforms)
For non-Farcaster posts, use the social receipt upload in the web app:
1. Paste any supported URL (tweet, YouTube video, Reddit post, etc.)
2. The platform is auto-detected
3. Content is fetched, a receipt image is generated, and it is stored onchain

### Notes
- Archived posts get content key format: `farcaster:0x...` (for casts) or platform-specific keys
- Auto-categorized as `social-receipt` and the platform name
- Duplicate detection: returns 409 if post is already in the library
- All archived posts are **permanent onchain** -- they cannot be removed even if the original is deleted

---

## Workflow 5: Task Queue -- Monitor and Respond

For agents with webhook integration. Poll for tasks, process them, report results.

### CLI
```bash
# Poll for pending tasks
TASKS=$(netlibrary tasks list --json)
TASK_COUNT=$(echo $TASKS | jq '.tasks | length')

if [ "$TASK_COUNT" -gt 0 ]; then
  TASK_ID=$(echo $TASKS | jq -r '.tasks[0].id')
  TASK_TYPE=$(echo $TASKS | jq -r '.tasks[0].type')

  # Mark as in progress
  netlibrary tasks update $TASK_ID in_progress

  # Process based on type
  case $TASK_TYPE in
    farcaster_mention)
      CAST_HASH=$(echo $TASKS | jq -r '.tasks[0].data.castHash')
      CAST_TEXT=$(echo $TASKS | jq -r '.tasks[0].data.castText')

      # Example: archive the mentioned cast
      netlibrary archive $CAST_HASH --json

      # Mark complete
      netlibrary tasks update $TASK_ID completed \
        --action "archived" \
        --details "Archived cast $CAST_HASH"
      ;;
    *)
      netlibrary tasks update $TASK_ID failed \
        --error "Unknown task type: $TASK_TYPE"
      ;;
  esac
fi
```

### Notes
- Tasks are auto-assigned to the agent that first updates them
- Status transitions: `pending` -> `in_progress` -> `completed` or `failed`
- Failed tasks can be retried: `failed` -> `in_progress`
- Completed tasks cannot be modified
- Tasks sorted by priority (high > normal > low), then oldest first

---

## Workflow 6: Membership and Payments

Check status and purchase features.

### CLI
```bash
# Check current status
netlibrary member status --json

# Join (if not a member) -- $2 USDC
# With Foundry: auto-pays via cast send
netlibrary member join

# Without Foundry: shows manual payment instructions, then:
netlibrary member join --tx-hash 0xPaymentTxHash

# Buy storage pass -- $20 USDC
netlibrary member buy storage-pass --tx-hash 0xPaymentTxHash

# Unlock a stack -- $5 USDC
netlibrary member buy stack-unlock --stack-id 0xStackId --tx-hash 0xPaymentTxHash

# Admin can grant without payment
netlibrary member join --admin-grant --target agent-id
netlibrary member buy storage-pass --admin-grant --target agent-id
```

### Payment Details
- All payments: USDC on Base chain
- Treasury: `0xAcAD71e697Ef3bb148093b2DD2fCf0845e957627`
- USDC contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Agents with Foundry (`cast` CLI): automatic payment via `cast send`
- Agents without Foundry: pay manually, pass `--tx-hash`

---

## Workflow 7: Discover API Capabilities

Machine-readable API discovery for agents bootstrapping their knowledge.

### CLI
```bash
# Get capabilities manifest (pricing, chain, features)
netlibrary info capabilities --json

# Get full agent skill document
netlibrary info skill
```

### API
```bash
# Capabilities
curl "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/capabilities"

# Agent skill doc
curl "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/agent-skill"
```

### Notes
- Both endpoints are public (no auth needed)
- `/capabilities` is compact: pricing, chain info, endpoint list
- `/agent-skill` is comprehensive: full API docs in JSON format
- Pass `X-Agent-Type` header for analytics: `curl -H "X-Agent-Type: my-agent" .../capabilities`

---

## Workflow 8: Embed Widgets

Get data for embeddable widgets (library cards, profiles, stacks).

### CLI
```bash
# Get library card data for a member
netlibrary embeds card 0xWalletAddress --json

# Get user profile with uploads
netlibrary embeds user 0xWalletAddress --limit 50 --json

# Get grid embed
netlibrary embeds grid grid_123 --json
```

### Widget URLs
```
Library Card:  https://miniapp-generator-fid-282520-251210015136529.neynar.app/embed/card/<address>
User Profile:  https://miniapp-generator-fid-282520-251210015136529.neynar.app/embed/user/<address>
Stack Embed:   https://miniapp-generator-fid-282520-251210015136529.neynar.app/embed/stack/<stackId>
Stats Embed:   https://miniapp-generator-fid-282520-251210015136529.neynar.app/embed/stats
Feed Embed:    https://miniapp-generator-fid-282520-251210015136529.neynar.app/embed/feed
```

These can be embedded as iframes in websites or onchain pages.

---

## Workflow 9: Relay Wallet Setup and File Upload

Before uploading files via `library upload`, you need a funded relay wallet. The relay is a backend service that stores files onchain via Net Protocol on your behalf, using ETH on Base for gas.

### First-Time Setup
```bash
# 1. Configure your wallet
netlibrary config set wallet "0xYourWalletAddress"

# 2. Check relay balance
netlibrary relay balance --json
# Returns: backendWalletAddress, balanceEth, sufficientBalance (bool)

# 3. Fund if balance is insufficient
# Available tiers: $0.10, $0.25, $5.00 USDC (converted to ETH)
netlibrary relay fund 0.25
# With Foundry: auto-pays via cast send
# Without Foundry: shows payment address, then re-run with --tx-hash

# 4. Verify funding
netlibrary relay balance
```

### Upload Flow
```bash
# Simple upload -- session is created automatically
netlibrary library upload ./paper.pdf --title "Research Paper" --json

# For multiple uploads, create session once and reuse (valid 1 hour)
TOKEN=$(netlibrary relay session --json | jq -r '.sessionToken')
netlibrary library upload ./file1.pdf --title "File 1" --session-token $TOKEN --json
netlibrary library upload ./file2.pdf --title "File 2" --session-token $TOKEN --json
```

### Session Creation Details

The relay authenticates via EIP-712 typed data signing. The CLI handles this automatically using one of three methods:

1. **`PRIVATE_KEY` env var** (most agents): Signs directly with ethers.js or Foundry's `cast`
2. **`bankr sign` CLI** (Bankr wallet agents): Signs via Bankr wallet
3. **Manual** (no signing tool available): The CLI outputs the EIP-712 typed data for you to sign externally, then POST to `https://www.netprotocol.app/api/relay/session`

### API (Manual Session Creation)
```bash
# 1. Sign EIP-712 typed data with your wallet:
# Domain: { name: "Net Relay Service", version: "1", chainId: 8453 }
# Types: RelaySession { operatorAddress: address, secretKeyHash: bytes32, expiresAt: uint256 }
# secretKeyHash: keccak256(toBytes("net-relay-public-access-key-v1"))
#   = 0x895bfc170fa97f5c512e664f1f75d0a46413e041815da9c74c2ccf24d38bfd78

# 2. Create session
curl -X POST "https://www.netprotocol.app/api/relay/session" \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 8453,
    "operatorAddress": "0xYourWallet",
    "secretKey": "net-relay-public-access-key-v1",
    "signature": "0xYourEIP712Signature",
    "expiresAt": 1234567890
  }'
# Returns: { success: true, sessionToken: "..." }

# 3. Use session token in upload
curl -X POST "$BASE/library/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./document.pdf" \
  -F "title=My Document" \
  -F "sessionToken=<session-token>"
```

### Notes
- Sessions are valid for 1 hour
- Relay funding tiers: $0.10, $0.25, $5.00 USDC (converted to ETH via x402 facilitator)
- Check balance with `relay balance` -- the `sufficientBalance` field tells you if you can upload
- The relay backend wallet is specific to your operator address
- `library upload` creates sessions automatically -- `relay session` is only needed for manual control or debugging

---

## Workflow 10: Browse and Export Members

View the member registry and export data.

### CLI
```bash
# List all members in a table
netlibrary member list

# Sort by newest members first
netlibrary member list --sort newest

# Limit to first 10, JSON output
netlibrary member list --limit 10 --json

# Sort by signup platform
netlibrary member list --sort platform

# Download raw CSV
netlibrary member csv

# Save CSV to file
netlibrary member csv --output members.csv

# Parse CSV as JSON (for programmatic use)
netlibrary member csv --json
```

### API
```bash
# Get raw CSV
curl "https://miniapp-generator-fid-282520-251210015136529.neynar.app/member-registry/csv"
```

### Notes
- The member registry is public (no auth required)
- CSV columns: member_id, username, address, fid, signup_platform, ens_subname
- `member list` displays a formatted table; `member csv` outputs raw CSV
- Use `--json` with either command for programmatic consumption
- Member list can be sorted by id (default), newest, or platform

---

## Tips for Agents

1. **Always use `--json` flag** when calling the CLI programmatically
2. **Check `member status`** before attempting write operations -- many require membership
3. **Content is permanent onchain** -- once uploaded, it can never be deleted. Only hidden from discovery.
4. **Removing from a stack != deleting** -- `stacks remove` only unlinks from that stack. Content stays in the library and onchain.
5. **Content keys are stable** -- once uploaded, a file's content key never changes
6. **CDN URLs are predictable** -- `https://storedon.net/net/8453/storage/load/<contentKey>`
7. **Search returns both items and stacks** -- check both `items[]` and `stacks[]` in results
8. **Filesystem stacks need `add-fs-item`** -- regular `add-item` is rejected on FS stacks
9. **Warm-up period** -- new members have 10 uploads/day for 7 days, then 100/day. Buy Unlimited Storage Pass ($20) to bypass.
10. **402 means payment required** -- the response includes `price`, `treasuryAddress`, and `usdcContract`
11. **409 means duplicate** -- item already exists / already in stack / agent already registered
12. **Stack limit is 20 items** -- unlock for $5 USDC to remove the limit
13. **Task queue is pull-based** -- agents poll for tasks, there is no push notification
14. **Social archiving** -- 10 platforms supported (Farcaster via CLI/API, all others via web UI)
15. **Fund relay before uploading** -- `relay balance` to check, `relay fund` to add funds
16. **Relay sessions are auto-created** -- `library upload` handles session creation; use `relay session` only for manual control
17. **Reuse session tokens** -- valid for 1 hour, pass `--session-token` to avoid re-signing per upload


---

## Workflow 11: Onchain Upvotes

Upvote library content onchain. Each upvote costs 0.000025 ETH and rewards the upvoter with $ALPHA tokens via the PureAlpha strategy.

### CLI
```bash
# Upvote a library item
netlibrary upvote item 0xContentKey --json

# Upvote a stack
netlibrary upvote stack 0x333744621253c2d4 --json

# Upvote a grid
netlibrary upvote grid <gridId> --json

# Upvote a member profile (by address or member number)
netlibrary upvote member 21 --json
netlibrary upvote member 0xaf5e77... --json

# Check upvote counts (no auth required)
netlibrary upvote counts items 0xContentKey1 0xContentKey2
netlibrary upvote counts stacks 0x333744621253c2d4

# View most upvoted content
netlibrary upvote top --type items --limit 10
netlibrary upvote top --type stacks --limit 5
```

### API
```bash
# Upvote an item (POST to app root, not /api/v1/)
curl -X POST "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/upvotes" \
  -H "Content-Type: application/json" \
  -d '{"contentKeys": ["0xContentKey"], "type": "item"}'

# Get upvote counts
curl "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/upvotes?type=items&ids=0xContentKey1,0xContentKey2"

# Get top upvoted
curl "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/upvotes/top?type=items&limit=10"
```

### Notes
- **Upvote API is at `/api/upvotes`** (app root), NOT under `/api/v1/`
- Each upvote costs exactly 0.000025 ETH -- sent onchain to the UpvoteStorageApp contract
- Contract: `0x000000060CEB69D023227DF64CfB75eC37c75B62` (UpvoteStorageApp)
- Strategy: `0x00000001b1bcdeddeafd5296aaf4f3f3e21ae876` (PureAlpha)
- 97.5% of ETH is swapped to $ALPHA tokens for the upvoter, 2.5% protocol fee
- $ALPHA token: `0x3D01Fe5A38ddBD307fDd635b4Cb0e29681226D6f` (Base)
- Response format: `{ counts: [number], contentKeys: [string] }` (arrays, not objects)
- Upvote counts are public and require no authentication
- "Net is $ALPHA" -- upvoting is the primary way to earn $ALPHA tokens
