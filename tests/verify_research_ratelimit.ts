import './setup_test_harness';
process.env.TEST_HARNESS = 'true';

import http from 'http';
import {
  app,
  resetRateLimitStoreForTesting,
  cleanupExpiredRateLimitsForTesting,
  getRateLimitStoreSizeForTesting,
  resolveTrustProxyHops,
  setTrustProxyHopsForTesting,
  getTrustProxyHopsForTesting,
} from '../server';
import { RATE_LIMIT_MSG, getAiErrorMessage } from '../src/utils/aiErrorHelper';

interface TestResult {
  id: string;
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const testResults: TestResult[] = [];

function record(id: string, category: string, name: string, condition: boolean, details: string) {
  if (condition) {
    testResults.push({ id, category, name, status: 'PASS', details });
  } else {
    testResults.push({ id, category, name, status: 'FAIL', details: `FAILED: ${details}` });
  }
}

function makeHttpRequest(
  port: number,
  method: string,
  path: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runSuite() {
  console.log('================================================================');
  console.log('MONEY VAULT: PUBLIC RESEARCH RATE LIMIT & PROXY HOPS VERIFICATION');
  console.log('================================================================\n');

  resetRateLimitStoreForTesting();
  setTrustProxyHopsForTesting(1);

  const testServer = await new Promise<http.Server>((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
  });
  const address = testServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    const ipA = '198.51.100.10';
    const ipB = '198.51.100.20';

    // 1. Under limit: multiple requests within threshold return HTTP 200
    let initialBurstOk = true;
    for (let i = 0; i < 5; i++) {
      const res = await makeHttpRequest(port, 'GET', '/api/research/glossary', {
        'x-forwarded-for': ipA,
      });
      if (res.status !== 200 || !res.body?.success) {
        initialBurstOk = false;
        break;
      }
    }
    record(
      'RL-RESEARCH-01',
      'Rate Limiting',
      'Requests under limit return HTTP 200',
      initialBurstOk,
      `initialBurstOk=${initialBurstOk}`
    );

    // 2. Consume up to 120 requests: all 120 succeed with HTTP 200, 121st rejected with HTTP 429
    let all120Succeeded = true;
    for (let i = 5; i < 120; i++) {
      const res = await makeHttpRequest(port, 'GET', '/api/research/glossary', {
        'x-forwarded-for': ipA,
      });
      if (res.status !== 200) {
        all120Succeeded = false;
        break;
      }
    }

    const request121Res = await makeHttpRequest(port, 'GET', '/api/research/glossary', {
      'x-forwarded-for': ipA,
    });

    record(
      'RL-RESEARCH-02',
      'Rate Limiting',
      '120 requests return 200; 121st request returns HTTP 429 with RATE_LIMIT_EXCEEDED',
      all120Succeeded &&
        request121Res.status === 429 &&
        request121Res.body?.error === 'RATE_LIMIT_EXCEEDED' &&
        request121Res.body?.message?.includes('Too many requests'),
      `all120Succeeded=${all120Succeeded}, req121Status=${request121Res.status}, error=${request121Res.body?.error}`
    );

    // 3. Different IPs do not share a counter: IP B is unaffected while IP A is blocked
    const ipBRes = await makeHttpRequest(port, 'GET', '/api/research/glossary', {
      'x-forwarded-for': ipB,
    });

    record(
      'RL-RESEARCH-03',
      'IP Isolation',
      'Different client IPs do not share rate limit counters (IP B succeeds while IP A is blocked)',
      ipBRes.status === 200 && ipBRes.body?.success === true,
      `ipB_status=${ipBRes.status}`
    );

    // 4. Rate limiter applies across other public research routes for IP A
    const ipASearchRes = await makeHttpRequest(port, 'GET', '/api/research/search?q=TCS', {
      'x-forwarded-for': ipA,
    });
    record(
      'RL-RESEARCH-04',
      'Route Coverage',
      'Rate limiter applies across public research routes for the rate-limited IP',
      ipASearchRes.status === 429,
      `search_status=${ipASearchRes.status}`
    );

    // 5. Window resets: advance simulated time past 60s window
    const futureTime = Date.now() + 65000;
    cleanupExpiredRateLimitsForTesting(futureTime);

    const postResetRes = await makeHttpRequest(port, 'GET', '/api/research/glossary', {
      'x-forwarded-for': ipA,
    });

    record(
      'RL-RESEARCH-05',
      'Window Reset',
      'After 60s rate limit window expires, the counter resets and requests succeed with HTTP 200',
      postResetRes.status === 200 && postResetRes.body?.success === true,
      `postResetStatus=${postResetRes.status}`
    );

    // 6. In-memory table cleanup (expired keys removed so store cannot grow indefinitely)
    const initialSize = getRateLimitStoreSizeForTesting();
    cleanupExpiredRateLimitsForTesting(Date.now() + 120000);
    const sizeAfterPrune = getRateLimitStoreSizeForTesting();

    record(
      'RL-RESEARCH-06',
      'Memory Management',
      'Expired rate limit keys are pruned so in-memory store cannot grow indefinitely',
      initialSize > 0 && sizeAfterPrune === 0,
      `initialSize=${initialSize}, sizeAfterPrune=${sizeAfterPrune}`
    );

    // 7. Client UI friendly error mapping: 429 maps to RATE_LIMIT_MSG
    const ui429Message = getAiErrorMessage(429);
    const isFriendlyMessage = ui429Message === RATE_LIMIT_MSG && ui429Message === 'Too many requests. Wait a minute and try again.';
    record(
      'RL-RESEARCH-07',
      'UI Error Mapping',
      'Client maps HTTP 429 to RATE_LIMIT_MSG ("Too many requests. Wait a minute and try again.")',
      isFriendlyMessage,
      `message="${ui429Message}"`
    );

    // 8. Proxy hops default per mode
    const prodDefault = resolveTrustProxyHops(undefined, 'production');
    const devDefault = resolveTrustProxyHops(undefined, 'development');
    const unsetDefault = resolveTrustProxyHops(undefined, undefined);
    record(
      'PROXY-HOPS-01',
      'Configurable Proxy Hops',
      'Default hops: 1 in production, 0 in development/unset',
      prodDefault === 1 && devDefault === 0 && unsetDefault === 0,
      `prodDefault=${prodDefault}, devDefault=${devDefault}, unsetDefault=${unsetDefault}`
    );

    // 9. Valid proxy hop overrides (0 to 5)
    const hop0 = resolveTrustProxyHops('0', 'production');
    const hop1 = resolveTrustProxyHops('1', 'development');
    const hop2 = resolveTrustProxyHops('2', 'development');
    const hop5 = resolveTrustProxyHops('5', 'development');
    record(
      'PROXY-HOPS-02',
      'Configurable Proxy Hops',
      'Valid overrides (0, 1, 2, 5) are accepted',
      hop0 === 0 && hop1 === 1 && hop2 === 2 && hop5 === 5,
      `hop0=${hop0}, hop1=${hop1}, hop2=${hop2}, hop5=${hop5}`
    );

    // 10. Invalid proxy hop override falls back to default and logs warning
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      warnings.push(args.join(' '));
    };
    try {
      const invalid6 = resolveTrustProxyHops('6', 'production');
      const invalidNeg = resolveTrustProxyHops('-1', 'production');
      const invalidAlpha = resolveTrustProxyHops('abc', 'development');
      const invalidDecimal = resolveTrustProxyHops('2.5', 'development');
      record(
        'PROXY-HOPS-03',
        'Configurable Proxy Hops',
        'Invalid override falls back to default and logs warning',
        invalid6 === 1 &&
          invalidNeg === 1 &&
          invalidAlpha === 0 &&
          invalidDecimal === 0 &&
          warnings.length === 4 &&
          warnings.every((w) => w.includes('Invalid TRUST_PROXY_HOPS')),
        `fallbacks=[${invalid6}, ${invalidNeg}, ${invalidAlpha}, ${invalidDecimal}], warningsLogged=${warnings.length}`
      );
    } finally {
      console.warn = origWarn;
    }

    // 11. With 0 hops, spoofed X-Forwarded-For does NOT create a new counter
    resetRateLimitStoreForTesting();
    setTrustProxyHopsForTesting(0); // Disable proxy trust: Express uses req.socket.remoteAddress

    // Fire 120 requests from 127.0.0.1 with various fake X-Forwarded-For headers
    for (let i = 0; i < 120; i++) {
      await makeHttpRequest(port, 'GET', '/api/research/glossary', {
        'x-forwarded-for': `10.0.0.${i + 1}`,
      });
    }

    // With trust proxy = 0, all 120 went to 127.0.0.1 bucket.
    // The 121st request with yet another fake IP must be rejected because fake IPs are ignored!
    const spoofedRes = await makeHttpRequest(port, 'GET', '/api/research/glossary', {
      'x-forwarded-for': '203.0.113.99',
    });

    // Verify rate limit store has only 1 entry (keyed on 127.0.0.1, not 120 distinct entries)
    const storeSizeWithZeroHops = getRateLimitStoreSizeForTesting();

    record(
      'PROXY-HOPS-04',
      'Configurable Proxy Hops',
      'With 0 hops, spoofed X-Forwarded-For headers do NOT create separate counters',
      spoofedRes.status === 429 && storeSizeWithZeroHops === 1,
      `spoofedStatus=${spoofedRes.status}, storeSize=${storeSizeWithZeroHops}`
    );

    // Reset trust proxy back to 1 for other suites
    setTrustProxyHopsForTesting(1);
    resetRateLimitStoreForTesting();
  } finally {
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
  }

  console.log('\n================================================================');
  console.log('TEST SUMMARY');
  console.log('================================================================');
  const passCount = testResults.filter((r) => r.status === 'PASS').length;
  const failCount = testResults.filter((r) => r.status === 'FAIL').length;
  console.log(`Total tests: ${testResults.length}`);
  console.log(`PASS: ${passCount}`);
  console.log(`FAIL: ${failCount}`);

  testResults.forEach((r, idx) => {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    console.log(`  ${icon} [${r.status}] #${idx + 1} (${r.id}): ${r.name}`);
  });

  if (failCount > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
