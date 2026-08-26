import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowRequest } from '../src/harness/validate.js'

test('allowRequest — only inlined schemes pass; network and file are blocked', () => {
  for (const u of ['data:text/css,body{}', 'about:blank', 'blob:abc']) assert.equal(allowRequest(u), true, u)
  for (const u of [
    'http://127.0.0.1/x', 'https://evil.example/x', 'file:///etc/hostname',
    'ftp://h/x', 'ws://h', '/etc/passwd', 'javascript:1'
  ]) assert.equal(allowRequest(u), false, u)
})
