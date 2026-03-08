const api = require('../lib/api');
const output = require('../lib/output');

module.exports = function (program) {
  program
    .command('search [query]')
    .description('Search library items and stacks')
    .option('-c, --category <cat>', 'Filter by category')
    .option('-a, --author <author>', 'Filter by author')
    .option('-m, --media-type <type>', 'Filter by media type')
    .option('-l, --limit <n>', 'Max results (max 50)', '20')
    .action(async (query, opts) => {
      try {
        if (!query && !opts.category && !opts.author) {
          output.error('Provide a search query, --category, or --author');
          process.exit(1);
        }
        const data = await api.get('/search', {
          query: {
            q: query,
            category: opts.category,
            author: opts.author,
            mediaType: opts.mediaType,
            limit: opts.limit,
          },
          auth: false,
        });

        if (output.isJsonMode()) {
          output.json({
            items: (data.items || []).map(i => ({
              title: i.title || null,
              author: i.author || null,
              mediaType: i.mediaType || null,
              contentKey: i.contentKey,
            })),
            stacks: (data.stacks || []).map(s => ({
              name: s.name || null,
              owner: s.ownerUsername || s.owner || null,
              itemCount: s.itemCount || 0,
              id: s.id,
            })),
            totalResults: data.totalResults || 0,
          });
        } else {
          if (data.items && data.items.length > 0) {
            console.log('\nItems:');
            output.table(
              ['Title', 'Author', 'Type', 'Key'],
              data.items.map(i => [
                i.title || '—',
                i.author || '—',
                i.mediaType || '—',
                i.contentKey,
              ])
            );
          }

          if (data.stacks && data.stacks.length > 0) {
            console.log('\nStacks:');
            output.table(
              ['Name', 'Owner', 'Items', 'ID'],
              data.stacks.map(s => [
                s.name || '—',
                s.ownerUsername || s.owner || '—',
                s.itemCount || 0,
                s.id,
              ])
            );
          }

          console.log(`\n${data.totalResults || 0} total results`);
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
