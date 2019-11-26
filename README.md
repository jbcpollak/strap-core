strap
------

[![codecov](https://codecov.io/gh/6RiverSystems/strap-core/branch/develop/graph/badge.svg?token=lszvEfvrm8)](https://codecov.io/gh/6RiverSystems/strap-core) [![CircleCI](https://circleci.com/gh/6RiverSystems/strap-core.svg?style=svg&circle-token=f2b27454c7157c723a8019585b9832dd64e7f0d4)](https://circleci.com/gh/6RiverSystems/strap-core)

Bootstrap script for provisioning developer machines.

## Development
- `npm install`
- `npm start`
- <http://localhost:5000>

To build and run the app in production:
- `npm run start:prod`
- <http://localhost:5000>

To run an HTTPS proxy in front of the app:
- `npm start`
- in another terminal session: `npm run proxy`
- <https://localhost:3000>

To run tests once:
- `npm run test:single`

To run tests and re-run on changes:
- `npm test`

To lint:
- `npm run lint`

To build:
- `npm run build`

## Usage

To run the web application locally run:
```bash
git clone https://github.com/6RiverSystems/strap-core
cd strap-core
npm install
# Setup config.json5
GITHUB_KEY="..." GITHUB_SECRET="..." npm start
```

### Web Application Environment Variables
#### Required
- `GITHUB_KEY`: GitHub application client ID
- `GITHUB_SECRET`: GitHub application client secret
- `ARTIFACTORY_TOKEN`: API key of an Artifactory administrator account
- `ARTIFACTORY_URL`: base URL of the hosted Artifactory instance, i.e. `https://foo.jfrog.io/foo/` (include trailing slash)

#### Optional
- `PORT`: the port to run the application on, defaults to `5000`
- `SESSION_SECRET`: secret token to use for sessions, defaults to a randomly generated token
- `LOG_LEVEL`: `trace`, `debug`, `info`, `warn`, `fatal`, or `silent`, defaults to `info`

## Resources
- [@octokit/rest docs](https://octokit.github.io/rest.js/)
- [@octokit/rest repo](https://github.com/octokit/rest.js)
- [GitHub API docs](https://developer.github.com/v3/)
- [NestJS docs](https://docs.nestjs.com/)
- [NestJS Examples](https://github.com/nestjs/nest/tree/master/examples)
- [Jest Docs](https://facebook.github.io/jest/docs/en/getting-started.html)
