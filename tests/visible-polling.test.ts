import assert from 'node:assert/strict';
import test from 'node:test';
import { pollWhileVisible, type PollingEnvironment } from '../src/lib/visible-polling';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

function browser(visible = true) {
  let onChange: (() => void) | undefined;
  const timers = new Set<() => void>();
  const environment: PollingEnvironment = {
    visible: () => visible,
    subscribe(callback) { onChange = callback; return () => { onChange = undefined; }; },
    schedule(callback) { timers.add(callback); return () => { timers.delete(callback); }; },
  };
  return {
    environment, timers,
    change(value: boolean) { visible = value; onChange?.(); },
    async advance() { const pending = [...timers]; timers.clear(); pending.forEach((timer) => timer()); await flush(); },
  };
}

test('hidden tabs do not request data; returning refreshes and cleanup stops future polling', async () => {
  const page = browser(false);
  const calls: AbortSignal[] = [];
  const stop = pollWhileVisible(async (signal) => { calls.push(signal); }, { environment: page.environment });
  assert.equal(calls.length, 0);
  assert.equal(page.timers.size, 0);
  page.change(true);
  await flush();
  assert.equal(calls.length, 1);
  assert.equal(page.timers.size, 1);
  page.change(false);
  await page.advance();
  assert.equal(calls.length, 1);
  page.change(true);
  await flush();
  assert.equal(calls.length, 2);
  stop();
  page.change(false);
  page.change(true);
  await page.advance();
  assert.equal(calls.length, 2);
});

test('slow requests do not overlap and hidden requests are aborted without scheduling duplicate timers', async () => {
  const page = browser();
  const calls: { signal: AbortSignal; resolve: () => void }[] = [];
  const stop = pollWhileVisible((signal) => new Promise<void>((resolve) => { calls.push({ signal, resolve }); }), {
    environment: page.environment,
  });
  page.change(true);
  await page.advance();
  assert.equal(calls.length, 1);
  assert.equal(page.timers.size, 0);
  page.change(false);
  assert.equal(calls[0].signal.aborted, true);
  page.change(true);
  assert.equal(calls.length, 2);
  calls[0].resolve();
  await flush();
  assert.equal(page.timers.size, 0);
  calls[1].resolve();
  await flush();
  assert.equal(page.timers.size, 1);
  await page.advance();
  assert.equal(calls.length, 3);
  stop();
  assert.equal(calls[2].signal.aborted, true);
});

test('server-rendered status waits for the interval and failed requests can retry', async () => {
  const page = browser();
  let calls = 0;
  const stop = pollWhileVisible(async () => { calls++; throw new Error('offline'); }, {
    immediate: false, environment: page.environment,
  });
  assert.equal(calls, 0);
  await page.advance();
  assert.equal(calls, 1);
  assert.equal(page.timers.size, 1);
  await page.advance();
  assert.equal(calls, 2);
  stop();
});
