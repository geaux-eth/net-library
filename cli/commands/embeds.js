const api = require('../lib/api');
const output = require('../lib/output');

module.exports = function (program) {
  const cmd = program.command('embeds').description('Embed data API');

  cmd
    .command('card <address>')
    .description('Get library card data for a member')
    .action(async (address) => {
      try {
        const data = await api.get(`/embeds/card/${address}`, { auth: false });
        if (output.isJsonMode()) {
          output.json(data);
          return;
        }
        if (!data.member) {
          console.log('No member found for this address.');
          return;
        }
        const m = data.member || {};
        output.item(data, [
          ['Display Name', 'displayName'],
          ['Member ID', () => m.memberId],
          ['ENS', () => m.ensSubname],
          ['Joined', () => m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : null],
          ['Uploads', () => `${data.uploads?.count || 0} (${((data.uploads?.totalBytes || 0) / 1024 / 1024).toFixed(2)} MB)`],
          ['Stacks', 'stackCount'],
          ['Grids', 'gridCount'],
          ['Rank', 'rank'],
          ['Storage Pass', () => m.hasUnlimitedStoragePass ? 'Yes' : 'No'],
          ['ERC-8004', () => m.erc8004Verified ? (m.erc8004TokenId ? `Verified (#${m.erc8004TokenId})` : 'Verified') : 'No'],
        ]);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('grid <gridId>')
    .description('Get grid embed data')
    .action(async (gridId) => {
      try {
        const data = await api.get(`/embeds/grid/${gridId}`, { auth: false });
        if (output.isJsonMode()) {
          output.json(data);
          return;
        }
        const g = data.grid || {};
        output.item(g, [
          ['Name', 'name'],
          ['ID', 'id'],
          ['Owner', 'owner'],
          ['Columns', 'columns'],
          ['Created', 'createdAt', v => v ? new Date(v).toLocaleString() : null],
        ]);

        if (data.cells && data.cells.length > 0) {
          console.log('\nCells:');
          output.table(
            ['Pos', 'Title', 'Type', 'Key'],
            data.cells.map(c => [
              c.position,
              c.title || '—',
              c.mediaType || '—',
              c.contentKey,
            ])
          );
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('user <address>')
    .description('Get user profile embed data')
    .option('-p, --page <n>', 'Page number', '1')
    .option('-l, --limit <n>', 'Items per page (max 50)', '20')
    .action(async (address, opts) => {
      try {
        const data = await api.get(`/embeds/user/${address}`, {
          query: { page: opts.page, limit: opts.limit },
          auth: false,
        });
        if (output.isJsonMode()) {
          output.json(data);
          return;
        }
        const m = data.member || {};
        output.item(data, [
          ['Display Name', 'displayName'],
          ['Address', 'address'],
          ['Member ID', () => m.memberId],
          ['ENS', () => m.ensSubname],
          ['Uploads', 'uploadCount'],
          ['Total Size', 'totalBytes', v => v ? `${(v / 1024 / 1024).toFixed(2)} MB` : null],
        ]);

        if (data.uploads && data.uploads.length > 0) {
          console.log('\nUploads:');
          output.table(
            ['Title', 'Type', 'Added', 'Key'],
            data.uploads.map(u => [
              u.title || '—',
              u.mediaType || '—',
              u.addedAt ? new Date(u.addedAt).toLocaleDateString() : '—',
              u.contentKey,
            ])
          );
          output.pagination(data.pagination);
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
