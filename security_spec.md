# Monvera Security Specification & Zero-Trust Verification

## 1. Core Data Invariants
1. **Strict User Isolation**: All personal financial records (`income`, `allowances`, `bonuses`, `expenses`, `budgets`, `moneyOwed`, `loans`, `bills`, `subscriptions`, `emergencyFund`, `financialReminders`, `notifications`, `transfers`, `accounts`, `savings`, `investments`, `goals`, `alerts`, `alertHistory`, `settings`) live strictly under `/users/{userId}/...`.
2. **Deterministic Ownership Authorization**: An unauthenticated user cannot read or write any document. An authenticated user with UID $A$ cannot read, query, create, update, or delete any resource under `/users/{B}/...` or where `ownerId != A`.
3. **Owner Field Immutability**: On document update, `incoming().ownerId == existing().ownerId` and `incoming().ownerId == request.auth.uid`. A user cannot transfer records to another user.
4. **Timestamp & Field Bounds**: String IDs must match `^[a-zA-Z0-9_\-]+$` and have length <= 128 characters. Numeric monetary fields must be valid finite non-negative numbers.
5. **No Client Query Delegation**: Security rules evaluate `request.auth.uid == userId` and `resource.data.ownerId == request.auth.uid`. No blanket `allow read: if isSignedIn();` rules.
6. **No Phantom Fields**: Payloads must adhere to declared schemas and cannot inject arbitrary shadow permissions or elevated attributes.

## 2. The "Dirty Dozen" Malicious & Invariant-Breaking Payloads
1. **Unauthenticated Read Attack**: An unauthenticated request attempts to `get` `/users/victim_user_123/moneyOwed/mo_001`. (Must fail: PERMISSION_DENIED)
2. **Cross-Tenant Read Attack**: User A (`attacker_uid`) attempts to read User B's `/users/victim_user_123/loans/loan_001`. (Must fail: PERMISSION_DENIED)
3. **Identity Spoofing on Create**: User A (`attacker_uid`) attempts to create `/users/attacker_uid/moneyOwed/mo_spoof` with payload `{ "ownerId": "victim_user_123", "amount": 10000 }`. (Must fail: PERMISSION_DENIED)
4. **Ownership Hijack on Update**: User A attempts to update existing record changing `ownerId` from `attacker_uid` to `victim_user_123`. (Must fail: PERMISSION_DENIED)
5. **Cross-Tenant Write Attack**: User A attempts to write directly into `/users/victim_user_123/emergencyFund/main`. (Must fail: PERMISSION_DENIED)
6. **Denial-of-Wallet Long ID Attack**: User attempts to create a document with a 10KB string ID `mo_` + `A`.repeat(10000). (Must fail: PERMISSION_DENIED)
7. **Negative Amount Attack**: User attempts to inject a negative amount `{"originalAmount": -10000}` into a money owed record. (Must fail: PERMISSION_DENIED)
8. **Non-Numeric Amount Attack**: User attempts to inject a string `{"amount": "TEN_THOUSAND"}` into a numeric financial record. (Must fail: PERMISSION_DENIED)
9. **Cross-Tenant Money Owed Tampering**: User A attempts to update or delete User B's money-owed record at `/users/victim_user_123/moneyOwed/mo_001`. (Must fail: PERMISSION_DENIED)
10. **Cross-Tenant Loan Tampering**: User A attempts to alter User B's loan at `/users/victim_user_123/loans/loan_001`. (Must fail: PERMISSION_DENIED)
11. **Profile Impersonation**: User A attempts to overwrite `/users/victim_user_123` profile with User A's data. (Must fail: PERMISSION_DENIED)
12. **Cross-Tenant Subcollection Injection**: User A attempts to add a payment to User B's money-owed subcollection `/users/victim_user_123/moneyOwed/mo_001/payments/p_001`. (Must fail: PERMISSION_DENIED)
