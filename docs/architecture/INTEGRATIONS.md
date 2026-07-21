# Health Platform Integrations — design notes (build target: v1.2)

> Not in v1.0. Documented early because it constrains library choices (see ADR-001).

## Targets

| Platform | Devices | Library candidate |
|---|---|---|
| Google Health Connect | Samsung, Pixel (Android) | react-native-health-connect |
| Apple HealthKit | iPhone | react-native-health / @kingstinct/react-native-healthkit |
| Samsung Health | Samsung | via Health Connect (Samsung writes to it) |

## Data exchange (planned)

- **Write:** consumed kcal + macros (per meal), body weight (v1.1 body metrics), workouts (v1.1).
- **Read:** activity energy, steps, weight from connected trackers — solves the "how active am I?" problem with real data instead of questionnaires.

## Notes

- Requires Expo dev-client builds (native modules) — the moment we leave pure Expo Go.
- Health data never leaves the device except what the user logs in Macrio itself; platform reads are used for on-device display/goal adjustment. Revisit privacy policy at v1.2.
