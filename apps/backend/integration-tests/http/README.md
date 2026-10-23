# Integration Tests

The `medusa-test-utils` package provides utility functions to create integration tests for your API routes and workflows.

For example:

```ts
import { medusaIntegrationTestRunner } from "medusa-test-utils"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("Custom endpoints", () => {
      describe("GET /store/custom", () => {
        it("returns correct message", async () => {
          const response = await api.get(
            `/store/custom`
          )
  
          expect(response.status).toEqual(200)
          expect(response.data).toHaveProperty("message")
          expect(response.data.message).toEqual("Hello, World!")
        })
      })
    })
  }
})
```

Learn more in [this documentation](https://docs.medusajs.com/v2/debugging-and-testing/testing-tools/integration-tests).

## Running the buyer journey checks

From the repository root, run `corepack pnpm test` (all configured tests) or
`corepack pnpm test:integration:http` (the Medusa HTTP suites). These suites
create and drop temporary PostgreSQL databases, so start a local PostgreSQL
server with a role that can create databases first. The Medusa test runner
uses `DB_HOST` (default `localhost`), `DB_PORT` (default `5432`),
`DB_USERNAME` (default `postgres`), and `DB_PASSWORD` to connect; it does
not use the app's `DATABASE_URL` for its temporary databases. For example,
with a local `runner` superuser:

```sh
DB_HOST=localhost DB_USERNAME=runner corepack pnpm test:integration:http
```

Use `localhost` for a local server: this Medusa test runner enables SSL for
non-local hostnames. Tests do not write to the development database.