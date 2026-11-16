# Project file fixtures

`project-v1.mateo` is a project file written by schema version 1 (app version `0.1.0-test`,
through the SQLite WebAssembly adapter). It holds the sample project of
`src/testing/harness.ts`: one linguistic scale, one dataset with crisp, TFN and linguistic
cells, a setting, a stored analysis with its snapshot, a labelled snapshot, a source file and
an import profile.

**Never regenerate or edit this file.** Its purpose is to be exactly what an old version of
Mateo wrote, so that `src/schema/migrations.test.ts` keeps proving that such files still open.

When a migration is added, also add a fixture written by the previous schema version
(`project-v2.mateo` just before version 3 is introduced, and so on) and extend the test.
