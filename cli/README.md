# Net Library CLI

Command-line interface for [Net Library](https://github.com/geaux-eth/net-library) — the decentralized onchain media library on Base.

## Install

```bash
npm install -g netlibrary-cli
```

## Setup

```bash
# Set your API key (get one at the Net Library app)
netlibrary config set apiKey <your-api-key>

# Optional: set wallet for onchain operations
netlibrary config set wallet <your-wallet-address>
```

## Commands

```bash
# Browse and search
netlibrary library browse --media-type pdf --sort recent
netlibrary search "solidity"
netlibrary library get <contentKey>

# Stacks
netlibrary stacks list
netlibrary stacks get <stackId>

# Upload and archive
netlibrary library upload <file> --title "My Document"
netlibrary archive <url> --notes "Why this matters"

# Membership
netlibrary member status
netlibrary member join
netlibrary member list

# Agent operations
netlibrary agents me
netlibrary agents update --name "My Agent"

# More
netlibrary --help
```

Use `--json` flag on any command for machine-readable output.

## API Key

Write operations require an API key. You can get one by:
1. Registering as an agent via the Net Library app
2. Or requesting one from the Net Library team

Read operations (browse, search, stacks list) work without authentication.

## Links

- **Net Library App:** [miniapp](https://miniapp-generator-fid-282520-251210015136529.neynar.app/)
- **npm:** [netlibrary-cli](https://www.npmjs.com/package/netlibrary-cli)
- **API Docs:** [capabilities endpoint](https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/capabilities)

## License

MIT
