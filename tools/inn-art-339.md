# Illustrated Inn Between Worlds assets

Built-in image generation was used. Original outputs are retained in the Codex generated-images directory. The game-ready files below are stored in `public/game/assets/lost-dimensions/` and copied to `dist/client/game/assets/lost-dimensions/`.

## Final prompts / asset specifications

- **guests-339.webp:** strict reference identities from the existing guests. Three columns (front, right profile, back), three rows: rotund silver-haired mustachioed landlord with red waistcoat, leather apron and brass lantern; pale tired white-haired breakfast guest with blue coat, plum scarf, plate and service bell; mysterious burgundy-robed hooded creditor with featureless face, golden eyes and parchment scroll. Complete feet, equal cells, genuinely transparent surroundings, rich comic ink rendering with amber rim lighting and violet shadows. Preserve all identities; the creditor must not become a human wearing a top hat.
- **props-339.webp:** three columns, two rows of transparent standalone illustrations: ornate oak grandfather clock; oval standing mirror; carved lectern with guest register and quill; ornate brass handheld lantern; round burgundy-and-brass shield; steel short sword. Detailed carved oak, worn brass, candlelight and comic linework matching the guests; no simple shapes or UI.
- **furniture-339.webp:** front, side and back views of a short carved oak inn counter, and a round inn table with tankards, candles and matching stool. Warm amber lighting, brass, burgundy cloth, rich comic detail, complete bases, transparent surroundings, no people or scenery.
- **trunk-339.webp:** retained front/side/back chest guardian from the prior directional sheet; unused human creditor art removed.
- **materials-338.webp / doors-338.webp:** previously generated inn wall/floor/hearth/cellar and ornate door/dimensional-portal illustrations retained and integrated. No brick-grid or basic-shape fallback remains in the inn renderer.

Only complete silhouettes breathe subtly; furnishings are solid on the navigation grid. Light pulses, portal motes and a carried illustrated lantern animate separately. Every inn resident has front, side and back artwork. Party members are the player’s first-person group and each has separate labelled weapon, shield and utility slots beside their portrait.

## Loading verification

Artwork requests are limited to five concurrent downloads, with five attempts per image. Tests deliberately fail Mira idle art, Rift dragon art and inn guest art once; all recover, normal idle sheets become ready and Rift entry works. Another test permanently fails inn guest art, verifies an explicit retry screen instead of substitute graphics, then restores the network and successfully retries. Quest, native battles, individual gear, collision and saved progress are also checked.

Two obsolete, unreferenced deployment assets (the superseded title-276 lute and opening-287 seated Verseborn) are omitted to keep the package within hosting limits. Their originals remain recoverable in source history; active title animation uses title-280 and active bar seating uses opening-288.
