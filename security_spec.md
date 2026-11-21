# Firestore Security Specification

## 1. Data Invariants
- `/adminAuth/config` and `/adminAuth/gate` are strictly non-readable (`allow read: if false`) so neither password hashes nor proofs can ever be read from Firestore.
- Writing `/adminAuth/gate` requires a valid 64-character lowercase hex SHA-256 proof whose SHA-256 hash matches either the stored `passwordDoubleHash` in `/adminAuth/config` or (before the first password change) the default `admin123` double-hash, plus `updatedAt == request.time`.
- All writes to `/catalogVarieties/{flowerId}`, `/catalogMeta/store`, and `/adminAuth/config` require an atomic batch that writes `/adminAuth/gate` with `updatedAt == request.time` and a valid proof verified via `getAfter()` (or verified Firebase admin identity).
- Public storefront visitors have read-only access (`get` and `list`) to `/catalogVarieties` and `get`-only access to `/catalogMeta/store`.
- Document IDs must match `^[a-zA-Z0-9_-]+$` and be <= 128 characters.
- `createdAt` and `updatedAt` timestamps must match `request.time` on creation; `createdAt` is immutable on update; `updatedAt` must equal `request.time` on update.
- `photos` array is bounded (`size() >= 1 && size() <= 5`) with string type and max size validation on every element.
- Strict key allowlists (`hasAll` + `hasOnly` on create; `affectedKeys().hasOnly(...)` on update) block shadow fields.
- Legacy collections (`/flowers`, `/settings`, `/admins`) remain strictly locked behind verified Firebase Admin identity.

## 2. The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. Reading `/adminAuth/config` to steal `passwordDoubleHash` -> DENIED (`allow read: if false`).
2. Reading `/adminAuth/gate` to replay a previous `proof` -> DENIED (`allow read: if false`).
3. Writing `/adminAuth/gate` with a wrong password proof -> DENIED (`isValidAdminProof` fails).
4. Creating `/catalogVarieties/rose-1` without an atomic `/adminAuth/gate` batch write -> DENIED (`hasValidBatchGate` fails).
5. Creating `/catalogVarieties/rose-1` while trying to reuse a stale `/adminAuth/gate` document from an earlier request -> DENIED (`gate.updatedAt == request.time` fails).
6. Creating `/catalogVarieties/rose-1` with a shadow field `isFeatured: true` -> DENIED (`hasOnly` fails).
7. Creating `/catalogVarieties/bad$id!` with invalid path ID characters -> DENIED (`isValidId` fails).
8. Creating `/catalogVarieties/rose-1` with backdated client `createdAt` -> DENIED (`createdAt == request.time` fails).
9. Updating `/catalogVarieties/rose-1` while mutating immutable `createdAt` -> DENIED.
10. Creating `/catalogVarieties/rose-1` with empty `photos: []` or `photos.size() > 5` -> DENIED.
11. Updating `/adminAuth/config` with a non-hex or wrong-length `passwordDoubleHash` -> DENIED.
12. Deleting `/catalogMeta/store`, `/adminAuth/config`, or `/adminAuth/gate` -> DENIED (`allow delete: if false`).
