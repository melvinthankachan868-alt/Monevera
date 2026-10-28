// Money Vault: Firestore rules emulator tests (allowed + denied cases).
// Run from the project root (needs Java 21 + firebase-tools):
//   npm i -D firebase-tools @firebase/rules-unit-testing
//   npx firebase emulators:exec --only firestore "node tests/rules.emulator.test.mjs"
// Uses the project's own firestore.rules. Never touches live Firebase.
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'mv-rules-test',
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
});

const results = [];
async function t(name, fn) {
  try { await fn(); results.push([name, 'PASS']); }
  catch (e) { results.push([name, 'FAIL: ' + (e.message || e).toString().split('\n')[0]]); }
}

async function seed() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'groups/g1'), { ownerId: 'owner1', memberUids: ['owner1', 'm1', 'm2'], name: 'G' });
    await setDoc(doc(db, 'groups/g1/members/owner1'), { uid: 'owner1' });
    await setDoc(doc(db, 'groups/g1/members/m1'), { uid: 'm1' });
    await setDoc(doc(db, 'groups/g1/members/m2'), { uid: 'm2' });
    await setDoc(doc(db, 'groups/g1/expenses/e_m1'), { createdBy: 'm1', amount: 100 });
    await setDoc(doc(db, 'groups/g1/settlements/s_m1'), { recordedBy: 'm1', amount: 50 });
    await setDoc(doc(db, 'groupInvitations/tok1'), { groupId: 'g1', token: 'tok1' });
    await setDoc(doc(db, 'groups/g1/invitations/i1'), { groupId: 'g1' });
    await setDoc(doc(db, 'users/alice/expenses/x1'), {
      ownerId: 'alice', amount: 10, category: 'Food', subcategory: 'Tea', date: '2026-10-01',
    });
  });
}
const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

// ---- groupInvitations ----
await seed();
await t('groupInvitations: anonymous get DENIED', () => assertFails(getDoc(doc(anon(), 'groupInvitations/tok1'))));
await t('groupInvitations: signed-in get ALLOWED', () => assertSucceeds(getDoc(doc(as('stranger'), 'groupInvitations/tok1'))));
await t('groupInvitations: anonymous list DENIED', () => assertFails(getDocs(collection(anon(), 'groupInvitations'))));
await t('groupInvitations: signed-in list DENIED', () => assertFails(getDocs(collection(as('stranger'), 'groupInvitations'))));
await t('groupInvitations: stranger create for g1 DENIED', () => assertFails(setDoc(doc(as('stranger'), 'groupInvitations/tokX'), { groupId: 'g1', token: 'tokX' })));
await t('groupInvitations: owner create for g1 ALLOWED', () => assertSucceeds(setDoc(doc(as('owner1'), 'groupInvitations/tokY'), { groupId: 'g1', token: 'tokY' })));
await t('groupInvitations: stranger update DENIED', () => assertFails(updateDoc(doc(as('stranger'), 'groupInvitations/tok1'), { status: 'revoked' })));
await t('groupInvitations: stranger delete DENIED', () => assertFails(deleteDoc(doc(as('stranger'), 'groupInvitations/tok1'))));
await t('groupInvitations: owner update ALLOWED', () => assertSucceeds(updateDoc(doc(as('owner1'), 'groupInvitations/tok1'), { status: 'revoked' })));

// ---- groups ----
await seed();
await t('groups: stranger self-join DENIED', () => assertFails(updateDoc(doc(as('stranger'), 'groups/g1'), { memberUids: ['owner1', 'm1', 'm2', 'stranger'] })));
await t('groups: member cannot take ownership DENIED', () => assertFails(updateDoc(doc(as('m1'), 'groups/g1'), { ownerId: 'm1' })));
await t('groups: member cannot add another uid DENIED', () => assertFails(updateDoc(doc(as('m1'), 'groups/g1'), { memberUids: ['owner1', 'm1', 'm2', 'evil'] })));
await t('groups: member cannot remove someone else DENIED', () => assertFails(updateDoc(doc(as('m1'), 'groups/g1'), { memberUids: ['owner1', 'm1'] })));
await t('groups: member self-leave ALLOWED', () => assertSucceeds(updateDoc(doc(as('m1'), 'groups/g1'), { memberUids: ['owner1', 'm2'] })));
await t('groups: owner update ALLOWED', () => assertSucceeds(updateDoc(doc(as('owner1'), 'groups/g1'), { name: 'Renamed' })));
await t('groups: member delete DENIED', () => assertFails(deleteDoc(doc(as('m2'), 'groups/g1'))));
await t('groups: owner delete ALLOWED', () => assertSucceeds(deleteDoc(doc(as('owner1'), 'groups/g1'))));

