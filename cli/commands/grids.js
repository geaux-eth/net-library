const api = require('../lib/api');
const output = require('../lib/output');
const { handlePayment } = require('../lib/payment');

module.exports = function (program) {
  const cmd = program.command('grids').description('Browse and manage grids');

  cmd
    .command('list')
    .description('Browse public grids')
    .option('-p, --page <n>', 'Page number', '1')
    .option('-l, --limit <n>', 'Items per page', '20')
    .option('-c, --creator <address>', 'Filter by creator address')
    .option('-s, --sort <sort>', 'Sort: upvotes, recent', 'upvotes')
    .action(async (opts) => {
      try {
        const query = { page: opts.page, pageSize: opts.limit, sortBy: opts.sort };
        if (opts.creator) query.creator = opts.creator;
        // Grids API is at /api/grids (not /api/v1/grids)
        const data = opts.creator
          ? await api.getRoot(`/grids?creator=${opts.creator}${opts.sort ? `&sortBy=${opts.sort}` : ''}`, { auth: false })
          : await api.getRoot(`/grids?page=${opts.page}&pageSize=${opts.limit}&sortBy=${opts.sort}`, { auth: false });
        const grids = data.grids || [];
        output.table(
          ['Name', 'Size', 'Cells', 'Upvotes', 'Creator', 'ID'],
          grids.map(g => [
            g.name || '—',
            `${g.size}x${g.size}`,
            `${g.cellCount || 0}/${g.totalCells || g.size * g.size}`,
            g.upvoteCount || 0,
            g.creatorUsername || g.creator?.slice(0, 10) + '...' || '—',
            g.id,
          ])
        );
        if (data.totalPages) {
          output.pagination({ page: data.page, totalPages: data.totalPages, total: data.total });
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('get <gridId>')
    .description('Get a grid with all cells')
    .action(async (gridId) => {
      try {
        const data = await api.getRoot(`/grids?id=${gridId}`, { auth: false });
        const g = data.grid || {};
        if (output.isJsonMode()) {
          output.json({ grid: g, cells: data.cells });
          return;
        }
        output.item(g, [
          ['Name', 'name'],
          ['ID', 'id'],
          ['Size', 'size', v => `${v}x${v}`],
          ['Cells', 'cellCount', v => `${v || 0}/${g.totalCells || g.size * g.size}`],
          ['Upvotes', 'upvoteCount'],
          ['Creator', 'creatorUsername', v => v || g.creator],
          ['Visibility', 'visibility'],
          ['Archived', 'isArchived', v => v ? `Yes (${g.archiveCount})` : 'No'],
          ['Created', 'createdAt', v => v ? new Date(v).toLocaleString() : null],
        ]);
        const cells = data.cells || [];
        if (cells.length > 0) {
          console.log('\nCells:');
          output.table(
            ['Row', 'Col', 'Type', 'Title', 'URL'],
            cells.map(c => [
              c.row,
              c.col,
              c.mediaType || '—',
              (c.title || '—').slice(0, 30),
              (c.cdnUrl || '—').slice(0, 50) + (c.cdnUrl?.length > 50 ? '...' : ''),
            ])
          );
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('create')
    .description('Create a new grid (member-only)')
    .requiredOption('-n, --name <name>', 'Grid name')
    .requiredOption('-s, --size <n>', 'Grid size (NxN)', parseInt)
    .option('-d, --description <desc>', 'Grid description')
    .option('--subtitle <text>', 'Grid subtitle')
    .option('--hidden', 'Create as hidden grid')
    .option('--creator <address>', 'Creator address (defaults to configured wallet)')
    .option('--fid <n>', 'Creator FID')
    .option('--tx-hash <hash>', 'Payment tx hash (required for 6x6+ grids)')
    .action(async (opts) => {
      try {
        const body = {
          name: opts.name,
          size: opts.size,
          creator: opts.creator || process.env.NETLIB_WALLET,
        };
        if (opts.description) body.description = opts.description;
        if (opts.subtitle) body.subtitle = opts.subtitle;
        if (opts.hidden) body.visibility = 'hidden';
        if (opts.fid) body.creatorFid = parseInt(opts.fid);
        if (opts.txHash) body.txHash = opts.txHash;

        if (!body.creator) {
          output.error('Creator address required. Use --creator or set NETLIB_WALLET.');
          process.exit(1);
        }

        const data = await api.postRoot('/grids', body);
        output.success(`Grid created: ${data.grid?.id || 'unknown'}`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        if (err.status === 402) {
          output.warn('Payment required for 6x6+ grids ($2 USDC).');
          const txHash = await handlePayment(2);
          const body = {
            name: opts.name,
            size: opts.size,
            creator: opts.creator || process.env.NETLIB_WALLET,
            txHash,
          };
          if (opts.description) body.description = opts.description;
          if (opts.subtitle) body.subtitle = opts.subtitle;
          if (opts.hidden) body.visibility = 'hidden';
          if (opts.fid) body.creatorFid = parseInt(opts.fid);
          const data = await api.postRoot('/grids', body);
          output.success(`Grid created: ${data.grid?.id || 'unknown'}`);
        } else {
          output.error(err.message);
          process.exit(1);
        }
      }
    });

  cmd
    .command('add-cell <gridId>')
    .description('Add a cell to a grid')
    .requiredOption('--row <n>', 'Row (0-indexed)', parseInt)
    .requiredOption('--col <n>', 'Column (0-indexed)', parseInt)
    .requiredOption('--url <cdnUrl>', 'CDN URL of the content')
    .option('--title <title>', 'Cell title')
    .option('--content-type <type>', 'Content type (e.g. image/png)')
    .option('--creator <address>', 'Creator address')
    .action(async (gridId, opts) => {
      try {
        const body = {
          gridId,
          action: 'add-cell',
          row: opts.row,
          col: opts.col,
          cdnUrl: opts.url,
          creator: opts.creator || process.env.NETLIB_WALLET,
        };
        if (opts.title) body.title = opts.title;
        if (opts.contentType) body.contentType = opts.contentType;

        if (!body.creator) {
          output.error('Creator address required. Use --creator or set NETLIB_WALLET.');
          process.exit(1);
        }

        const data = await api.putRoot('/grids', body);
        output.success(`Cell added at (${opts.row}, ${opts.col}). Total cells: ${data.cellCount}`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('remove-cell <gridId>')
    .description('Remove a cell from a grid')
    .requiredOption('--row <n>', 'Row (0-indexed)', parseInt)
    .requiredOption('--col <n>', 'Column (0-indexed)', parseInt)
    .option('--creator <address>', 'Creator address')
    .action(async (gridId, opts) => {
      try {
        const body = {
          gridId,
          action: 'remove-cell',
          row: opts.row,
          col: opts.col,
          creator: opts.creator || process.env.NETLIB_WALLET,
        };

        if (!body.creator) {
          output.error('Creator address required. Use --creator or set NETLIB_WALLET.');
          process.exit(1);
        }

        const data = await api.putRoot('/grids', body);
        output.success(`Cell removed. Total cells: ${data.cellCount}`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('move-cell <gridId>')
    .description('Move a cell to a new position')
    .requiredOption('--from-row <n>', 'Source row', parseInt)
    .requiredOption('--from-col <n>', 'Source column', parseInt)
    .requiredOption('--to-row <n>', 'Target row', parseInt)
    .requiredOption('--to-col <n>', 'Target column', parseInt)
    .option('--creator <address>', 'Creator address')
    .action(async (gridId, opts) => {
      try {
        const body = {
          gridId,
          action: 'move-cell',
          fromRow: opts.fromRow,
          fromCol: opts.fromCol,
          toRow: opts.toRow,
          toCol: opts.toCol,
          creator: opts.creator || process.env.NETLIB_WALLET,
        };

        if (!body.creator) {
          output.error('Creator address required. Use --creator or set NETLIB_WALLET.');
          process.exit(1);
        }

        const data = await api.putRoot('/grids', body);
        output.success(`Cell moved to (${opts.toRow}, ${opts.toCol})`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('update <gridId>')
    .description('Update grid metadata')
    .option('-n, --name <name>', 'New name')
    .option('-d, --description <desc>', 'New description')
    .option('--subtitle <text>', 'New subtitle')
    .option('--public', 'Make grid public')
    .option('--hidden', 'Make grid hidden')
    .option('--creator <address>', 'Creator address')
    .action(async (gridId, opts) => {
      try {
        const body = {
          gridId,
          action: 'update-metadata',
          creator: opts.creator || process.env.NETLIB_WALLET,
        };
        if (opts.name) body.name = opts.name;
        if (opts.description) body.description = opts.description;
        if (opts.subtitle !== undefined) body.subtitle = opts.subtitle;
        if (opts.public) body.visibility = 'public';
        if (opts.hidden) body.visibility = 'hidden';

        if (!body.creator) {
          output.error('Creator address required. Use --creator or set NETLIB_WALLET.');
          process.exit(1);
        }

        const data = await api.putRoot('/grids', body);
        output.success('Grid updated');
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('resize <gridId>')
    .description('Resize a grid (can only increase)')
    .requiredOption('-s, --size <n>', 'New size', parseInt)
    .option('--creator <address>', 'Creator address')
    .option('--tx-hash <hash>', 'Payment tx hash (if crossing 6x6 threshold)')
    .action(async (gridId, opts) => {
      try {
        const body = {
          gridId,
          action: 'resize',
          newSize: opts.size,
          creator: opts.creator || process.env.NETLIB_WALLET,
        };
        if (opts.txHash) body.txHash = opts.txHash;

        if (!body.creator) {
          output.error('Creator address required. Use --creator or set NETLIB_WALLET.');
          process.exit(1);
        }

        const data = await api.putRoot('/grids', body);
        output.success(`Grid resized to ${opts.size}x${opts.size}`);
      } catch (err) {
        if (err.status === 402) {
          output.warn('Payment required for 6x6+ grids ($2 USDC).');
          const txHash = await handlePayment(2);
          const body = {
            gridId,
            action: 'resize',
            newSize: opts.size,
            creator: opts.creator || process.env.NETLIB_WALLET,
            txHash,
          };
          const data = await api.putRoot('/grids', body);
          output.success(`Grid resized to ${opts.size}x${opts.size}`);
        } else {
          output.error(err.message);
          process.exit(1);
        }
      }
    });

  cmd
    .command('delete <gridId>')
    .description('Delete a grid (soft-delete)')
    .option('--creator <address>', 'Creator address')
    .action(async (gridId, opts) => {
      try {
        const creator = opts.creator || process.env.NETLIB_WALLET;
        if (!creator) {
          output.error('Creator address required. Use --creator or set NETLIB_WALLET.');
          process.exit(1);
        }
        const data = await api.requestRoot('DELETE', '/grids', {
          body: { gridId, creator },
        });
        output.success(`Grid ${gridId} deleted`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('archive <gridId>')
    .description('Archive a grid as a PNG snapshot')
    .option('--creator <address>', 'Creator address')
    .option('--fid <n>', 'Creator FID')
    .action(async (gridId, opts) => {
      try {
        const body = { gridId };
        if (opts.creator) body.creator = opts.creator;
        if (opts.fid) body.creatorFid = parseInt(opts.fid);

        const data = await api.postRoot('/grids/archive', body);
        output.success(`Grid archived: ${data.archiveId || 'done'}`);
        if (data.cdnUrl && !output.isJsonMode()) {
          console.log(`  CDN: ${data.cdnUrl}`);
        }
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
