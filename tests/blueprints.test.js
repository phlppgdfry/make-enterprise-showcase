'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateBlueprint, validateManifest } = require('../scripts/validate-blueprints');
const node = id => ({ id, module: 'gateway:WebhookRespond', version: 1 });
test('validator visits nested routes and detects duplicate IDs', () => { assert.throws(() => validateBlueprint({ name: 'test', metadata: {}, flow: [{ ...node(1), routes: [{ flow: [node(1)] }] }] }), /duplicate/); });
test('validator catches mappings to missing module IDs', () => { assert.throws(() => validateBlueprint({ name: 'test', metadata: {}, flow: [{ ...node(1), mapper: { body: '{{99.result}}' } }] }), /Dangling/); });
test('validator catches missing parent nodes', () => { assert.throws(() => validateManifest({ name: 'test', scheduling: {}, modules: [{ ...node(1), root: 'main' }, { ...node(2), follows: 9 }] }), /parent/); });
test('validator catches cycles and multiple roots', () => {
  assert.throws(() => validateManifest({ name: 'test', scheduling: {}, modules: [{ ...node(1), root: 'main' }, { ...node(2), follows: 3 }, { ...node(3), follows: 2 }] }), /Cycle/);
  assert.throws(() => validateManifest({ name: 'test', scheduling: {}, modules: [{ ...node(1), root: 'main' }, { ...node(2), root: 'main' }] }), /root/);
});
