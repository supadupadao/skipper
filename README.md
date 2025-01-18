# Skipper 🐧

[![Build status](https://img.shields.io/github/actions/workflow/status/supadupadao/skipper/contracts.yml?label=CI)](https://github.com/supadupadao/skipper/actions/workflows/contracts.yml)
[![GitHub License](https://img.shields.io/github/license/supadupadao/skipper)](https://github.com/supadupadao/skipper/blob/master/LICENSE)
[![TON](https://img.shields.io/badge/blockchain-TON-0098EA)](https://ton.org)
[![Tact](https://img.shields.io/badge/lang-Tact-000000)](https://github.com/tact-lang/tact)
[![Work in progress](https://img.shields.io/badge/WORK%20IN%20PROGRESS-DO%20NOT%20USE%20IN%20PRODUCTION-ff0000)](https://github.com/supadupadao/jetton/issues)

ℹ️ Fully decentralized application for DAO managing on TON blockchain using governance tokens (jettons).

⚠️ <b>Warning! Work in progress!</b> Development of this project is not done!

❤️ I'll be very grateful for any kind of contribution: code, docs, issues, bug reports, github stars or whatever

# Development

This is default Tact blueprint project with default commands:

-   `npm run build` - build project and compile contracts
-   `npm test` - run contracts tests
-   `npx blueprint run` - execute script from `/scripts` directory

# Docs

[Our gitbook](https://docs.supadupa.space/skipper):

-   [Read our architecture document](docs/ARCHITECTURE.md)
-   [Read our contributing guideline](docs/CONTRIBUTING.md)

# Development

## Prerequisites

To work with project locally you will need [Node.js](https://nodejs.org/en) version 22+. Clone this repo and run the following command to install dependencies

```
npm i
```

## How to build contract

The following command will compile contract source code. TVM byte code files will be stored in `build/` directory.

```
npm run build
```

## All allowed commands

-   `npm run build` - build project and compile contracts
-   `npm test` - run contracts tests
-   `npx blueprint run` - execute script from `/scripts` directory

# License

[GNU GENERAL PUBLIC LICENSE 3.0](https://www.gnu.org/licenses/gpl-3.0.html)
