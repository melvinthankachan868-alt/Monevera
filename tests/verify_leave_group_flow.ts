/**
 * Money Vault - Leave Group Execution Order & Security Invariant Test Suite
 *
 * Verifies that the leave-group flow strictly deletes the member subcollection record
 * BEFORE updating the parent group document.
 *
 * Rationale in firestore.rules:
 * - Subcollection rule:
 *     allow delete: if isGroupOwner(groupId) || (isGroupMember(groupId) && resource.data.uid == request.auth.uid);
 * - Helper function:
 *     isGroupMember(groupId) := request.auth.uid in get(/groups/{groupId}).data.memberUids
 * - If the group document is updated FIRST (removing user from memberUids),
 *   isGroupMember(groupId) immediately evaluates to false, causing Firestore
 *   rules to REJECT deleting the member subcollection document.
 * - Deleting the member record FIRST guarantees that isGroupMember evaluates to true,
 *   enabling clean, authorized deletion before the parent group document is updated.
 */

interface LeaveTestResult {
  id: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  details: string;
}

const results: LeaveTestResult[] = [];

function recordResult(id: string, name: string, expected: string, actual: string, passed: boolean, details: string) {
  results.push({ id, name, expected, actual, passed, details });
}

console.log('================================================================================');
console.log('   MONEY VAULT — LEAVE GROUP FLOW & EXECUTION ORDER TEST SUITE                 ');
console.log('================================================================================\n');

// 1. Model of Firestore Security Rules State Machine
interface FirestoreGroupState {
  id: string;
  ownerId: string;
  memberUids: string[];
}

interface FirestoreMemberState {
  id: string;
  uid: string;
  name: string;
  role: string;
}

class FirestoreRulesSimulator {
  public group: FirestoreGroupState;
  public members: Map<string, FirestoreMemberState>;
  public operationsLog: string[] = [];

  constructor(group: FirestoreGroupState, members: FirestoreMemberState[]) {
    this.group = { ...group, memberUids: [...group.memberUids] };
    this.members = new Map(members.map(m => [m.id, { ...m }]));
  }

  // isGroupMember helper from firestore.rules lines 367-373
  private isGroupMember(authUid: string): boolean {
    return this.group.ownerId === authUid || this.group.memberUids.includes(authUid);
  }

  // Member delete rule from firestore.rules lines 421:
  // allow delete: if isGroupOwner(groupId) || (isGroupMember(groupId) && resource.data.uid == request.auth.uid);
  public deleteMemberRecord(authUid: string, memberId: string): { success: boolean; error?: string } {
    this.operationsLog.push(`DELETE groups/${this.group.id}/members/${memberId}`);
    const memberDoc = this.members.get(memberId);
    if (!memberDoc) {
      return { success: false, error: 'MEMBER_NOT_FOUND' };
    }

    const isMember = this.isGroupMember(authUid);
    const isSelf = memberDoc.uid === authUid;

    if (!isMember) {
      return { success: false, error: 'PERMISSION_DENIED: User is not a member of the group according to group.memberUids' };
    }
    if (!isSelf && this.group.ownerId !== authUid) {
      return { success: false, error: 'PERMISSION_DENIED: Only owner or the member themselves can delete this record' };
    }

    this.members.delete(memberId);
    return { success: true };
  }

  // Group update rule from firestore.rules lines 397-407:
  // Validated self-leave: requester removes ONLY their own UID from memberUids
  public updateGroupLeave(authUid: string, newMemberUids: string[]): { success: boolean; error?: string } {
    this.operationsLog.push(`UPDATE groups/${this.group.id} (memberUids: [${newMemberUids.join(',')}])`);
    const existingUids = this.group.memberUids;

    // Rule: must be in existing memberUids
    if (!existingUids.includes(authUid)) {
      return { success: false, error: 'PERMISSION_DENIED: Signer is not in existing memberUids' };
    }
    // Rule: must NOT be in incoming memberUids
    if (newMemberUids.includes(authUid)) {
      return { success: false, error: 'PERMISSION_DENIED: Signer must be removed from incoming memberUids' };
    }
    // Rule: existing must contain all incoming
    const hasAll = newMemberUids.every(u => existingUids.includes(u));
    if (!hasAll) {
      return { success: false, error: 'PERMISSION_DENIED: Incoming contains unauthorized UIDs' };
    }
    // Rule: size must decrement by exactly 1
    if (newMemberUids.length !== existingUids.length - 1) {
      return { success: false, error: 'PERMISSION_DENIED: Must remove exactly one UID' };
    }

    this.group.memberUids = newMemberUids;
    return { success: true };
  }
}

