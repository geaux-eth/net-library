const api = require('../lib/api');
const output = require('../lib/output');
const { handlePayment } = require('../lib/payment');

module.exports = function (program) {
  const cmd = program.command('stacks').description('Browse and manage stacks');

  cmd
    .command('list')
    .description('Browse public stacks')
    .option('-p, --page <n>', 'Page number', '1')
    .option('-l, --limit <n>', 'Items per page (max 50)', '20')
    .option('-o, --owner <address>', 'Filter by owner address')
    .option('-s, --sort <sort>', 'Sort: newest, oldest, name, popular', 'newest')
    .action(async (opts) => {
      try {
        const data = await api.get('/stacks', {
          query: {
            page: opts.page,
            limit: opts.limit,
            owner: opts.owner,
            sort: opts.sort,
          },
          auth: false,
        });
        output.table(
          ['Name', 'Type', 'Owner', 'Items', 'Upvotes', 'ID'],
          (data.stacks || []).map(s => [
            s.name || '—',
            s.isFileSystem ? 'FS' : 'Stack',
            s.ownerUsername || s.owner || '—',
            s.itemCount || 0,
            s.upvotes || 0,
            s.id,
          ])
        );
        output.pagination(data.pagination);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('get <stackId>')
    .description('Get a stack with all items')
    .action(async (stackId) => {
      try {
        const data = await api.get(`/stacks/${stackId}`, { auth: false });
        const s = data.stack || {};
        const fields = [
          ['Name', 'name'],
          ['ID', 'id'],
          ['Owner', 'ownerUsername', v => v || s.owner],
          ['Items', 'itemCount'],
        ];
        if (s.isFileSystem) {
          fields.push(['Type', () => 'Filesystem']);
          if (s.fileCount != null) fields.push(['Files', 'fileCount']);
          if (s.totalSize) fields.push(['Total Size', 'totalSize', v => {
            if (v < 1024) return `${v} B`;
            if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
            return `${(v / (1024 * 1024)).toFixed(1)} MB`;
          }]);
          if (s.sourceUrl) fields.push(['Source', 'sourceUrl']);
          if (s.sourceType) fields.push(['Source Type', 'sourceType']);
        }
        fields.push(['Upvotes', 'upvotes']);
        fields.push(['Views', 'views']);
        fields.push(['Created', 'createdAt', v => v ? new Date(v).toLocaleString() : null]);
        output.item(s, fields);

        if (data.items && data.items.length > 0) {
          if (s.isFileSystem) {
            // Filesystem view: show paths
            if (!output.isJsonMode()) console.log('\nFiles:');
            output.table(
              ['Path', 'Size', 'Type', 'Key'],
              data.items.map(i => {
                const size = i.fileSize ? (i.fileSize < 1024 ? `${i.fileSize} B` : i.fileSize < 1024 * 1024 ? `${(i.fileSize / 1024).toFixed(1)} KB` : `${(i.fileSize / (1024 * 1024)).toFixed(1)} MB`) : '—';
                return [
                  i.path || i.fileName || '—',
                  size,
                  i.mimeType || '—',
                  i.contentKey,
                ];
              })
            );
          } else {
            // Regular view: show titles
            if (!output.isJsonMode()) console.log('\nItems:');
            output.table(
              ['Title', 'Author', 'Type', 'Key'],
              data.items.map(i => {
                const book = i.book || {};
                return [
                  book.title || i.title || '—',
                  book.author || '—',
                  book.mediaType || '—',
                  i.contentKey,
                ];
              })
            );
          }
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('create')
    .description('Create a new stack')
    .requiredOption('-n, --name <name>', 'Stack name')
    .option('-d, --description <desc>', 'Stack description')
    .option('--private', 'Make stack private')
    .option('--filesystem', 'Create as filesystem stack (supports folders and paths)')
    .option('--items <keys...>', 'Initial content keys (max 20)')
    .option('--tx-hash <hash>', 'Payment tx hash (for non-members)')
    .action(async (opts) => {
      try {
        const body = { name: opts.name };
        if (opts.description) body.description = opts.description;
        if (opts.private) body.isPublic = false;
        if (opts.filesystem) body.isFileSystem = true;
        if (opts.items) body.items = opts.items;
        if (opts.txHash) body.txHash = opts.txHash;

        const data = await api.post('/stacks/write', body);
        output.success(`Stack created: ${data.stack?.id || data.id}`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        if (err.status === 402) {
          output.warn('Non-members must pay $5 USDC to create a stack.');
          const txHash = await handlePayment(5);
          const body = { name: opts.name, txHash };
          if (opts.description) body.description = opts.description;
          if (opts.private) body.isPublic = false;
          if (opts.items) body.items = opts.items;
          const data = await api.post('/stacks/write', body);
          output.success(`Stack created: ${data.stack?.id || data.id}`);
        } else {
          output.error(err.message);
          process.exit(1);
        }
      }
    });

  cmd
    .command('add <stackId> <contentKey>')
    .description('Add an item to a stack')
    .action(async (stackId, contentKey) => {
      try {
        const data = await api.put('/stacks/write', {
          stackId,
          action: 'add-item',
          contentKey,
        });
        output.success(`Added to stack. Items: ${data.itemCount}`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('add-fs <stackId> <contentKey>')
    .description('Add a file to a filesystem stack with path metadata')
    .requiredOption('--path <path>', 'File path in stack (e.g. /docs/readme.md)')
    .requiredOption('--file-name <name>', 'File name')
    .option('--file-size <bytes>', 'File size in bytes')
    .option('--mime-type <type>', 'MIME type (e.g. text/markdown)')
    .action(async (stackId, contentKey, opts) => {
      try {
        const body = {
          stackId,
          action: 'add-fs-item',
          contentKey,
          path: opts.path,
          fileName: opts.fileName,
        };
        if (opts.fileSize) body.fileSize = parseInt(opts.fileSize);
        if (opts.mimeType) body.mimeType = opts.mimeType;

        const data = await api.put('/stacks/write', body);
        output.success(`Added ${opts.path} to stack. Items: ${data.itemCount}`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('remove <stackId> <contentKey>')
    .description('Remove an item from a stack')
    .action(async (stackId, contentKey) => {
      try {
        const data = await api.put('/stacks/write', {
          stackId,
          action: 'remove-item',
          contentKey,
        });
        output.success(`Removed from stack. Items: ${data.itemCount}`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('update <stackId>')
    .description('Update stack metadata')
    .option('-n, --name <name>', 'New name')
    .option('-d, --description <desc>', 'New description')
    .option('--private', 'Make private')
    .option('--public', 'Make public')
    .action(async (stackId, opts) => {
      try {
        const body = { stackId, action: 'update-metadata' };
        if (opts.name) body.name = opts.name;
        if (opts.description) body.description = opts.description;
        if (opts.private) body.isPrivate = true;
        if (opts.public) body.isPrivate = false;

        const data = await api.put('/stacks/write', body);
        output.success('Stack updated');
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('unlock <stackId>')
    .description('Unlock a stack (remove 20-item limit, $5 USDC)')
    .option('--tx-hash <hash>', 'Payment tx hash (if already paid)')
    .action(async (stackId, opts) => {
      try {
        const txHash = await handlePayment(5, { txHash: opts.txHash });
        const data = await api.put('/stacks/write', {
          stackId,
          action: 'unlock',
          txHash,
        });
        output.success(`Stack ${stackId} unlocked!`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('bulk-remove <stackId> <contentKeys...>')
    .description('Remove multiple items from a stack')
    .action(async (stackId, contentKeys) => {
      try {
        const data = await api.del('/stacks/write', {
          stackId,
          items: contentKeys,
        });
        output.success(`Removed ${data.removed} items. Remaining: ${data.itemCount}`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('delete <stackId>')
    .description('Delete a stack (items remain in the library)')
    .action(async (stackId) => {
      try {
        const data = await api.put('/stacks/write', {
          stackId,
          action: 'delete',
        });
        output.success(`Stack ${stackId} deleted`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
