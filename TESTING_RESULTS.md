# Testing Results

## `npm run check`

`npm run check` fails during TypeScript compilation due to missing definitions and unknown error handling in `server/routes.ts`:
- `insertOrderSchema` is not defined when extending the order schema around line 322.
- `isStorageError` is referenced but not imported; `mapStorageError` exists instead (line ~423).
- Error handling treats `error` as `unknown`, so property accesses like `error.options.status` and `error.message` cause type errors (lines ~425-429).

These issues block the type-check step until the missing schema import and error typing are addressed in `server/routes.ts`.