// ==============================================================================
// TEST 1: Demonstrating failure if group is updated before member is deleted
// ==============================================================================
{
  const sim = new FirestoreRulesSimulator(
    { id: 'grp_alpha', ownerId: 'usr_owner', memberUids: ['usr_owner', 'usr_member_bob'] },
    [{ id: 'mem_bob_id', uid: 'usr_member_bob', name: 'Bob', role: 'member' }]
  );

  // Step 1: Flawed execution order — update group first
  const groupUpdateResult = sim.updateGroupLeave('usr_member_bob', ['usr_owner']);
  // Step 2: Delete member doc after group update
  const memberDeleteResult = sim.deleteMemberRecord('usr_member_bob', 'mem_bob_id');

  const failedAsExpected = Boolean(groupUpdateResult.success && !memberDeleteResult.success && memberDeleteResult.error?.includes('PERMISSION_DENIED'));
  recordResult(
    'LEAVE-01-FLAWED-ORDER-REJECTS',
    'Firestore Rules Evaluation Order',
    'Updating group first removes UID from memberUids, causing subsequent member delete to fail PERMISSION_DENIED',
    'Member delete rejected with PERMISSION_DENIED',
    failedAsExpected,
    failedAsExpected
      ? 'Confirmed: Updating group first causes deleteMemberRecord to fail with PERMISSION_DENIED'
      : `Unexpected result: ${JSON.stringify(memberDeleteResult)}`
  );
}

// ==============================================================================
// TEST 2: Correct order — delete member record BEFORE updating group document
// ==============================================================================
{
  const sim = new FirestoreRulesSimulator(
    { id: 'grp_alpha', ownerId: 'usr_owner', memberUids: ['usr_owner', 'usr_member_bob'] },
    [{ id: 'mem_bob_id', uid: 'usr_member_bob', name: 'Bob', role: 'member' }]
  );

  // Step 1: Correct order — delete member record FIRST while still in memberUids
  const memberDeleteResult = sim.deleteMemberRecord('usr_member_bob', 'mem_bob_id');
  // Step 2: Update group document to remove UID from memberUids
  const groupUpdateResult = sim.updateGroupLeave('usr_member_bob', ['usr_owner']);

  const succeededCleanly = memberDeleteResult.success && groupUpdateResult.success;
  recordResult(
    'LEAVE-02-CORRECT-ORDER-SUCCEEDS',
    'Firestore Rules Evaluation Order',
    'Deleting member record first succeeds (isGroupMember=true), then group update removes memberUid',
    'Both operations SUCCEED',
    succeededCleanly,
    succeededCleanly
      ? 'Confirmed: Member delete succeeded, followed by group update removing Bob from memberUids'
      : `Unexpected failure: delete=${memberDeleteResult.error}, update=${groupUpdateResult.error}`
  );
}

// ==============================================================================
// TEST 3: Static Analysis of leaveSharedGroup & removeGroupMember in codebase
// ==============================================================================
import fs from 'fs';
import path from 'path';

const cloudFirestoreContent = fs.readFileSync(path.join(process.cwd(), 'src/db/cloudFirestore.ts'), 'utf-8');
const finTraqContextContent = fs.readFileSync(path.join(process.cwd(), 'src/context/FinTraQContext.tsx'), 'utf-8');

// Check that leaveSharedGroup in cloudFirestore.ts calls deleteDoc before updateDoc
const leaveSharedGroupMatch = cloudFirestoreContent.match(/export async function leaveSharedGroup[\s\S]*?^}/m);
let cloudFirestoreCorrectOrder = false;
if (leaveSharedGroupMatch) {
  const fnBody = leaveSharedGroupMatch[0];
  const deleteMemberIdx = fnBody.indexOf('await deleteDoc(memberRef)');
  const updateGroupIdx = fnBody.indexOf('await updateDoc(groupRef');
  cloudFirestoreCorrectOrder = deleteMemberIdx !== -1 && updateGroupIdx !== -1 && deleteMemberIdx < updateGroupIdx;
}

