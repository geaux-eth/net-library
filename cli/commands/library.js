const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const api = require('../lib/api');
const output = require('../lib/output');
const config = require('../lib/config');
const { createSession, ManualSignError } = require('../lib/relay-session');

module.exports = function (program) {
  const lib = program.command('library').description('Browse and manage library items');

  lib
    .command('browse')
    .description('Browse the library catalog')
    .option('-p, --page <n>', 'Page number', '1')
    .option('-l, --limit <n>', 'Items per page (max 50)', '20')
    .option('-c, --category <cat>', 'Filter by category')
    .option('-m, --media-type <type>', 'Filter by media type')
    .option('-s, --sort <sort>', 'Sort: newest, oldest, title, author', 'newest')
    .option('--search <query>', 'Search within results')
    .option('--operator <address>', 'Filter by uploader address')
    .action(async (opts) => {
      try {
        const data = await api.get('/library', {
          query: {
            page: opts.page,
            limit: opts.limit,
            category: opts.category,
            mediaType: opts.mediaType,
            sort: opts.sort,
            search: opts.search,
            operator: opts.operator,
          },
          auth: false,
        });
        output.table(
          ['Title', 'Author', 'Type', 'Categories', 'Key'],
          (data.items || data.entries || []).map(i => [
            i.title || '—',
            i.author || '—',
            i.mediaType || '—',
            (i.categories || []).join(', '),
            i.contentKey,
          ])
        );
        output.pagination(data.pagination);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  lib
    .command('get <contentKey>')
    .description('Get a single library item')
    .action(async (contentKey) => {
      try {
        const data = await api.get(`/library/${encodeURIComponent(contentKey)}`, { auth: false });
        const entry = data.entry || data;
        output.item(entry, [
          ['Title', 'title'],
          ['Author', 'author'],
          ['Content Key', 'contentKey'],
          ['Media Type', 'mediaType'],
          ['Categories', 'categories', v => (v || []).join(', ')],
          ['File Size', 'fileSize', v => v ? `${(v / 1024 / 1024).toFixed(2)} MB` : null],
          ['CDN URL', 'cdnUrl'],
          ['Uploaded', 'uploadedAt', v => v ? new Date(v).toLocaleString() : null],
          ['Uploader', 'uploaderUsername'],
        ]);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  lib
    .command('write')
    .description('Register a library item (metadata only)')
    .requiredOption('-t, --title <title>', 'Item title')
    .option('-k, --content-key <key>', 'Net Protocol content key')
    .option('-u, --cdn-url <url>', 'CDN URL')
    .option('-a, --author <author>', 'Author name')
    .option('-c, --category <cat...>', 'Categories')
    .option('-m, --media-type <type>', 'Media type')
    .option('--cover-url <url>', 'Cover image URL')
    .option('--file-name <name>', 'Original file name')
    .option('--file-size <bytes>', 'File size in bytes')
    .option('--isbn <isbn>', 'ISBN')
    .option('--year <year>', 'Publication year')
    .option('--publisher <pub>', 'Publisher')
    .option('--add-to-stack <stackId>', 'Add to stack after registering')
    .action(async (opts) => {
      try {
        if (!opts.contentKey && !opts.cdnUrl) {
          output.error('Either --content-key or --cdn-url is required');
          process.exit(1);
        }
        const body = {};
        if (opts.contentKey) body.contentKey = opts.contentKey;
        if (opts.cdnUrl) body.cdnUrl = opts.cdnUrl;
        body.title = opts.title;
        if (opts.author) body.author = opts.author;
        if (opts.category) body.categories = opts.category;
        if (opts.mediaType) body.mediaType = opts.mediaType;
        if (opts.coverUrl) body.coverUrl = opts.coverUrl;
        if (opts.fileName) body.fileName = opts.fileName;
        if (opts.fileSize) body.fileSize = parseInt(opts.fileSize);
        if (opts.isbn) body.isbn = opts.isbn;
        if (opts.year) body.publicationYear = parseInt(opts.year);
        if (opts.publisher) body.publisher = opts.publisher;
        if (opts.addToStack) body.addToStack = opts.addToStack;

        const data = await api.post('/library/write', body);
        output.success(`Item registered: ${data.contentKey || opts.contentKey}`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  lib
    .command('upload <file>')
    .description('Upload a file to the library (requires funded relay wallet)')
    .requiredOption('-t, --title <title>', 'Item title')
    .option('-a, --author <author>', 'Author name')
    .option('-c, --category <cat...>', 'Categories')
    .option('--cover-url <url>', 'Cover image URL')
    .option('--add-to-stack <stackId>', 'Add to stack after upload')
    .option('--session-token <token>', 'Relay session token (auto-created if not provided)')
    .action(async (file, opts) => {
      try {
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) {
          output.error(`File not found: ${filePath}`);
          process.exit(1);
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);

        // Get or create relay session
        let sessionToken = opts.sessionToken;
        if (!sessionToken) {
          if (!output.isJsonMode()) console.log('Creating relay session...');
          try {
            const session = await createSession({ sessionToken: opts.sessionToken });
            sessionToken = session.sessionToken;
            if (!output.isJsonMode()) console.log('Relay session created.');
          } catch (err) {
            if (err instanceof ManualSignError) {
              output.error('No signing method available (no PRIVATE_KEY env var, no bankr CLI).');
              console.log(`Create a session first: ${require('chalk').cyan('netlibrary relay session')}`);
              console.log(`Then pass it: ${require('chalk').cyan('netlibrary library upload --session-token <token> ...')}`);
              process.exit(1);
            }
            throw err;
          }
        }

        if (!output.isJsonMode()) {
          console.log(`Uploading ${fileName} (${sizeMB} MB)...`);
        }

        const form = new FormData();
        form.append('file', new Blob([fileBuffer]), fileName);
        form.append('title', opts.title);
        form.append('sessionToken', sessionToken);
        if (opts.author) form.append('author', opts.author);
        if (opts.category) opts.category.forEach(c => form.append('categories', c));
        if (opts.coverUrl) form.append('coverUrl', opts.coverUrl);
        if (opts.addToStack) form.append('addToStack', opts.addToStack);

        const data = await api.post('/library/upload', form);
        output.success(`Uploaded: ${data.contentKey || fileName}`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  lib
    .command('hide <contentKey>')
    .description('Hide a library item from the public discovery feed')
    .action(async (contentKey) => {
      try {
        const cfg = config.load();
        const wallet = process.env.NETLIB_WALLET || cfg.wallet;
        if (!wallet) {
          output.error('No wallet configured. Run: netlibrary config set wallet <address>');
          process.exit(1);
        }
        const data = await api.patchRoot('/discovery', {
          contentKey,
          operator: wallet,
          hidden: true,
        });
        const title = data.entry?.title || contentKey;
        output.success(`Hidden: ${title}`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  lib
    .command('unhide <contentKey>')
    .description('Unhide a library item (restore to public discovery feed)')
    .action(async (contentKey) => {
      try {
        const cfg = config.load();
        const wallet = process.env.NETLIB_WALLET || cfg.wallet;
        if (!wallet) {
          output.error('No wallet configured. Run: netlibrary config set wallet <address>');
          process.exit(1);
        }
        const data = await api.patchRoot('/discovery', {
          contentKey,
          operator: wallet,
          hidden: false,
        });
        const title = data.entry?.title || contentKey;
        output.success(`Unhidden: ${title}`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  lib
    .command('update <contentKey>')
    .description('Update a library item (title, author, categories, cover art)')
    .option('-t, --title <title>', 'New title')
    .option('-a, --author <author>', 'New author')
    .option('-c, --category <cat...>', 'New categories (replaces existing)')
    .option('-m, --media-type <type>', 'Media type')
    .option('--cover-url <url>', 'Cover image URL')
    .option('--remove-cover', 'Remove cover image')
    .action(async (contentKey, opts) => {
      try {
        const cfg = config.load();
        const wallet = process.env.NETLIB_WALLET || cfg.wallet;
        if (!wallet) {
          output.error('No wallet configured. Run: netlibrary config set wallet <address>');
          process.exit(1);
        }
        const body = { contentKey, operator: wallet };
        if (opts.title) body.title = opts.title;
        if (opts.author) body.author = opts.author;
        if (opts.category) body.categories = opts.category;
        if (opts.mediaType) body.mediaType = opts.mediaType;
        if (opts.coverUrl) body.coverUrl = opts.coverUrl;
        if (opts.removeCover) body.coverUrl = null;

        const data = await api.patchRoot('/discovery', body);
        const title = data.entry?.title || contentKey;
        output.success(`Updated: ${title}`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
