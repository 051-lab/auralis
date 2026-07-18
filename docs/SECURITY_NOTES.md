# Security Notes

## Dependency Review - 2026-07-10

- Auralis was upgraded to Next.js 16.2.10 and ESLint 9.
- `npm audit --omit=dev` reports no high or critical vulnerabilities.
- Two moderate findings remain in the PostCSS version bundled through Next.js. The reported advisory is `GHSA-qx2v-qp2m-jg93`.
- npm does not currently offer a safe in-range remediation. `npm audit fix --force` proposes downgrading to Next.js 9.3.3, which is incompatible with this application and must not be used.
- Re-run the audit when Next.js publishes a dependency update that resolves the advisory.

## Release Practice

- Keep `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` as required release gates.
- Review dependency updates deliberately; do not force major downgrades to produce an empty audit report.
- Auralis has no backend or credential-bearing runtime path. Keep local environment files and generated recordings out of source control.
