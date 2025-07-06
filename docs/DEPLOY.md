# Deployment Guide

This guide describes how to deploy and interact with the Skipper smart contracts using Blueprint scripts.

> All commands use `npx blueprint` and are executed from the root of this repo.

---

## 📂 Script Directory

All deployment and interaction scripts are located in:

```
scripts/
```

Use the following command to run any script:

```
npx blueprint run <script-name>
```

---

## 🧱 Scripts Overview

### 1. `deployMinter`

> Deploys the DAO minter contract.

This contract is used to deploy **Skipper** instances dynamically. It is a prerequisite for launching any DAO.

```bash
npx blueprint run deployMinter
```

---

### 2. `deploySkipper`

> Deploys a new Skipper instance.

Requires an environment variable `JETTON_MASTER_ADDRESS` to be set:

```bash
JETTON_MASTER_ADDRESS=EQ... npx blueprint run deploySkipper
```

This deploys the Skipper root contract for your DAO, linked to a specific governance jetton.

---

### 3. `lockJettons` ⚠️ *(Deprecated)*

> Sends jettons to a Lock contract address.

```bash
JETTON_MASTER_ADDRESS=EQ... npx blueprint run lockJettons
```

**Note:** This script may not work with all Jetton implementations. It was used for early testing.
We recommend using the [Web UI](http://dao.supadupa.space) instead.

---

### 4. `newProposal` ⚠️ *(Deprecated)*

> Creates a mock proposal using a hardcoded `proposalId`.

Used during early-stage development to test proposal flows.

```bash
npx blueprint run newProposal
```

🔁 Prefer using the Web UI for proposal creation.

---

### 5. `voteProposal` ⚠️ *(Deprecated)*

> Casts a vote (hardcoded YES/NO) on a specific hardcoded `proposalId`.

```bash
npx blueprint run voteProposal
```

Used for testing vote logic. Parameters are hardcoded inside the file.

✅ Use [Web UI](http://dao.supadupa.space) for real voting interactions.

---

## 🌐 Web UI

Skipper DAO includes a dedicated frontend developed in a separate repo:

* GitHub: [supadupadao/wheelhouse](https://github.com/supadupadao/wheelhouse)
* Live: [dao.supadupa.space](http://dao.supadupa.space)

Use the UI for:

* Locking jettons
* Creating proposals
* Voting
* Exploring DAO activity

---

For questions or issues, feel free to open a GitHub issue or contribute to the Web UI repo.

Happy deploying 💫