// ---- members ----
await seed();
await t('members: stranger create own member doc DENIED', () => assertFails(setDoc(doc(as('stranger'), 'groups/g1/members/stranger'), { uid: 'stranger' })));
await t('members: owner create ALLOWED', () => assertSucceeds(setDoc(doc(as('owner1'), 'groups/g1/members/m3'), { uid: 'm3' })));
await t('members: member cannot delete another member DENIED', () => assertFails(deleteDoc(doc(as('m1'), 'groups/g1/members/m2'))));
await t('members: member can delete own record ALLOWED', () => assertSucceeds(deleteDoc(doc(as('m1'), 'groups/g1/members/m1'))));
await t('members: cannot change uid on member doc DENIED', () => assertFails(updateDoc(doc(as('m2'), 'groups/g1/members/m2'), { uid: 'owner1' })));
await t('members: non-member read DENIED', () => assertFails(getDoc(doc(as('stranger'), 'groups/g1/members/m1'))));

// ---- group expenses / settlements ----
await seed();
await t('expenses: member create as self ALLOWED', () => assertSucceeds(setDoc(doc(as('m1'), 'groups/g1/expenses/e2'), { createdBy: 'm1', amount: 20 })));
await t('expenses: spoofed createdBy DENIED', () => assertFails(setDoc(doc(as('m1'), 'groups/g1/expenses/e3'), { createdBy: 'm2', amount: 20 })));
await t('expenses: negative amount DENIED', () => assertFails(setDoc(doc(as('m1'), 'groups/g1/expenses/e4'), { createdBy: 'm1', amount: -5 })));
await t('expenses: non-member create DENIED', () => assertFails(setDoc(doc(as('stranger'), 'groups/g1/expenses/e5'), { createdBy: 'stranger', amount: 5 })));
await t('expenses: member edits another member expense DENIED', () => assertFails(updateDoc(doc(as('m2'), 'groups/g1/expenses/e_m1'), { amount: 999 })));
await t('expenses: owner edits any expense ALLOWED', () => assertSucceeds(updateDoc(doc(as('owner1'), 'groups/g1/expenses/e_m1'), { amount: 120 })));
await t('expenses: createdBy change DENIED', () => assertFails(updateDoc(doc(as('m1'), 'groups/g1/expenses/e_m1'), { createdBy: 'm2' })));
await t('settlements: spoofed recordedBy DENIED', () => assertFails(setDoc(doc(as('m1'), 'groups/g1/settlements/s2'), { recordedBy: 'm2', amount: 5 })));
await t('settlements: member create as self ALLOWED', () => assertSucceeds(setDoc(doc(as('m1'), 'groups/g1/settlements/s3'), { recordedBy: 'm1', amount: 5 })));
await t('settlements: edit someone else\'s DENIED', () => assertFails(updateDoc(doc(as('m2'), 'groups/g1/settlements/s_m1'), { amount: 1 })));
await t('invitations(sub): member read ALLOWED', () => assertSucceeds(getDoc(doc(as('m1'), 'groups/g1/invitations/i1'))));
await t('invitations(sub): member create DENIED', () => assertFails(setDoc(doc(as('m1'), 'groups/g1/invitations/i2'), { groupId: 'g1' })));
await t('invitations(sub): owner create ALLOWED', () => assertSucceeds(setDoc(doc(as('owner1'), 'groups/g1/invitations/i3'), { groupId: 'g1' })));

// ---- personal data isolation ----
await seed();
await t('users: owner read own expense ALLOWED', () => assertSucceeds(getDoc(doc(as('alice'), 'users/alice/expenses/x1'))));
await t('users: other user read DENIED', () => assertFails(getDoc(doc(as('bob'), 'users/alice/expenses/x1'))));
await t('users: anonymous read DENIED', () => assertFails(getDoc(doc(anon(), 'users/alice/expenses/x1'))));
await t('users: other user write DENIED', () => assertFails(setDoc(doc(as('bob'), 'users/alice/expenses/x2'), { ownerId: 'bob', amount: 1, category: 'a', subcategory: 'b', date: 'd' })));
await t('users: ownerId spoof on create DENIED', () => assertFails(setDoc(doc(as('alice'), 'users/alice/expenses/x3'), { ownerId: 'bob', amount: 1, category: 'a', subcategory: 'b', date: 'd' })));
await t('users: negative amount DENIED', () => assertFails(setDoc(doc(as('alice'), 'users/alice/expenses/x4'), { ownerId: 'alice', amount: -1, category: 'a', subcategory: 'b', date: 'd' })));
await t('users: valid expense create ALLOWED', () => assertSucceeds(setDoc(doc(as('alice'), 'users/alice/expenses/x5'), { ownerId: 'alice', amount: 1, category: 'a', subcategory: 'b', date: 'd' })));
await t('users: ownerId change on update DENIED', () => assertFails(updateDoc(doc(as('alice'), 'users/alice/expenses/x1'), { ownerId: 'bob' })));
await t('users: 10KB doc ID DENIED', () => assertFails(setDoc(doc(as('alice'), 'users/alice/expenses/' + 'A'.repeat(10000)), { ownerId: 'alice', amount: 1, category: 'a', subcategory: 'b', date: 'd' })));
await t('unknown top-level collection DENIED', () => assertFails(getDoc(doc(as('alice'), 'secrets/s1'))));

await env.cleanup();
console.table(results.map(([name, status]) => ({ name, status })));
const failed = results.filter(([, s]) => s !== 'PASS').length;
console.log(`TOTAL ${results.length} | PASSED ${results.length - failed} | FAILED ${failed}`);
process.exit(failed ? 1 : 0);
