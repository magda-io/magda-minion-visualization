# 2.1.0

- Upgrade to Node.js 22: the docker image now uses `node:22-alpine` (was `node:14-alpine`), and CI uses Node.js 22
- Upgrade GitHub Actions (checkout, setup-node, setup-qemu & setup-buildx) to current versions

# 2.0.0
- Upgrade to node14
- Upgrade to typescript 4, webpack 5
- Use `node-fetch` for all network requests
- Added test cases
- Set webhook config `dereference` = false
- Release all artifacts to GitHub Container Registry (instead of docker.io & https://charts.magda.io)

# 1.0.0

-   Upgrade dependencies
-   Upgrade CI scripts
-   Related to https://github.com/magda-io/magda/issues/3229, Use magda-common for docker image related logic
