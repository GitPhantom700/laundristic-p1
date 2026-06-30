# Security Policy

## Supported versions

Laundristic ships from `main`; the latest released build is the only supported
version. Fixes land on `main` and are deployed from there.

| Version         | Supported |
| --------------- | --------- |
| latest (`main`) | ✅        |
| older tags      | ❌        |

## Threat model (what to keep in mind)

Laundristic is a **local-first** Progressive Web App:

- All data and photos live in the browser's IndexedDB **on the user's device**.
  There is **no backend, no account system, and no cloud sync** — data is never
  transmitted to a server by the app.
- The deployed app is a static bundle served over HTTPS. The main security
  surface is therefore client-side: the dependency supply chain, the service
  worker / cache behaviour, and the export/import (ZIP) code path.
- Because data never leaves the device, the most sensitive user asset is the
  on-device store and any exported backup file the user chooses to share.

## Reporting a vulnerability

Please **do not open a public issue** for security reports.

Use GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** (Private vulnerability reporting / GitHub
   Security Advisories).

Include, where possible: affected version/commit, a description of the issue,
reproduction steps, and the potential impact.

We aim to acknowledge reports within a few days, keep you updated on progress,
and credit reporters who wish to be named once a fix is released.
