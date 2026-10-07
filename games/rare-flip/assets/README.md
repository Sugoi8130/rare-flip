# Approved artwork in the playable game

`approved-artwork.png` is the user-approved room/coin/button reference. The renderer crops its coin and button artwork at runtime and animates those separate interactive elements.

`arcade-room.png` is the clean room layer, made with the built-in image generation tool. The playable Friend is read from FriendSDK and drawn separately. No fixed character, floating coin or fixed balance is embedded in this layer. Table foreground occlusion and floor collision use the room geometry.

## Final clean-room edit prompt

Precise production game asset edit. Keep the attached image dimensions 1672x941 and exact room geometry and pixel artwork. Remove ONLY the large floating gold coin and its surrounding sparkles above the center table, the black/white player character below the table, the entire top-right balance HUD rectangle (reconstruct matching wall artwork behind it), and the complete bottom UI panel below y=708 (replace with plain dark purple #10051f). Reconstruct the table surface behind the removed coin and carpet behind removed character impeccably with matching pixel pattern. Preserve every other room element and location exactly, especially the center red/gold table, ropes, cabinets, plants, floor tiles and banners. This is a clean background game layer, NO player, NO floating coin, NO text, NO UI. Crisp pixel artwork unchanged. Do not redesign or shift objects.

## Verification

`pnpm test` checks movement, collision, pause, interactive UI, mobile controls and economy. `node scripts/capture-play.mjs` captures the actual locally running FriendSDK preview, uses read-only wallet/art fixtures and completes a simulated flip. Its screenshots are saved to `outputs/rare-flip-live-*.png`.
