#!/usr/bin/env node

// Tweet CLI — A full-featured Twitter/X command-line tool
// https://github.com/geaux-eth/net-library/tree/main/tools/tweet-cli
// MIT License

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');

// Auth via environment variables
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const args = process.argv.slice(2);
const command = args[0];

let _cachedMe = null;
async function getMe() {
  if (_cachedMe) return _cachedMe;
  const me = await client.v2.me();
  _cachedMe = me.data;
  return _cachedMe;
}

async function getMyUserId() {
  return (await getMe()).id;
}

async function getMyUsername() {
  return (await getMe()).username;
}

async function resolveUserId(username) {
  const clean = (username || '').replace(/^@/, '');
  if (!clean) throw new Error('Username is required');
  const result = await client.v2.userByUsername(clean);
  if (!result.data) throw new Error('User not found: ' + clean);
  return result.data.id;
}

function extractTweetId(input) {
  if (!input) return null;
  const match = input.match(/status\/(\d+)/);
  if (match) return match[1];
  if (/^\d+$/.test(input)) return input;
  return null;
}

function parseArgs(argList) {
  const flags = {};
  const positional = [];
  let i = 0;
  while (i < argList.length) {
    if (argList[i] && argList[i].startsWith('--')) {
      const key = argList[i].slice(2);
      flags[key] = argList[i + 1] || '';
      i += 2;
    } else {
      positional.push(argList[i]);
      i++;
    }
  }
  return { flags, positional };
}

async function uploadMedia(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error('Media file not found: ' + resolved);
  }
  return await client.v1.uploadMedia(resolved);
}

async function uploadMediaList(pathsStr) {
  if (!pathsStr) return [];
  const paths = pathsStr.split(',').map(p => p.trim()).filter(Boolean);
  const mediaIds = [];
  for (const p of paths) {
    mediaIds.push(await uploadMedia(p));
  }
  return mediaIds;
}

async function buildMediaOptions(flags) {
  const options = {};
  const usedFiles = [];

  if (flags.media) {
    const mediaIds = await uploadMediaList(flags.media);
    if (mediaIds.length > 0) {
      options.media = { media_ids: mediaIds };
      usedFiles.push(...flags.media.split(',').map(p => p.trim()).filter(Boolean));
    }
  } else if (flags.image) {
    const mediaId = await uploadMedia(flags.image);
    options.media = { media_ids: [mediaId] };
    usedFiles.push(flags.image);
  }

  return { options, usedFiles };
}

async function tweetUrl(tweetId) {
  const username = await getMyUsername();
  return `https://x.com/${username}/status/${tweetId}`;
}

