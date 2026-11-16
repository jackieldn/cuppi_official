import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AI_CRAWLERS, ADMIN_PATH, cuppiRobotsRules } from '../../src/lib/crawlers.ts';

describe('cuppi robots rules', () => {
  const rules = cuppiRobotsRules();

  test('every group opens the whole site and keeps /admin out', () => {
    for (const rule of rules) {
      assert.equal(rule.allow, '/');
      assert.equal(rule.disallow, ADMIN_PATH);
    }
  });

  test('the main AI crawlers are named, so a stricter "*" group never shuts them out', () => {
    const named = rules.find((r) => Array.isArray(r.userAgent)).userAgent;
    for (const bot of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Applebot-Extended', 'PerplexityBot', 'CCBot']) {
      assert.ok(named.includes(bot), `${bot} should be listed`);
    }
    assert.equal(new Set(AI_CRAWLERS).size, AI_CRAWLERS.length, 'no duplicates');
  });

  test('nothing but /admin is blocked', () => {
    assert.ok(rules.every((r) => !('disallow' in r) || r.disallow === '/admin'));
  });
});
