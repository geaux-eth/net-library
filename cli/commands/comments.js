const api = require('../lib/api');
const output = require('../lib/output');
const chalk = require('chalk');

module.exports = function (program) {
  program
    .command('comments <contentKey>')
    .description('View comments for a library item')
    .option('--parent-id <id>', 'Get replies to a specific comment')
    .action(async (contentKey, opts) => {
      try {
        const data = await api.get(`/comments/${encodeURIComponent(contentKey)}`, {
          query: { parentId: opts.parentId },
          auth: false,
        });

        if (output.isJsonMode()) {
          output.json(data);
          return;
        }

        if (data.item) {
          console.log(`Comments for: ${chalk.cyan(data.item.title || contentKey)}\n`);
        }

        const comments = data.comments || [];
        if (comments.length === 0) {
          console.log(chalk.dim('No comments.'));
          return;
        }

        comments.forEach(c => {
          const author = c.author?.username || c.author?.address?.slice(0, 10) || 'unknown';
          const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '';
          const edited = c.isEdited ? chalk.dim(' (edited)') : '';
          console.log(`${chalk.cyan(author)} ${chalk.dim(date)}${edited}`);
          console.log(`  ${c.text}`);
          if (c.likes > 0) console.log(`  ${chalk.dim(`♥ ${c.likes}`)}`);
          if (c.replyCount > 0) console.log(`  ${chalk.dim(`↳ ${c.replyCount} replies`)}`);
          console.log('');
        });

        console.log(`${data.totalCount || comments.length} total comments`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
