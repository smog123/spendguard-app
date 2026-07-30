# Contributing to SpendGuard

Thank you for your interest in contributing! SpendGuard is a monitoring layer — it does not hold keys, sign transactions, or enforce policies. Keep that framing in mind when reviewing changes.

## Development Workflow

1. **Fork the repo** and create a feature branch from `main`.
2. **Run `npm install`** at the workspace root.
3. **Make your changes** following the coding standards below.
4. **Run typechecking and linting** before committing:
   ```bash
   npm run typecheck
   npm run lint
   ```
5. **Write tests** for new functionality. We use Vitest.
6. **Open a pull request** with a clear description of the change and its motivation.

## Coding Standards

- **TypeScript strict mode** is enabled in every `tsconfig.json`. No `any` without an inline comment justifying it.
- **React**: function components only, hooks not classes.
- **Indexer**: every async operation that touches the DB or RPC must have explicit error handling and structured logging (not bare `console.log`). This is a long-running service — silent failures mean silent data loss.
- **No secrets in code** or committed `.env` files. Use `.env.local` and hosting platform env vars only.

## Git Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `chore`, `docs`, `ci`, `refactor`, `test`, `style`.

Scopes: `sdk`, `indexer`, `web`, `workspace`, `docs`, `ci`.

Examples:
- `feat(indexer): add event poller with cursor persistence`
- `docs: write API documentation for webhook routes`

## Commit Rules

- Never `git add .`
- One commit per logical unit
- Push immediately after every commit

## Pull Request Process

1. Ensure the PR description explains **what** and **why**.
2. Reference any related issues.
3. A maintainer will review and may request changes.
4. Once approved, the PR will be squashed into `main`.

## Security Issues

Do not open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for reporting guidelines.
