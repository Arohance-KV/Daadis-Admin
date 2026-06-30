import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCSV } from './csv.js';

const cols = [{ key: 'name', label: 'Name' }, { key: 'spent', label: 'Total Spent' }];

test('toCSV writes header and rows', () => {
  const out = toCSV([{ name: 'Asha', spent: 350 }], cols);
  assert.equal(out, 'Name,Total Spent\r\nAsha,350');
});

test('toCSV escapes commas, quotes, and newlines', () => {
  const out = toCSV([{ name: 'Doe, John "JD"', spent: 'a\nb' }], cols);
  assert.equal(out, 'Name,Total Spent\r\n"Doe, John ""JD""","a\nb"');
});

test('toCSV renders missing values as empty', () => {
  const out = toCSV([{ name: 'Asha' }], cols);
  assert.equal(out, 'Name,Total Spent\r\nAsha,');
});
