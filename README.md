# Verseborn: Episodic JRPG

## Import incomplete

This repository currently contains **27 of 605 source files** from Sites release 153. **It is not yet a complete backup or runnable checkout.** The upload environment disconnected on 8 October 2026; no game changes or deployments were made.

Live game: https://verseborn-episodic-jrpg.benji-pendragon.chatgpt.site

Original Sites source commit: `09c8bb00502d117910a1ee46e7d0ed5e154e0fa4` (release 153, 6 October 2026).

See [recovery/source-manifest.json](recovery/source-manifest.json) for the complete expected source inventory, exact Git blob hashes and import status. Uploaded blobs were verified against these hashes. The manifest does not contain the missing file contents.

## Resume

1. Open the existing Verseborn: Episodic JRPG source repository in Sites and retrieve the source commit above.
2. Use the manifest to copy the missing source files and assets into this repository, preserving their paths and contents.
3. Verify all 605 source paths and blob hashes before marking the import complete.
4. Recover the optimized deployment package separately. Existing packaging scripts reference prior runtime directories and Windows-specific paths; a clean rebuild is not yet verified.

Browser-local game saves are separate from source control. Changes pushed here are not automatically deployed to Sites.
