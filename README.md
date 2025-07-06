# Skipper 🐧 – DAO Smart Contracts on TON

[![Build status](https://img.shields.io/github/actions/workflow/status/supadupadao/skipper/ci.yml?label=CI)](https://github.com/supadupadao/skipper/actions/workflows/ci.yml)
[![GitHub License](https://img.shields.io/github/license/supadupadao/skipper)](https://github.com/supadupadao/skipper/blob/master/LICENSE)
[![TON](https://img.shields.io/badge/blockchain-TON-0098EA)](https://ton.org)
[![Tact](https://img.shields.io/badge/lang-Tact-000000)](https://github.com/tact-lang/tact)
[![Work in progress](https://img.shields.io/badge/WORK%20IN%20PROGRESS-DO%20NOT%20USE%20IN%20PRODUCTION-ff0000)](https://github.com/supadupadao/jetton/issues)

Skipper is a **fully onchain DAO framework** built on the TON blockchain. It allows communities to create, manage, and govern decentralized treasuries using jetton-based voting power.

> ⚠️ This project is in active development. It is **not yet production-ready**.

---

## ✨ Features

* ✅ Fully onchain DAO logic with no offchain dependencies
* 🔒 Governance through locked jettons
* 🗳 Voting with quorum and majority rules
* ⚙️ Smart contract system written in [Tact](https://tact-lang.org)
* 🧪 Gas-efficient and testable via Blueprint
* 🌐 Web UI available: [dao.supadupa.space](http://dao.supadupa.space)

---

## 📦 Development

This is a standard [Tact Blueprint](https://github.com/ton-org/blueprint) project.

### Setup

```bash
npm i
```

Requires Node.js **v22+**.

### Commands

| Command                      | Description                         |
| ---------------------------- | ----------------------------------- |
| `npm run build`              | Compile all contracts               |
| `npm test`                   | Run unit tests                      |
| `npx blueprint run <script>` | Run a script from `scripts/` folder |

---

## 🧪 Scripts

See [`DEPLOY.md`](DEPLOY.md) for full CLI deployment guide.

Useful scripts:

* `deployMinter` – deploys DAO Minter contract
* `deploySkipper` – deploys Skipper instance (requires `JETTON_MASTER_ADDRESS`)

Some early testing scripts (`lockJettons`, `voteProposal`, `newProposal`) are deprecated — use the Web UI instead.

---

## 📚 Documentation

Docs are available in the GitBook:

* [docs.supadupa.space/skipper](https://docs.supadupa.space/skipper)

Or browse inline docs:

* [Governance Principles](docs/GOVERNANCE.md)
* [Architecture](docs/ARCHITECTURE.md)
* [Contributing Guide](docs/CONTRIBUTING.md)
* [Deployment Guide](docs/DEPLOY.md)

---

## 🤝 Contributing

We welcome any contributions: code, issues, documentation, UI, feedback.
Star the repo ⭐ or drop in with a suggestion!

See [`CONTRIBUTING.md`](docs/CONTRIBUTING.md) for how to get started.

---

## 📄 License

[GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html)
