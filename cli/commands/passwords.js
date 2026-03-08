const api = require('../lib/api');
const output = require('../lib/output');

module.exports = function (program) {
  const cmd = program.command('passwords').description('Manage saved encryption passwords');

  cmd
    .command('list')
    .description('List saved passwords (labels only, not plaintext)')
    .action(async () => {
      try {
        // Passwords API is at /api/passwords (not /api/v1/)
        const data = await api.getRoot('/passwords');
        const passwords = data.passwords || [];
        if (output.isJsonMode()) {
          output.json(passwords);
          return;
        }
        if (passwords.length === 0) {
          console.log('No saved passwords.');
          return;
        }
        output.table(
          ['Label', 'Items', 'Created', 'ID'],
          passwords.map(p => [
            p.label || '—',
            p.itemCount || 0,
            p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—',
            p.id,
          ])
        );
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('get <id>')
    .description('Retrieve a saved password (decrypted)')
    .action(async (id) => {
      try {
        const data = await api.getRoot(`/passwords/${id}`);
        if (output.isJsonMode()) {
          output.json(data);
          return;
        }
        output.item(data, [
          ['Label', 'label'],
          ['Password', 'password'],
          ['Created', 'createdAt', v => v ? new Date(v).toLocaleString() : null],
          ['Updated', 'updatedAt', v => v ? new Date(v).toLocaleString() : null],
          ['ID', 'id'],
        ]);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('save')
    .description('Save a new encryption password')
    .requiredOption('-p, --password <password>', 'Password to save')
    .option('-l, --label <label>', 'Label for this password', 'Untitled')
    .action(async (opts) => {
      try {
        const data = await api.postRoot('/passwords', {
          password: opts.password,
          label: opts.label,
        });
        if (data.duplicate) {
          output.warn(`Password already saved (ID: ${data.id}, label: "${data.label}")`);
        } else {
          output.success(`Password saved: ${data.id} (label: "${data.label}")`);
        }
        if (output.isJsonMode()) output.json(data);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('update <id>')
    .description('Update password label')
    .requiredOption('-l, --label <label>', 'New label')
    .action(async (id, opts) => {
      try {
        const data = await api.putRoot(`/passwords/${id}`, {
          label: opts.label,
        });
        output.success(`Password ${id} updated (label: "${data.label}")`);
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });

  cmd
    .command('delete <id>')
    .description('Delete a saved password')
    .action(async (id) => {
      try {
        const data = await api.requestRoot('DELETE', `/passwords/${id}`);
        output.success('Password deleted');
        if (data.warning && !output.isJsonMode()) {
          output.warn(data.warning);
        }
      } catch (err) {
        output.error(err.message);
        process.exit(1);
      }
    });
};
