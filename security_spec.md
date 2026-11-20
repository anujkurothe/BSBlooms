# Firestore Security Specification

## 1. Data Invariants
- All writes to `/flowers/{flowerId}`, `/settings/{settingId}`, and `/admins/{adminUid}` require an authenticated user (`request.auth != null`) with `email_verified == true` who is either the bootstrapped merchant email (`anujkurothe3027@gmail.com`) or listed in `/admins/{request.auth.uid}`.
- Public storefront visitors (`flowers` and `settings`) have read-only access (`get` and `list`) and can never mutate or inject catalog entries.
- `/admins/{adminUid}` cannot be listed publicly and is readable only by the matching user or an existing admin.
- Document IDs must match `^[a-zA-Z0-9_-]+$` and be <= 128 characters.
- `createdAt` and `updatedAt` timestamps must match `request.time` on creation; `createdAt` and `createdBy` are immutable on update; `updatedAt` must equal `request.time` on update.
- `photos` array is bounded (`size() >= 1 && size() <= 5`) with string type validation on the first entry and bounded document size.
- Strict key allowlists (`hasAll` + `hasOnly` on create; `affectedKeys().hasOnly(...)` on update) block shadow fields.

## 2. The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated create on `/flowers/rose-1` -> DENIED (no auth).
2. Signed-in non-admin user updating `/flowers/rose-1` price -> DENIED (not admin).
3. Unverified email matching admin email attempting write -> DENIED (`email_verified != true`).
4. Admin creating `/flowers/rose-1` with shadow field `isFeatured: true` -> DENIED (`hasOnly` check fails).
5. Admin creating `/flowers/bad$id!` with invalid path ID characters -> DENIED (`isValidId` fails).
6. Admin creating `/flowers/rose-1` with `createdBy` spoofed to another UID -> DENIED (`createdBy == request.auth.uid`).
7. Admin creating `/flowers/rose-1` with backdated client `createdAt` -> DENIED (`createdAt == request.time`).
8. Admin updating `/flowers/rose-1` while mutating immutable `createdAt` or `createdBy` -> DENIED.
9. Admin creating `/flowers/rose-1` with empty `photos: []` or `photos.size() > 5` -> DENIED.
10. Admin creating `/flowers/rose-1` with invalid `category: "electronics"` -> DENIED.
11. Non-admin user listing `/admins` collection to harvest admin emails -> DENIED.
12. Non-admin user registering themselves in `/admins/{uid}` -> DENIED.
