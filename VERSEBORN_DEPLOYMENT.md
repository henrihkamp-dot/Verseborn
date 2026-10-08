# Verseborn Deployment Rules

Read this note before publishing the Verseborn Site from a Work session.

## Environment And Package Limit

- The Work runner is Windows.
- Do not try the Unix-only `package-site.sh` path first.
- Sites has a 256 MiB deployment package limit.
- The full source tree contains source artwork, superseded exports and other assets that must not automatically be included in a deployment.
- Use the existing reduced runtime/package structure in `.sites-artifacts`.
- Do not modify or delete source assets merely to satisfy the deployment limit.

## Small Code Or Data Changes

For isolated code or data changes, including gear, loot tables and labels:

1. Reuse the latest validated reduced runtime.
2. Replace only the changed runtime files.
3. Do not rebuild or repackage sprites, music or other unchanged assets.
4. Do not run the full 132/132 animation and sprite regression suite.
5. Run only the targeted tests relevant to the change.
6. Run a basic production integrity check.
7. Package the updated reduced runtime and verify it remains below 256 MiB before publishing.

When replacing `dist/client/game/game.js` in the reduced runtime, preserve the
runtime's `.webp` asset-path conversion. The source build uses `.png` names,
while the reduced package contains the corresponding lossless `.webp` files.
Before publishing, verify the packaged `game.js` has no `.png` references and
that every referenced runtime `.webp` file exists in the package.

## Full Reduced-Runtime Rebuilds

Rebuild and revalidate the full reduced runtime only when one or more of these are true:

- Sprites changed.
- Music changed.
- Runtime assets changed.
- Packaging logic changed.
- A core system changed in a way that requires broad validation.

When a full rebuild is necessary, preserve the existing lossless asset treatment, transparency, dimensions, filenames and runtime references unless the task explicitly requires otherwise.
