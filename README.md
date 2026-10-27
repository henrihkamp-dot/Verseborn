# Verseborn: Episodic JRPG

Current game source synchronized from the maintained Codex/Sites project on 27 October 2026. Game files match Sites source commit `85cf148009cacf39a84ececac98c7285d6406f14`; existing GitHub comic documentation and history are preserved.

Live game: https://verseborn-episodic-jrpg.benji-pendragon.chatgpt.site/

## Finding Tinus

- Character abilities and signature gear: [public/game/tinus-character.js](public/game/tinus-character.js)
- Recruitment: [public/game/tinus-recruitment.js](public/game/tinus-recruitment.js)
- Portrait, battle art, equipment and animation sheets: [public/game/assets/tinus/](public/game/assets/tinus/)
- Animated idle sprites: [public/game/assets/sprites/flameguard-idle/tinus-cosmic-v6.webp](public/game/assets/sprites/flameguard-idle/tinus-cosmic-v6.webp)
- Whirlpool battles: [public/game/tinus-whirlpool.js](public/game/tinus-whirlpool.js)
- Whirlpool encounter artwork: [public/game/assets/tinus-gauntlet/](public/game/assets/tinus-gauntlet/)
- The Inn Between Worlds: [public/game/lost-dimensions.js](public/game/lost-dimensions.js) and [artwork](public/game/assets/lost-dimensions/)

## Build and run

Use Node.js 22.13 or newer and install the dependencies from `pnpm-lock.yaml`. Run `pnpm build` for the production build and `pnpm start` to serve it. A fresh build of this game source completed successfully on 26 October 2026. The game is served at `/game/`.

The active game uses `title-presentation.js`. The earlier GitHub `title-modern.js` experiment is retained for history but is not loaded by the current game.

## Source history and publishing

The `recovery/source-manifest.json` file documents the original release 153 import; it is a historical baseline, not the current source inventory. The `docs/comics`, `docs/new-run` and `docs/reference-sheets` directories preserve the separately added GitHub references.

GitHub and Sites are separate destinations. A GitHub push does not publish the live game. Future game releases should be synchronized to this repository as well as published through Sites. Fetch and review independent GitHub changes before synchronization, and never force-push over them.

Browser saves and private save backups are separate from this repository and are not included.
