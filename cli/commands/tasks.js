const api = require('../lib/api');
const output = require('../lib/output');

module.exports = function (program) {
  const cmd = program.command('tasks').description('Task queue management');

  cmd
    .command('list')
    .description('Poll for pending tasks')
    .option('-s, --status <status>', 'Filter: pending, in_progress, completed, failed', 'pending')
    .option('-t, --type <type>', 'Filter by task type')
    .option('-l, --limit <n>', 'Max tasks (max 20)', '10')
    .action(async (opts) => {
      try {
        const data = await api.get('/agents/tasks', {
          query: {
            status: opts.status,
            type: opts.type,
            limit: opts.limit,
          },
        });

        if (output.isJsonMode()) {
          output.json(data);
          return;
        }

        output.table(
          ['ID', 'Type', 'Status', 'Created', 'Preview'],
          (data.tasks || []).map(t => [
            t.id,
            t.type || '—',
            t.status,
            t.createdAt ? new Date(t.createdAt).toLocaleString() : '—',
            t.data?.castText?.slice(0, 50) || t.data?.authorUsername || '—',
          ])
        );

        if (data.hasMore) {
          console.log(`\nShowing ${data.tasks?.length}/${data.totalCount} tasks`);
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('update <taskId> <status>')
    .description('Update task status (in_progress, completed, failed)')
    .option('--action <action>', 'Action taken (for completed/failed)')
    .option('--details <details>', 'Result details')
    .option('--error <error>', 'Error message (for failed)')
    .action(async (taskId, status, opts) => {
      try {
        const validStatuses = ['in_progress', 'completed', 'failed'];
        if (!validStatuses.includes(status)) {
          output.error(`Invalid status. Choose: ${validStatuses.join(', ')}`);
          process.exit(1);
        }

        const body = { taskId, status };
        if (opts.action || opts.details || opts.error) {
          body.result = {};
          if (opts.action) body.result.action = opts.action;
          if (opts.details) body.result.details = opts.details;
          if (opts.error) body.result.error = opts.error;
        }

        const data = await api.put('/agents/tasks', body);
        output.success(`Task ${taskId} → ${status}`);
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
