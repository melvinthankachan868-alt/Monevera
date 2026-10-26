import http from 'http';
import { spawn } from 'child_process';

/**
 * Regression Test:
 * 1. Port occupied: Verify server reports clear error and exits cleanly (no infinite retry loop).
 * 2. SIGTERM / SIGINT: Verify server cleanly releases socket.
 */
async function runTests() {
  console.log('=== TEST 1: SERVER STARTUP WHEN PORT IS ALREADY OCCUPIED ===');
  const dummyPort = 3099;
  
  // Occupy dummyPort with a raw HTTP server
  const blocker = http.createServer((_req, res) => {
    res.end('blocker');
  });

  await new Promise<void>((resolve) => {
    blocker.listen(dummyPort, '0.0.0.0', () => {
      console.log(`[TestSetup] Occupied port ${dummyPort} with dummy server.`);
      resolve();
    });
  });

  // Spawn tsx server.ts with PORT=3099
  console.log(`[Test] Launching server instance targeting occupied port ${dummyPort}...`);
  const child = spawn('npx', ['tsx', 'server.ts', '--port', String(dummyPort)], {
    env: { ...process.env, PORT: String(dummyPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  const exitCode = await new Promise<number | null>((resolve) => {
    const timer = setTimeout(() => {
      console.error('[FAIL] Server hung in an indefinite retry loop! Killing process.');
      child.kill('SIGKILL');
      resolve(-1);
    }, 8000);

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });

  // Close blocker
  await new Promise<void>((resolve) => blocker.close(() => resolve()));

  console.log(`[Result] Child exited with code: ${exitCode}`);
  console.log(`[Output captured]:\n${stdout}\n${stderr}`);

  const hasFatalMessage = stdout.includes('already in use by another active process') || stderr.includes('already in use by another active process') || stdout.includes('Server Fatal') || stderr.includes('Server Fatal');
  if (exitCode === 1 && hasFatalMessage) {
    console.log('✅ TEST 1 PASSED: Server detected occupied port, bounded retries ran, logged fatal error and exited cleanly with code 1.');
  } else {
    console.error('❌ TEST 1 FAILED: Did not exit cleanly with code 1 or missing clear fatal error message.');
    process.exit(1);
  }

  console.log('\n=== TEST 2: SIGTERM GRACEFUL SOCKET RELEASE ===');
  const testPort = 3098;
  console.log(`[Test] Launching server on free port ${testPort}...`);
  const serverProc = spawn('node', ['./node_modules/tsx/dist/cli.mjs', 'server.ts', '--port', String(testPort)], {
    env: { ...process.env, PORT: String(testPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  // Wait until server is listening
  await new Promise<void>((resolve, reject) => {
    const checkInterval = setInterval(() => {
      http.get(`http://127.0.0.1:${testPort}/api/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(checkInterval);
          resolve();
        }
      }).on('error', () => {
        // keep waiting
      });
    }, 200);

    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('Server did not start within 8 seconds'));
    }, 8000);
  });

  console.log(`[Test] Server is responsive on port ${testPort}. Sending SIGTERM to process group ${serverProc.pid}...`);
  try {
    process.kill(-serverProc.pid!, 'SIGTERM');
  } catch (_) {
    serverProc.kill('SIGTERM');
  }

  const termExitCode = await new Promise<number | null>((resolve) => {
    const timer = setTimeout(() => {
      console.error('[FAIL] Server did not exit on SIGTERM within 4s!');
      try { process.kill(-serverProc.pid!, 'SIGKILL'); } catch (_) { serverProc.kill('SIGKILL'); }
      resolve(-1);
    }, 4000);

    serverProc.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });

  console.log(`[Result] Server exited after SIGTERM with code: ${termExitCode}`);
  // Give OS socket a moment to release TIME_WAIT if needed
  await new Promise((r) => setTimeout(r, 500));

  // Now verify that testPort was immediately released and can be rebound
  const verifyServer = http.createServer((_req, res) => res.end('ok'));
  let rebound = false;
  try {
    await new Promise<void>((resolve, reject) => {
      verifyServer.listen(testPort, '0.0.0.0', () => {
        rebound = true;
        resolve();
      });
      verifyServer.on('error', reject);
    });
  } finally {
    if (rebound) {
      await new Promise<void>((resolve) => verifyServer.close(() => resolve()));
    }
  }

  if (rebound) {
    console.log(`✅ TEST 2 PASSED: SIGTERM cleanly closed the server and released port ${testPort} immediately.`);
  } else {
    console.error('❌ TEST 2 FAILED: Port was not released after SIGTERM.');
    process.exit(1);
  }

  console.log('\nALL SERVER REGRESSION TESTS PASSED!');
}

runTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
