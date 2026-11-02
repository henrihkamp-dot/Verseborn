# Shadow Trials III — asset delivery

Asset preview and runtime atlases: `public/game/shadow-court-iii/`.
Original generated artwork: `art-source/shadow-court-iii/`.

This is an additive art delivery for battles 15–21. Existing game files and Site identity are unchanged. It includes seven bosses, sixteen distinct idle/taunt frames per boss, six four-keyframe actions per boss, seven arenas, portraits and the third region map.

Open the preview through an existing static server or open its `index.html` locally. The preview uses a bundled manifest script so it does not require fetching JSON over `file:`. Fonts fall back to system fonts when offline.

The full downloadable delivery also includes 280 individual transparent PNG frames; the repository avoids duplicating those derived frames alongside the atlases. Original sheets and full animation metadata are retained here.

The map illustration, destination coordinates and progression metadata are ready. Combat mechanics and native region navigation are not activated by this change. Integrate only these new files into the latest existing Sites checkout. The GitHub main snapshot used for this asset branch predates the live game's newer Shadow Trials code; do not redeploy it over the live Site.

The current chat's Sites repository and deployment tools returned unavailable. No new Site was created and no live deployment was attempted.

QA: 280 nonempty padded frames, 16 unique idle frames per boss, no source-edge clipping, conserved foreground pixels during source separation, 49 exact visible-RGBA atlas comparisons, and 49 browser animation-selection/end-frame checks. The key pose contact sheet is in `public/game/shadow-court-iii/preview/pose-review.png`.
