# Authentication and Database Checkpoint

The codebase now has a Prisma client foundation for PostgreSQL and an Auth.js server integration. GitHub OAuth is the first development sign-in provider. Sessions expose a CUSTOMER, SELLER or ADMIN role and a reusable server-side role guard is included.

## Security rule
UI visibility is not authorization. Seller/admin mutations must enforce role checks on the server and scope database operations to the authenticated seller/user.

## Before production
The temporary default CUSTOMER role must be replaced by a database-backed user/role lookup. SELLER is granted only after onboarding/verification. ADMIN must never be self-selectable.

## Environment
DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID and AUTH_GITHUB_SECRET are configured outside Git. Live secrets must never be committed.

## Next checkpoint
Provision managed PostgreSQL, map authenticated users to database users, run the initial migration, then convert seller listing creation and catalogue reads from sample data to database operations.
