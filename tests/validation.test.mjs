import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isPhone, isEmail, isDateOfBirth, passwordRules } from '../src/auth/validation.ts';

test('phone formatting retains Myanmar international identity and removes local trunk prefix', () => {
  assert.equal(normalizePhone('09 421 234 567'), '+959421234567');
  assert.equal(isPhone(normalizePhone('09 421 234 567')), true);
  assert.equal(normalizePhone('+959421234567'), '+959421234567');
  assert.equal(normalizePhone('call 09421234567'), '');
  assert.equal(normalizePhone(''), '');
  assert.equal(normalizePhone('+999123456789'), '');
  assert.equal(normalizePhone('09421234567', '+999'), '');
  assert.equal(normalizePhone('8123 4567', '+65'), '+6581234567');
  assert.equal(normalizePhone('+6581234567', '+95'), '+6581234567');
  assert.equal(isPhone('+959123456789'), false); // This placeholder prefix is not a valid mobile range.
  assert.equal(isPhone('+950'), false);
  assert.equal(isPhone('+95badnumber'), false);
});
test('email and calendar dates reject malformed user input', () => {
  assert.equal(isEmail('member@example.com'), true);
  assert.equal(isEmail('member@'), false);
  assert.equal(isDateOfBirth('2008-02-29'), true);
  assert.equal(isDateOfBirth('2009-02-29'), false);
  assert.equal(isDateOfBirth('2099-01-01'), false);
});
test('password checklist enforces all three design requirements', () => {
  assert.deepEqual(passwordRules('Short1!'), [false, true, true]);
  assert.deepEqual(passwordRules('longpassword'), [true, false, false]);
  assert.deepEqual(passwordRules('Strong123!'), [true, true, true]);
});
