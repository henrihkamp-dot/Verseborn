# Verseborn: Episodic JRPG

## Source import complete

This repository contains **all 605 source files** from Sites release 153. Every imported Git blob was verified against the recovery manifest on 8 October 2026. No game changes or Sites deployments were made. A clean rebuild and recovery of the optimized deployment package remain unverified.

Live game: https://verseborn-episodic-jrpg.benji-pendragon.chatgpt.site

Original Sites source commit: `09c8bb00502d117910a1ee46e7d0ed5e154e0fa4` (release 153, 6 October 2026).

See [recovery/source-manifest.json](recovery/source-manifest.json) for the complete source inventory, exact Git blob hashes and completed import status.

## Remaining deployment recovery

Recover the optimized deployment package separately. Existing packaging scripts reference prior runtime directories and Windows-specific paths; a clean rebuild is not yet verified. Preserve the imported source and its manifest as the release 153 baseline before changing those scripts.

Browser-local game saves are separate from source control. Changes pushed here are not automatically deployed to Sites.