recordResult(
  'LEAVE-03-CLOUDFIRESTORE-ORDER',
  'Codebase Sequence Verification',
  'src/db/cloudFirestore.ts: leaveSharedGroup executes deleteDoc(memberRef) strictly BEFORE updateDoc(groupRef)',
  'deleteDoc index < updateDoc index',
  cloudFirestoreCorrectOrder,
  cloudFirestoreCorrectOrder
    ? 'Verified: leaveSharedGroup calls deleteDoc(memberRef) before updateDoc(groupRef)'
    : 'Failed: deleteDoc was not found before updateDoc in leaveSharedGroup'
);

// Check that FinTraQContext.tsx removeGroupMember deletes member doc before updating group
const removeMemberMatch = finTraqContextContent.match(/const removeGroupMember = useCallback[\s\S]*?^  \);/m);
let contextRemoveCorrectOrder = false;
if (removeMemberMatch) {
  const fnBody = removeMemberMatch[0];
  const deleteMemberIdx = fnBody.indexOf('await deleteSharedGroupMember(groupId, memberId)');
  const updateGroupIdx = fnBody.indexOf('await updateSplitGroup(updatedGroup)');
  contextRemoveCorrectOrder = deleteMemberIdx !== -1 && updateGroupIdx !== -1 && deleteMemberIdx < updateGroupIdx;
}

recordResult(
  'LEAVE-04-FINTRAQCONTEXT-REMOVE-ORDER',
  'Codebase Sequence Verification',
  'src/context/FinTraQContext.tsx: removeGroupMember calls deleteSharedGroupMember strictly BEFORE updateSplitGroup',
  'deleteSharedGroupMember index < updateSplitGroup index',
  contextRemoveCorrectOrder,
  contextRemoveCorrectOrder
    ? 'Verified: removeGroupMember calls deleteSharedGroupMember before updateSplitGroup'
    : 'Failed: deleteSharedGroupMember was not found before updateSplitGroup in removeGroupMember'
);

// Check that FinTraQContext.tsx leaveSplitGroup deletes member doc before updating group
const leaveSplitMatch = finTraqContextContent.match(/const leaveSplitGroup = useCallback[\s\S]*?^  \);/m);
let contextLeaveCorrectOrder = false;
if (leaveSplitMatch) {
  const fnBody = leaveSplitMatch[0];
  const deleteMemberIdx = fnBody.indexOf('await deleteSharedGroupMember(groupId, member.id)');
  const updateGroupIdx = fnBody.indexOf('await updateSplitGroup(updatedGroup)');
  contextLeaveCorrectOrder = deleteMemberIdx !== -1 && updateGroupIdx !== -1 && deleteMemberIdx < updateGroupIdx;
}

recordResult(
  'LEAVE-05-FINTRAQCONTEXT-LEAVE-ORDER',
  'Codebase Sequence Verification',
  'src/context/FinTraQContext.tsx: leaveSplitGroup calls deleteSharedGroupMember strictly BEFORE updateSplitGroup',
  'deleteSharedGroupMember index < updateSplitGroup index',
  contextLeaveCorrectOrder,
  contextLeaveCorrectOrder
    ? 'Verified: leaveSplitGroup calls deleteSharedGroupMember before updateSplitGroup'
    : 'Failed: deleteSharedGroupMember was not found before updateSplitGroup in leaveSplitGroup'
);

// Output results table
console.log('=== LEAVE GROUP FLOW TEST RESULTS ===');
console.table(results.map(r => ({
  ID: r.id,
  Category: r.name,
  Expected: r.expected,
  Status: r.passed ? 'PASS' : 'FAIL',
  Details: r.details,
})));

const allPassed = results.every(r => r.passed);
console.log(`\nTOTAL TESTS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);

if (!allPassed) {
  process.exit(1);
}
