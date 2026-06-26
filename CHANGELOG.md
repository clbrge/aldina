# Changelog

All notable changes to Aldina are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · Versioning: [SemVer](https://semver.org/).

## [Unreleased]

## [0.1.0] — Initial public package

### Added
- Initial repository scaffold: the output-flow driver (`src/aldina.js`), `src/compose.js`, role
  assignment (`src/assign/`), the gate harness (`src/harness/validate.js`), base roles/grammar/constraints,
  and the `oxford` base theme. See `PIPELINE.md` for the two flows and `LICENSING.md` for the
  dual-license terms.
- npm publishing flow: `publishConfig` with provenance, `release-it` config (CHANGELOG-gated
  bump, tag, GitHub Release), and GitHub Actions for lint/test and OIDC trusted publishing.
