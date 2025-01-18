# Skipper 🐧

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
