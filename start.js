/**
 * Electron startup wrapper
 * WorkBuddy sets ELECTRON_RUN_AS_NODE=1 system-wide, which breaks electron .
 * This wrapper clears that env var before launching Electron.
 */
const path = require('path');
const { spawn } = require('child_process');

// Clear the problematic env var
delete process.env.ELECTRON_RUN_AS_NODE;

// Resolve electron binary
const electronPath = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');

// Forward all CLI args (including the project dir)
const args = process.argv.slice(2);

const child = spawn(electronPath, args, {
  stdio: 'inherit',
  windowsHide: false,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
});

child.on('close', (code, signal) => {
  if (code === null) {
    console.error(electronPath, 'exited with signal', signal);
    process.exit(1);
  }
  process.exit(code);
});

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
});
