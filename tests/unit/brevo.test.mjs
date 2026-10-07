import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { sendBrevoEmail, BrevoError } from '../../src/lib/brevo.ts';

const KEY = 'secret-test-key-123';
const email = {
  sender: { name: 'Cuppi Support Form', email: 'support@cuppi.co.uk' },
  to: [{ email: 'inbox@example.com' }],
  replyTo: { email: 'sam@example.com', name: 'Sam' },
  subject: 'Cuppi Support Request: Bug Report',
  htmlContent: '<p>hi &lt;b&gt;</p>',
};

// A local stand-in for api.brevo.com that records what it was sent.
let server, baseUrl, seen, mode = 'ok';
before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      seen = { method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null };
      res.setHeader('content-type', 'application/json');
      if (mode === 'ok') { res.statusCode = 201; res.end(JSON.stringify({ messageId: '<abc@example>' })); }
      else if (mode === 'badkey') { res.statusCode = 401; res.end(JSON.stringify({ message: 'Key not found', code: 'unauthorized' })); }
      else if (mode === 'html') { res.statusCode = 502; res.setHeader('content-type', 'text/html'); res.end('<html>Bad gateway</html>'); }
      // mode === 'hang': never answer
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.closeAllConnections?.(); server.close(); });

test('sends the right request to Brevo', async () => {
  mode = 'ok';
  await sendBrevoEmail(KEY, email, { baseUrl });
  assert.equal(seen.method, 'POST');
  assert.equal(seen.url, '/v3/smtp/email');
  assert.equal(seen.headers['api-key'], KEY);
  assert.equal(seen.headers['content-type'], 'application/json');
  assert.deepEqual(seen.body, email);
});

test('a Brevo error throws with its status and code, and leaks nothing', async () => {
  mode = 'badkey';
  await assert.rejects(sendBrevoEmail(KEY, email, { baseUrl }), (e) => {
    assert.ok(e instanceof BrevoError);
    assert.equal(e.status, 401);
    assert.equal(e.code, 'unauthorized');
    assert.match(e.message, /Key not found/);
    assert.ok(!e.message.includes(KEY) && !JSON.stringify(e).includes(KEY));
    assert.ok(!e.message.includes('inbox@example.com'));
    return true;
  });
});

test('a non-JSON error body still throws a BrevoError with the status', async () => {
  mode = 'html';
  await assert.rejects(sendBrevoEmail(KEY, email, { baseUrl }), (e) => e instanceof BrevoError && e.status === 502);
});

test('a hung connection times out instead of waiting forever', async () => {
  mode = 'hang';
  const started = Date.now();
  await assert.rejects(sendBrevoEmail(KEY, email, { baseUrl, timeoutMs: 300 }));
  assert.ok(Date.now() - started < 3000);
});
