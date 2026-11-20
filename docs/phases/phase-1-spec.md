# Phase 1 — PRD-0 / Test Contract 1.0

Source: https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW (read 2026-11-20).
Phase 2–4 were locked at inspection. No later ticket is assumed.

Acceptance: one 3D third-person island, five lanterns, movement/jump/camera,
collect/deposit motes, pursuing shades, costly repelling pulse, safe lantern zones,
win/loss, score, HUD and restart. Headless runs the same simulation at 60 Hz.

Assumptions: flames are health and pulse resource; pulse costs one flame. Deposit
is instantaneous on interaction rising edge. Closest unlit lantern receives up to
its remaining cost. Horizontal distances are inclusive. The island clamps at radius
38m; falling is disabled. Hit loss is floor(carried * ratio); dropped motes are lost.
Time bonus is floored seconds, granted only on victory. No setup events or score.
When multiple terminal conditions coincide: no flames, then all lit, then dawn.
Motes respawn every 120 ticks if random spawning enabled; shades every 300 ticks.

Validation plan: test movement/yaw/clock, capacity/radius, deposits/edges, victory,
damage/invulnerability, pulse/stun/push/cooldown, safe zone, jump, dawn, deterministic
simulation and CLI output/error codes. Verify browser rendering and production build.

Scope: Node + Three.js + Vite. Single shared core; renderer reads state. No backend.
Risk: macOS/Linux execution requires independent confirmation; local host is Windows.
