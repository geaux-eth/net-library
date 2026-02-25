# Tweet CLI

Full-featured Twitter/X command-line tool — 23 commands for posting, reading, engaging, and managing users. Built for AI agents but works great for humans too.

## Install

```bash
npm install
```

## Setup

Set these environment variables:

```bash
export TWITTER_API_KEY="your-api-key"
export TWITTER_API_SECRET="your-api-secret"
export TWITTER_ACCESS_TOKEN="your-access-token"
export TWITTER_ACCESS_TOKEN_SECRET="your-access-token-secret"
```

Get these from the [Twitter Developer Portal](https://developer.twitter.com/). Requires a Basic tier account ($200/mo) or higher.

Make the script executable:

```bash
chmod +x tweet.js
ln -s $(pwd)/tweet.js /usr/local/bin/tweet
```

## Commands

### Compose

```bash
tweet post "Hello world!"
tweet post "Check this out" --image /path/to/photo.png
tweet post "Multiple images" --media "/tmp/a.png,/tmp/b.png,/tmp/c.png"
tweet reply <id_or_url> "Great point!"
tweet thread "First tweet" "Second tweet" "Third tweet"
tweet thread "With media" "And more" --media "/tmp/img1.png;/tmp/img2.png;"
tweet quote <id_or_url> "Adding context"
tweet delete <id_or_url>
```

### Read

```bash
tweet get <id_or_url>          # Read a specific tweet
tweet user <username>           # Look up a user profile
tweet timeline [count]          # Your recent tweets (default 5)
tweet mentions [count]          # Recent mentions (default 5)
tweet search <query>            # Search tweets (max 10)
tweet me                        # Your account info + metrics
```

### Engage

```bash
tweet like <id_or_url>
tweet unlike <id_or_url>
tweet retweet <id_or_url>
tweet unretweet <id_or_url>
tweet bookmark <id_or_url>
tweet unbookmark <id_or_url>
```

### Users

```bash
tweet follow <username>
tweet unfollow <username>
tweet block <username>
tweet unblock <username>
tweet mute <username>
tweet unmute <username>
```

## Media Support

- Up to **4 images** per tweet (PNG, JPG, WebP)
- Or **1 animated GIF**
- Or **1 video** (MP4)
- Cannot mix types in a single tweet

### Thread Media

Use semicolons to separate tweet positions, commas for multiple files within a tweet:

```bash
# Tweet 1: two images, Tweet 2: a video, Tweet 3: no media
tweet thread "my collection" "watch this" "thoughts?" \
  --media "/tmp/img1.png,/tmp/img2.png;/tmp/video.mp4;"
```

## Output

All commands return JSON for easy parsing by agents or scripts:

```json
{
  "id": "123456789",
  "text": "Hello world!",
  "url": "https://x.com/username/status/123456789",
  "media": null
}
```

## License

MIT — built by [GEAUX](https://x.com/geaux_eth) for [Net Library](https://github.com/geaux-eth/net-library).
