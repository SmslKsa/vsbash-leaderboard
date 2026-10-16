# VSBASH top players

Public, read-only GitHub Pages snapshots for the in-world board. Championships appear on the **left**, honor medals on the **right**, with the player's level next to their name. Each category ranks independently by score, then level, then stable player key. The world displays the top 10 in each category.

## Status

The Unity board and snapshot builder are prepared. This repository publishes public snapshots using GitHub Pages. **Automatic result ingestion is not connected yet.** `data/profiles.json` is intentionally empty; there are no fabricated players or scores.

VRChat PlayerData is still the existing source of saved game progression. A GitHub Pages download does not upload PlayerData to GitHub. Automatic global reporting requires a separate identity-verified result bridge. Do not put GitHub tokens in Unity, Udon, PlayerData, a public repository, or a URL. Do not accept unverified browser-submitted totals as trusted game results.

## Publish reviewed data

Only import approved totals into `data/profiles.json`. Every record uses a stable `playerKey`, the current `displayName`, `progressionWins`, `championships`, `medals`, and `reviewed: true`. Never use an instance `playerId` or a display name as a global identity. Account IDs and private membership data belong in the external service, not the public feed.

Run `node --test build.test.mjs`, then `node build.mjs`. Publish only the `public` directory using GitHub Pages. Set `ArenaTopPlayersBoard.leaderboardFeed` to the resulting HTTPS `*.github.io/.../leaderboard.json` URL. `raw.githubusercontent.com` is not on VRChat's string-loading allowlist.

Until a feed is configured, the board labels its rankings **THIS INSTANCE** and uses existing saved stats of present players. It never labels these as global rankings. Network failures retain the last valid global snapshot with an offline warning. The board polls at most once every 5 minutes by default; it does not sync per frame or change game rewards.

## Preserve existing reward rules

The builder derives levels using 2 full-match wins per level before level 5, 3 wins before level 10, then 5 wins. Award eligibility stays in the existing GameManager: four starters, Medium/Hard CPUs for level progress, and at least three human starters for medals. Championships count eligible full-match wins with humans and/or CPUs. This package never awards wins itself or changes those rules.

New match rewards also require the standard numeric configuration: 4 balls, authored default speed (displayed as 9.1), 15 lives, 1 zombie, and first to 3 round wins. Custom numeric settings, including first to 1 or 2, award no level progress, championships, or medals. Free Zombie ON/OFF and Center Spin toggles are excluded from that numeric eligibility check. Eligibility is snapshotted at match start and replicated by the existing GameManager.

## Remaining activation work

1. Verify the GitHub Pages deployment and bind the published URL in Unity.
2. Connect identity verification and authenticated result reporting to the external service. Test repeat submissions, reconnects, renamed players, and different instances before claiming automatic global updates.
3. Test the feed in real VRChat with trusted URLs enabled by default, and upload the changed world after approval.
