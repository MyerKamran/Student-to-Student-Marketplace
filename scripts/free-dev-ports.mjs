import { execSync } from 'node:child_process';

function run(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    return '';
  }
}

function killPortWindows(port) {
  const out = run(`cmd /c netstat -ano | findstr :${port}`);
  if (!out) return;

  const pids = new Set();
  for (const line of out.split('\n')) {
    const clean = line.trim();
    if (!clean) continue;
    const parts = clean.split(/\s+/);
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }

  for (const pid of pids) {
    run(`cmd /c taskkill /PID ${pid} /F`);
  }
}

function killPortUnix(port) {
  const out = run(`lsof -ti tcp:${port}`);
  if (!out) return;
  for (const pid of out.split('\n').map((s) => s.trim()).filter(Boolean)) {
    run(`kill -9 ${pid}`);
  }
}

function freePort(port) {
  if (process.platform === 'win32') {
    killPortWindows(port);
    return;
  }
  killPortUnix(port);
}

// Free both frontend and API ports before dev start.
freePort(5173);
freePort(8787);

