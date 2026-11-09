# Svátky — průběžná oprava na TEST

Source/current handoff: deployment/RENDERER-HANDOFF.md + renderer-allowlist.json. New native workflow Save / Copy / Preview supersedes historical Generate controller and historical GET-only Copy. No runtime activation claimed by source/CI.

Main coordinator → sole Server executor completes current TEST build, exact preimages/CAS/lock/rollback/headroom and activation. No production change or RC. Ready app need not wait for every other application. Apply narrow owned frontend/format helpers; retain all unrelated current V3/security/cache code. Never overwrite a whole historical config or Profiles carrier.

Shared controller saved-copy-preview + confirmed Save hook are required. Generic per-app recovery helper f928ec16 or compatible descendant enables the native adapter capability. If absent, deploy normal UI independently with explicit limitation that draft protection is not active; do not claim silent local recovery. No credentials/URLs in app recovery, no private API/profile fallback.

Only targeted technical checks; actual functional acceptance is performed by user. User can check Save updates existing output, first Copy creates from saved configuration, subsequent Copy preserves URL without update, Preview opens current draft in a new tab, no Generate/manual browser-save control, and format/orientation matches expected preview. No automated browser/provider campaign is authorized by this handoff. Report TEST configuration URL and confirmed release ID after real activation. Full anonymous publication URL acceptance must not be invented from a source pin.
