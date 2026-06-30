import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme } from './theme.js';

test('explicit stored value wins over system preference', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('falls back to system preference when nothing stored', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
});

test('ignores invalid stored value', () => {
  assert.equal(resolveTheme('purple', true), 'dark');
});
