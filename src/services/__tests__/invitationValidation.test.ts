import { validateEmail,validatePhone } from '../../utils/invitationValidation';

console.log('--- Testing Invitation Validation Utilities ---');

// Test 1: Invalid emails
const invalidEmails = ['abc', 'abc@', 'abc@x', 'abc@x.', '  ', '', 'user @domain.com', 'user@domain. c', 'user..name@domain.com'];
for (const em of invalidEmails) {
  const res = validateEmail(em);
  if (res.isValid) {
    console.error(`FAILED: Expected '${em}' to be invalid, but got valid!`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: Correctly rejected invalid email: "${em}" (${res.error})`);
  }
}

// Test 2: Valid emails
const validEmails = ['rahul@example.com', 'ALVIN.TEST@GMAIL.COM', 'anu+money@fintech.co.in'];
for (const em of validEmails) {
  const res = validateEmail(em);
  if (!res.isValid) {
    console.error(`FAILED: Expected '${em}' to be valid, but got: ${res.error}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: Valid email normalized: ${em} -> ${res.normalized}`);
  }
}

// Test 3: Invalid phones
const invalidPhones = ['123', '+91', 'letters', '', '  ', '+9112345', '1234567890', '+910123456789'];
for (const ph of invalidPhones) {
  const res = validatePhone(ph);
  if (res.isValid) {
    console.error(`FAILED: Expected '${ph}' to be invalid, but got valid!`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: Correctly rejected invalid phone: "${ph}" (${res.error})`);
  }
}

// Test 4: Valid phones
const validPhones = [
  { raw: '9876543210', expected: '+919876543210' },
  { raw: '+91 98765 43210', expected: '+919876543210' },
  { raw: '09876543210', expected: '+919876543210' },
  { raw: '+14155552671', expected: '+14155552671' },
];
for (const item of validPhones) {
  const res = validatePhone(item.raw);
  if (!res.isValid || res.normalized !== item.expected) {
    console.error(`FAILED: Expected '${item.raw}' -> '${item.expected}', got '${res.normalized}' (valid=${res.isValid})`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: Valid phone normalized: "${item.raw}" -> "${res.normalized}"`);
  }
}

console.log('🎉 ALL VALIDATION TESTS PASSED!');
