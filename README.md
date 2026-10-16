# VSBASH top players

Public, read-only GitHub Pages snapshots for the in-world board. Championships appear on the **left**, honor medals on the **right**, with the player's level next to their name. Each category ranks independently by score, then level, then stable player key. The world displays the top 10 in each category.

## Status

The ranking database is now hosted in the existing VSBASH Cloudflare D1 service. This repository mirrors its public JSON through GitHub Pages, scheduled every five minutes. **Automatic game-result ingestion is not connected yet.** The Cloudflare registry is empty; no fabricated players or scores were added. GitHub Actions scheduling and deployment can take longer than five minutes.

Cloudflare source: [leaderboard.json](https://vsbash-vip.ahmadclach2.workers.dev/api/leaderboard.json). Service status: [leaderboard status](https://vsbash-vip.ahmadclach2.workers.dev/api/leaderboard/status). The allowlisted in-world URL remains [GitHub Pages leaderboard.json](https://smslksa.github.io/vsbash-leaderboard/leaderboard.json). No GitHub writing token is required by Cloudflare. The latest local display corrections have not been uploaded to VRChat.

VRChat PlayerData is still the existing source of saved game progression. A GitHub Pages download does not upload PlayerData to GitHub. Automatic global reporting requires a separate identity-verified result bridge. Do not put GitHub tokens in Unity, Udon, PlayerData, a public repository, or a URL. Do not accept unverified browser-submitted totals as trusted game results.

## Publish reviewed data

The legacy `data/profiles.json` builder remains available for offline verification. Production publication uses `cloudflare-snapshot.mjs`, which downloads only the fixed public Cloudflare endpoint, validates both ranking lists, and strips unexpected fields. Failed downloads or invalid snapshots stop deployment; they cannot replace the last published data with empty rankings.

Cloudflare accepts approved cumulative totals at the authenticated `POST /api/leaderboard/profiles` endpoint. Its reporter credential stays outside Unity and the public repository. Stable opaque player keys are assigned by a trusted external reporter. Retries are idempotent, conflicting report IDs are rejected, and older totals cannot reduce scores. This endpoint trusts the authenticated reporter; it is not proof of a VRChat match outcome. No reporter is currently connected to the game.

Run `node --test build.test.mjs cloudflare-snapshot.test.mjs`, then `node cloudflare-snapshot.mjs`. Publish only the `public` directory using GitHub Pages. The world uses the HTTPS `*.github.io/.../leaderboard.json` URL; `workers.dev` is not on VRChat's default string-loading allowlist.

Until the external reporter is verified, keep `ArenaTopPlayersBoard.globalResultReportingReady=false`. This is a display gate; enabling it does not upload game results. The board labels its rankings **THIS INSTANCE** and uses existing saved stats of present players. Once reporting is connected and the display gate is enabled, global downloads retain the last valid snapshot on network failure. The board polls at most once every 5 minutes by default; it does not sync per frame or change game rewards.

## Preserve existing reward rules

The builder derives levels using 2 full-match wins per level before level 5, 3 wins before level 10, then 5 wins. Award eligibility stays in the existing GameManager: four starters, Medium/Hard CPUs for level progress, and at least three human starters for medals. Championships count eligible full-match wins with humans and/or CPUs. This package never awards wins itself or changes those rules.

New match rewards also require the standard numeric configuration: 4 balls, authored default speed (displayed as 9.1), 15 lives, 1 zombie, and first to 3 round wins. Custom numeric settings, including first to 1 or 2, award no level progress, championships, or medals. Free Zombie ON/OFF and Center Spin toggles are excluded from that numeric eligibility check. Eligibility is snapshotted at match start and replicated by the existing GameManager.

## Remaining activation work

1. Connect identity verification and authenticated result reporting to the external service. Test repeat submissions, reconnects, renamed players, and different instances before claiming automatic global updates.
2. Enable the global display gate only after the reporter passes real match/reconnect tests, then upload the corrected world and test both real VRChat clients.
