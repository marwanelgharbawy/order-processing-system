# GitHub Actions

The workflow is already configured in `.github/workflows/tests.yml`. No local MySQL installation or GitHub database secrets are needed.

## First run

1. Commit and push the application changes, tests, and workflow together. The workflow depends on the updated schema and backend.
2. Open the repository on GitHub and select **Actions**.
3. Open **Bookstore tests**, then select the latest run and its **test** job.
4. Expand a step to see its output. Green means that step passed; red means it failed. A queued or running result is not a pass yet.

The workflow runs on pushes and pull requests. After the file is on the default branch, you can also select **Bookstore tests > Run workflow** to start a manual run. If GitHub says Actions are disabled, enable them under repository **Settings > Actions > General**.

## What runs

1. GitHub prepares an Ubuntu machine and a temporary MySQL 8.4 service.
2. It checks out the code, installs Node.js 24, and runs `npm ci`.
3. `npm test` runs the 18 existing API and frontend checks without relying on MySQL.
4. The MySQL client inside the service imports the actual schema, seed data, and triggers.
5. `npm run test:mysql` runs six real-database tests covering prices/history, rollback, automatic/manual restocking, concurrent purchases, stock protection, and SQL reports.

The database is discarded when the job finishes. The workflow only reads the repository and runs tests; it does not deploy the application or push commits. Its published password is for this disposable test service only.

## If a run fails

Open the first failed step and read the error. An import error points to SQL setup; a failed test names the behavior whose assertion failed. Fix the problem and push another commit to start a new run. Use **Re-run failed jobs** for a temporary service/network failure rather than changing code unnecessarily.

Until the first GitHub run completes, the real-MySQL checks are configured but not verified. A passing run proves the covered scenarios; it does not establish every possible behavior or production readiness. Existing-data migration still has local database-double coverage, not a real legacy-database test in this workflow.

## Optional local run

`npm test` continues to work without MySQL. The integration suite requires a disposable local database with the supplied SQL files imported, the DB environment variables, and `CI_MYSQL_TEST=true`. It modifies sample rows and should never be pointed at data you need to keep. No integration test runs implicitly as part of `npm test`.

References: [GitHub service containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/use-docker-service-containers) and [Node.js workflows](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs).
