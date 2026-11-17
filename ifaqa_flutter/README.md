# ifaqa_flutter

The Flutter version of إفاقة. Conversion progress is tracked in
[CONVERSION_STATUS.md](CONVERSION_STATUS.md).

## Testing against local Firebase emulators

Signed-in features (clans, events, chat, admin) can be tried without touching
production data:

```bash
firebase emulators:start --only auth,firestore --project elhenawy-lap
```

with the Auth emulator on port 9099 and Firestore on 8085, then run the app with
`--dart-define=USE_FIREBASE_EMULATOR=true` (the `ifaqa-flutter-emulator` entry
in `.claude/launch.json`).

Test account for the emulator only (create it from the app's sign-up screen;
emulator data is wiped when the emulator stops):

- email: `tester1@ifaqa.test`
- password: `EmuTest-4821`
