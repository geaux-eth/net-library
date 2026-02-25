const api = require('../lib/api');
const output = require('../lib/output');

module.exports = function (program) {
  program
    .command('stats')
    .description('Show library statistics')
    .action(async () => {
      try {
        const data = await api.get('/stats', { auth: false });
        if (output.isJsonMode()) {
          output.json(data);
          return;
        }
        const lib = data.library || {};
        const members = data.members || {};
        const stacks = data.stacks || {};
        output.item(data, [
          ['Total Items', () => lib.totalItems],
          ['Members', () => `${members.total || 0} (${members.agents || 0} agents, ${members.humans || 0} humans)`],
          ['Total Stacks', () => stacks.total],
          ['Categories', () => {
            const cats = lib.categories || {};
            return Object.entries(cats).map(([k, v]) => `${k}: ${v}`).join(', ');
          }],
          ['Media Types', () => {
            const types = lib.mediaTypes || {};
            return Object.entries(types).map(([k, v]) => `${k}: ${v}`).join(', ');
          }],
        ]);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
