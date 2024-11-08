# Skipper 🐧

ℹ️ Fully decentralized application for DAO managing on TON blockchain using governance tokens (jettons).

⚠️ <b>Warning! Work in progress!</b> Development of this project is not done!

❤️ I'll be very grateful for any kind of contribution: code, docs, issues, bug reports, github stars or whatever

<!-- # Deploy TODO -->

# Development

This is default Tact blueprint project with default commands:

- `npm run build` - build project and compile contracts
- `npm test` - run contracts tests
- `npx blueprint run` - execute script from `/scripts` directory

# Docs

## Contracts

<b>TODO!</b>

## Creating proposal

```mermaid
graph TD;
    User[User TON wallet];
    JettonLock[Jetton lock];
    Skipper[DAO main contract];
    Proposal[Proposal instance];
    Voter[Voter for proposal];

    User -- 0x690101<0x690201> --> JettonLock;
    JettonLock -- 0x690102<0x690201> --> Skipper;
    Skipper -- 0x690201 --> Proposal;
    Proposal -- 0x690301 --> Voter;
```

## Voting in proposal

```mermaid
graph TD;
    User[User TON wallet];
    JettonLock[Jetton lock];
    Skipper[DAO main contract];
    Proposal[Proposal instance];
    Voter[Voter for proposal];

    User -- 0x690101<0x690402> --> JettonLock;
    JettonLock -- 0x690102<0x690402> --> Skipper;
    Skipper -- 0x690402 --> Voter;
    Voter -- 0x690302 --> Proposal;
```
