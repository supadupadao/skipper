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

## Exit codes

[Standard Tact exit codes](https://docs.tact-lang.org/book/exit-codes)

Skipper uses custom exit codes for identifying non standard errors. It always 4 digit decimal code with following structure: `69XX` where 69 is prefix for every error and XX is unique number for each error.

<table>
    <tr>
        <th>Code</th>
        <th>Description</th>
    </tr>
    <tr><td colspan=2>Tact lang exit codes:</td></tr>
    <tr>
        <td>132</td>
        <td>
            Invalid owner of contract.</br><i>Occurs when contract receives message not from owner address.</i>
        </td>
    </tr>
    <tr><td colspan=2>Custom exit codes:</td></tr>
    <tr>
        <td>6901</td>
        <td>No enoght TON in message.</td>
    </tr>
    <tr>
        <td>6902</td>
        <td>Unlock date is not arrived.</br><i>Occurs on trying to unlock jettons before unlock date.</i></td>
    </tr>
    <tr>
        <td>6903</td>
        <td>No enough votes.</br><i>Occurs when trying to execute proposal that has no enough votes.</i></td>
    </tr>
    <tr>
        <td>6904</td>
        <td>Too many "no" votes.</br><i>Occurs when trying to execute proposal that has too many "no" votes.</i></td>
    </tr>
    <tr>
        <td>6905</td>
        <td>Not initialized.</br><i>Occurs when trying to interact with contract that has not been initialized.</i></td>
    </tr>
    <tr>
        <td>6906</td>
        <td>Already initialized.</br><i>Occurs when trying to initialize contract that has been already initialized (to avoid double initialization).</i></td>
    </tr>
    <tr>
        <td>6907</td>
        <td>Proposal expired.</br><i>Occurs when trying to vote in expired proposal.</i></td>
    </tr>
    <tr>
        <td>6908</td>
        <td>Proposal executed.</br><i>Occurs when trying to vote in executed proposal.</i></td>
    </tr>
    <tr>
        <td>6909</td>
        <td>Proxy opcode not found.</br><i>Occurs when trying to send unknown proxy body to Skipper contract.</i></td>
    </tr>
</table>

## Contracts interaction

### Lock tokens

```mermaid
sequenceDiagram
    actor wallet as User TON wallet
    participant jetton as Governance token

    create participant lock as Jetton lock
    wallet ->> lock: Deploy
    wallet ->> jetton: 0x0f8a7ea5<br/>(JettonTransfer)
    activate jetton
    Note over jetton: Send tokens to lock address
    Note over jetton: Notify lock about transfer
    jetton ->> lock: 0x7362d09c<br/>(JettonTransferNotification)
    deactivate jetton
    activate lock
    Note over lock: Save transfered amount
    deactivate lock
```

### Create new proposal

```mermaid
sequenceDiagram
    actor wallet as User TON wallet
    participant lock as Jetton lock
    participant dao as DAO

    wallet ->> lock: 0x690101<br/>(SendProxyMessage)<br/>with body<br/>0x690401<br/>(RequestNewProposal)
    activate lock
    Note over lock: Pass proxied body to DAO
    lock ->> dao: 0x690102<br/>(ProxyMessage)<br/>with body<br/>0x690401<br/>(RequestNewProposal)
    deactivate lock
    activate dao
    Note over dao: Deploy proposal contract with next proposal_id
    create participant proposal as Proposal
    dao ->> proposal: 0x690201<br/>(InitProposal)
    deactivate dao
    activate proposal
    Note over proposal: Deploy voter contract with user address
    create participant voter as Voter
    proposal ->> voter: 0x690301<br/>(InitVoter)
    deactivate proposal
    activate voter
    Note over voter: Save voted amount of tokens
    deactivate voter
```

### Vote for existing proposal

```mermaid
sequenceDiagram
    actor wallet as User TON wallet
    participant lock as Jetton lock
    participant dao as DAO
    participant voter as Voter
    participant proposal as Proposal

    wallet ->> lock: 0x690101<br/>(SendProxyMessage)<br/>with body<br/>0x690402<br/>(VoteForProposal)
    activate lock
    Note over lock: Pass proxied body to DAO
    lock ->> dao: 0x690102<br/>(ProxyMessage)<br/>with body<br/>0x690402<br/>(VoteForProposal)
    deactivate lock
    activate dao
    Note over dao: Send actual votes amount to proposal's voter
    dao ->> voter: 0x690302<br/>(UpdateVoterBalance)
    deactivate dao
    activate voter
    Note over voter: Compute new tokens amount as (new - previous)
    Note over voter: Send new value to proposal
    voter ->> proposal: 0x690202<br/>(UpdateVotes)
    activate proposal
    deactivate voter
    Note over proposal: Update votes amount
    deactivate proposal
```
