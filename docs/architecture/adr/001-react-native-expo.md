# ADR-001: React Native (Expo) for the mobile app

- Status: accepted · 2026-07-21

## Context

One codebase must run on Samsung/Pixel (Android) and iPhone (iOS). Candidates: React Native vs Flutter.

## Decision

React Native with Expo (managed workflow, TypeScript).

## Reasons

1. **Health integrations:** mature, stable RN libraries exist for Google Health Connect, Samsung Health, and Apple HealthKit (planned v1.2) because RN uses real native building blocks.
2. **Future web version:** open-source contributors will likely want a web dashboard; React Native for Web makes code reuse realistic, Flutter web is heavier and less adopted.
3. **AI-assisted development:** the project is vibe-coded with AI tooling; JavaScript/TypeScript is the best-documented ecosystem, so AI code generation is measurably stronger than for Dart/Flutter.
4. **Contributor pool:** an open-source project attracts more JS/TS contributors than Dart.
5. **Expo specifically:** fast iteration via Expo Go on the founder's phone (chosen test method), EAS for store builds later, camera/barcode modules available (`expo-camera`).

## Consequences

- Native module needs beyond Expo's SDK require dev-client builds (acceptable; health sync in v1.2 will need this).
- Flutter's custom-design strengths are traded away; standard RN UI is sufficient for our design language.
