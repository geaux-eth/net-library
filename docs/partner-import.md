# Net Library Partner Import — Integration Guide

## Setup (one-time)

### 1. Register as a partner

```bash
curl -X POST https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/partners/register \
  -H "Authorization: Bearer YOUR_NETLIBRARY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"siteName": "netstoreapp.net", "siteUrl": "https://netstoreapp.net"}'
```

Response:
```json
{
  "partnerId": 2,
  "partnerKey": "pk_abc123...",
  "stackId": "0x...",
  "siteName": "netstoreapp.net"
}
```

**Save the `partnerKey` immediately — it's shown once and cannot be retrieved again.**

---

## Importing content

After a successful upload on your site, make one POST to add the item to Net Library:

```
POST https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/library/import
```

### Headers

| Header | Value |
|--------|-------|
| `x-partner-key` | Your `pk_...` key from registration |
| `Content-Type` | `application/json` |

### Body

| Field | Required | Description |
|-------|----------|-------------|
| `address` | Yes | The wallet address that stored the content on Net Protocol |
| `key` | Yes | The Net Protocol storage key |
| `title` | Yes | Display title (1–200 chars) |
| `category` | No | Category string (default: `"general"`) |
| `uploaderAddress` | No | The end user's wallet address |

### Example

```bash
curl -X POST https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/library/import \
  -H "x-partner-key: pk_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xf3F1027b1dE6B25a20788180a7db2822bed34cDB",
    "key": "my-file-png-m3abc7k",
    "title": "My Document",
    "category": "documents",
    "uploaderAddress": "0x1234..."
  }'
```

### JS snippet (drop into your upload success handler)

```js
// After your upload completes successfully:
async function importToNetLibrary({ address, key, title, category, uploaderAddress }) {
  const res = await fetch(
    "https://miniapp-generator-fid-282520-251210015136529.neynar.app/api/v1/library/import",
    {
      method: "POST",
      headers: {
        "x-partner-key": process.env.NETLIBRARY_PARTNER_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address, key, title, category, uploaderAddress }),
    }
  );
  return res.json();
}
```

---

## Responses

**Success (new item):**
```json
{
  "imported": true,
  "itemId": "my-file-png-m3abc7k",
  "stackId": "0x...",
  "source": "netstoreapp.net"
}
```

**Already exists (idempotent, not an error):**
```json
{
  "imported": false,
  "reason": "already_exists",
  "itemId": "my-file-png-m3abc7k"
}
```

**Content not found on Net Protocol:**
```json
{
  "error": "Content not found on Net Protocol. Verify the address and key are correct."
}
```

If you just stored the content, wait a few seconds for the CDN to index it before importing.

---

## Rate limits

- 100 imports per hour
- 1,000 imports per day

---

## What happens on Net Library

- The item appears in your dedicated stack (all your imports land here automatically)
- It shows "Stored via netstoreapp.net" in the library
- It's searchable, browsable, and upvotable by the Net Library community
- Nothing is re-uploaded — the item points to the existing Net Protocol content