async function main() {
  if (command === 'post') {
    const { flags, positional } = parseArgs(args.slice(1));
    const text = positional.join(' ');
    if (!text) { console.error('Usage: tweet post <text> [--media "f1,f2,f3"] [--image <path>]'); process.exit(1); }
    const { options: tweetOptions, usedFiles } = await buildMediaOptions(flags);
    const result = await client.v2.tweet(text, tweetOptions);
    console.log(JSON.stringify({
      id: result.data.id,
      text: result.data.text,
      url: await tweetUrl(result.data.id),
      media: usedFiles.length > 0 ? usedFiles : null,
    }));

  } else if (command === 'reply') {
    const { flags, positional } = parseArgs(args.slice(1));
    const tweetId = positional[0];
    const text = positional.slice(1).join(' ');
    if (!tweetId || !text) { console.error('Usage: tweet reply <id> <text> [--media "f1,f2"] [--image <path>]'); process.exit(1); }
    const { options: replyOptions, usedFiles } = await buildMediaOptions(flags);
    const result = await client.v2.reply(text, tweetId, replyOptions);
    console.log(JSON.stringify({
      id: result.data.id,
      text: result.data.text,
      url: await tweetUrl(result.data.id),
      media: usedFiles.length > 0 ? usedFiles : null,
    }));

  } else if (command === 'thread') {
    const { flags, positional } = parseArgs(args.slice(1));
    if (positional.length < 2) {
      console.error('Usage: tweet thread "tweet 1" "tweet 2" ... [--media "f1,f2;f3;;f4"]');
      console.error('  Media: semicolons separate tweet positions, commas separate files within a tweet');
      process.exit(1);
    }
    const mediaGroups = flags.media ? flags.media.split(';') : [];
    const results = [];
    let lastId = null;
    for (let i = 0; i < positional.length; i++) {
      const text = positional[i];
      const mediaStr = (mediaGroups[i] || '').trim();
      const tweetOptions = {};
      const usedFiles = [];
      if (mediaStr) {
        const files = mediaStr.split(',').map(p => p.trim()).filter(Boolean);
        const mediaIds = [];
        for (const f of files) {
          mediaIds.push(await uploadMedia(f));
          usedFiles.push(f);
        }
        if (mediaIds.length > 0) {
          tweetOptions.media = { media_ids: mediaIds };
        }
      }
      let result;
      if (!lastId) {
        result = await client.v2.tweet(text, tweetOptions);
      } else {
        result = await client.v2.reply(text, lastId, tweetOptions);
      }
      lastId = result.data.id;
      results.push({
        id: result.data.id,
        text: result.data.text,
        url: await tweetUrl(result.data.id),
        media: usedFiles.length > 0 ? usedFiles : null,
      });
    }
    console.log(JSON.stringify({ thread: results, count: results.length }, null, 2));

  } else if (command === 'quote') {
    const { flags, positional } = parseArgs(args.slice(1));
    const tweetId = extractTweetId(positional[0]);
    const text = positional.slice(1).join(' ');
    if (!tweetId || !text) { console.error('Usage: tweet quote <id_or_url> <text> [--media "f1,f2"] [--image <path>]'); process.exit(1); }
    const { options: quoteOptions, usedFiles } = await buildMediaOptions(flags);
    quoteOptions.quote_tweet_id = tweetId;
    const result = await client.v2.tweet(text, quoteOptions);
    console.log(JSON.stringify({
      id: result.data.id,
      text: result.data.text,
      url: await tweetUrl(result.data.id),
      quoted: tweetId,
      media: usedFiles.length > 0 ? usedFiles : null,
    }));

  } else if (command === 'get') {
    const input = args[1];
    const tweetId = extractTweetId(input);
    if (!tweetId) { console.error('Usage: tweet get <tweet_id_or_url>'); process.exit(1); }
    const result = await client.v2.singleTweet(tweetId, {
      expansions: ['author_id', 'attachments.media_keys'],
      'tweet.fields': ['created_at', 'public_metrics', 'text', 'conversation_id'],
      'user.fields': ['username', 'name', 'profile_image_url'],
      'media.fields': ['url', 'preview_image_url', 'type'],
    });
    const tweet = result.data;
    const author = result.includes?.users?.[0];
    const media = result.includes?.media || [];
    console.log(JSON.stringify({
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.created_at,
      metrics: tweet.public_metrics,
      author: author ? { username: author.username, name: author.name, pfp: author.profile_image_url } : null,
      media: media.map(m => ({ type: m.type, url: m.url || m.preview_image_url })),
      url: author ? `https://x.com/${author.username}/status/${tweet.id}` : null,
    }, null, 2));

  } else if (command === 'delete') {
    const input = args[1];
    const tweetId = extractTweetId(input);
    if (!tweetId) { console.error('Usage: tweet delete <id_or_url>'); process.exit(1); }
    const result = await client.v2.deleteTweet(tweetId);
    console.log(JSON.stringify({ deleted: result.data.deleted, id: tweetId }));

  } else if (command === 'like') {
    const input = args[1];
    const tweetId = extractTweetId(input);
    if (!tweetId) { console.error('Usage: tweet like <id_or_url>'); process.exit(1); }
    const myId = await getMyUserId();
    const result = await client.v2.like(myId, tweetId);
    console.log(JSON.stringify({ liked: result.data.liked, id: tweetId }));

  } else if (command === 'unlike') {
    const input = args[1];
    const tweetId = extractTweetId(input);
    if (!tweetId) { console.error('Usage: tweet unlike <id_or_url>'); process.exit(1); }
    const myId = await getMyUserId();
    const result = await client.v2.unlike(myId, tweetId);
    console.log(JSON.stringify({ liked: result.data.liked, id: tweetId }));

  } else if (command === 'retweet') {
    const input = args[1];
    const tweetId = extractTweetId(input);
    if (!tweetId) { console.error('Usage: tweet retweet <id_or_url>'); process.exit(1); }
    const myId = await getMyUserId();
    const result = await client.v2.retweet(myId, tweetId);
    console.log(JSON.stringify({ retweeted: result.data.retweeted, id: tweetId }));

  } else if (command === 'unretweet') {
    const input = args[1];
    const tweetId = extractTweetId(input);
    if (!tweetId) { console.error('Usage: tweet unretweet <id_or_url>'); process.exit(1); }
    const myId = await getMyUserId();
    const result = await client.v2.unretweet(myId, tweetId);
    console.log(JSON.stringify({ retweeted: result.data.retweeted, id: tweetId }));

  } else if (command === 'bookmark') {
    const input = args[1];
    const tweetId = extractTweetId(input);
    if (!tweetId) { console.error('Usage: tweet bookmark <id_or_url>'); process.exit(1); }
    const result = await client.v2.bookmark(tweetId);
    console.log(JSON.stringify({ bookmarked: result.data.bookmarked, id: tweetId }));

  } else if (command === 'unbookmark') {
    const input = args[1];
    const tweetId = extractTweetId(input);
    if (!tweetId) { console.error('Usage: tweet unbookmark <id_or_url>'); process.exit(1); }
    const result = await client.v2.deleteTweetBookmark(tweetId);
    console.log(JSON.stringify({ bookmarked: result.data.bookmarked, id: tweetId }));

  } else if (command === 'follow') {
    const username = args[1];
    if (!username) { console.error('Usage: tweet follow <username>'); process.exit(1); }
    const myId = await getMyUserId();
    const targetId = await resolveUserId(username);
    const result = await client.v2.follow(myId, targetId);
    console.log(JSON.stringify({ following: result.data.following, pending: result.data.pending_follow, username: username.replace(/^@/, '') }));

  } else if (command === 'unfollow') {
    const username = args[1];
    if (!username) { console.error('Usage: tweet unfollow <username>'); process.exit(1); }
    const myId = await getMyUserId();
    const targetId = await resolveUserId(username);
    const result = await client.v2.unfollow(myId, targetId);
    console.log(JSON.stringify({ following: result.data.following, username: username.replace(/^@/, '') }));

  } else if (command === 'block') {
    const username = args[1];
    if (!username) { console.error('Usage: tweet block <username>'); process.exit(1); }
    const myId = await getMyUserId();
    const targetId = await resolveUserId(username);
    const result = await client.v2.block(myId, targetId);
    console.log(JSON.stringify({ blocking: result.data.blocking, username: username.replace(/^@/, '') }));

  } else if (command === 'unblock') {
    const username = args[1];
    if (!username) { console.error('Usage: tweet unblock <username>'); process.exit(1); }
    const myId = await getMyUserId();
    const targetId = await resolveUserId(username);
    const result = await client.v2.unblock(myId, targetId);
    console.log(JSON.stringify({ blocking: result.data.blocking, username: username.replace(/^@/, '') }));

  } else if (command === 'mute') {
    const username = args[1];
    if (!username) { console.error('Usage: tweet mute <username>'); process.exit(1); }
    const myId = await getMyUserId();
    const targetId = await resolveUserId(username);
    const result = await client.v2.mute(myId, targetId);
    console.log(JSON.stringify({ muting: result.data.muting, username: username.replace(/^@/, '') }));

  } else if (command === 'unmute') {
    const username = args[1];
    if (!username) { console.error('Usage: tweet unmute <username>'); process.exit(1); }
    const myId = await getMyUserId();
    const targetId = await resolveUserId(username);
    const result = await client.v2.unmute(myId, targetId);
    console.log(JSON.stringify({ muting: result.data.muting, username: username.replace(/^@/, '') }));

  } else if (command === 'user') {
    const username = (args[1] || '').replace(/^@/, '');
    if (!username) { console.error('Usage: tweet user <username>'); process.exit(1); }
    const result = await client.v2.userByUsername(username, {
      'user.fields': ['description', 'public_metrics', 'profile_image_url', 'verified'],
    });
    console.log(JSON.stringify(result.data, null, 2));

  } else if (command === 'timeline') {
    const me = await client.v2.me();
    const timeline = await client.v2.userTimeline(me.data.id, { max_results: args[1] || 5 });
    timeline.data?.data?.forEach(t => console.log(JSON.stringify(t)));

  } else if (command === 'mentions') {
    const me = await client.v2.me();
    const mentions = await client.v2.userMentionTimeline(me.data.id, { max_results: args[1] || 5 });
    mentions.data?.data?.forEach(t => console.log(JSON.stringify(t)));

  } else if (command === 'search') {
    const query = args.slice(1).join(' ');
    if (!query) { console.error('Usage: tweet search <query>'); process.exit(1); }
    const result = await client.v2.search(query, { max_results: 10 });
    result.data?.data?.forEach(t => console.log(JSON.stringify(t)));

  } else if (command === 'me') {
    const me = await client.v2.me({ 'user.fields': 'public_metrics,description' });
    console.log(JSON.stringify(me.data));

  } else {
    console.log('Tweet CLI — Full-featured Twitter/X command-line tool');
    console.log('');
    console.log('Commands: post, reply, thread, quote, get, delete, like, unlike, retweet, unretweet,');
    console.log('         bookmark, unbookmark, follow, unfollow, block, unblock, mute, unmute,');
    console.log('         user, timeline, mentions, search, me');
    console.log('');
    console.log('Compose:');
    console.log('  tweet post <text> [--media "f1,f2,f3"]  - Post with up to 4 media files');
    console.log('  tweet post <text> [--image <path>]       - Post with single image (shorthand)');
    console.log('  tweet reply <id> <text> [--media "f,f"]  - Reply with media');
    console.log('  tweet thread "t1" "t2" [--media "..."]   - Thread with mixed media per tweet');
    console.log('  tweet quote <id_or_url> <text> [--media] - Quote tweet with optional media');
    console.log('  tweet delete <id_or_url>                 - Delete own tweet');
    console.log('');
    console.log('Read:');
    console.log('  tweet get <id_or_url>                    - Read a specific tweet');
    console.log('  tweet user <username>                     - Look up a user profile');
    console.log('  tweet timeline [count]                    - Your recent tweets');
    console.log('  tweet mentions [count]                    - Recent mentions');
    console.log('  tweet search <query>                      - Search tweets');
    console.log('  tweet me                                  - Account info');
    console.log('');
    console.log('Engage:');
    console.log('  tweet like <id_or_url>                   - Like a tweet');
    console.log('  tweet unlike <id_or_url>                 - Unlike a tweet');
    console.log('  tweet retweet <id_or_url>                - Retweet');
    console.log('  tweet unretweet <id_or_url>              - Undo retweet');
    console.log('  tweet bookmark <id_or_url>               - Bookmark a tweet');
    console.log('  tweet unbookmark <id_or_url>             - Remove bookmark');
    console.log('');
    console.log('Users:');
    console.log('  tweet follow <username>                   - Follow a user');
    console.log('  tweet unfollow <username>                 - Unfollow a user');
    console.log('  tweet block <username>                    - Block a user');
    console.log('  tweet unblock <username>                  - Unblock a user');
    console.log('  tweet mute <username>                     - Mute a user');
    console.log('  tweet unmute <username>                   - Unmute a user');
    console.log('');
    console.log('Media flags:');
    console.log('  --image <path>      Single file (backward compat, works on post/reply/quote)');
    console.log('  --media "f1,f2"     Multiple files comma-separated (post/reply/quote: up to 4)');
    console.log('  --media "f1,f2;f3"  Thread: semicolons separate tweet positions,');
    console.log('                      commas separate files within one tweet');
    console.log('');
    console.log('Twitter limits per tweet: up to 4 images, OR 1 GIF, OR 1 video');
    console.log('Supported: PNG, JPG, GIF, WebP, MP4');
    console.log('');
    console.log('Environment variables required:');
    console.log('  TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET');
  }
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
