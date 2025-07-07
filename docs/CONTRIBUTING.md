# Contributing to Skipper

Welcome, and thank you for considering contributing to **Skipper** — a DAO smart contract system on TON written in Tact.  
We appreciate all forms of contributions: code, issues, testing, feedback, and discussion.

---

## 📋 Ways to Contribute

### 🐛 Report Bugs

If you encounter unexpected behavior or a contract failure:

- Open a new [GitHub issue](https://github.com/supadupadao/skipper/issues/).
- Include:
  - What happened and what you expected
  - Steps to reproduce (ideally with links to testnet transactions)
  - Version of contract, compiler (`blueprint`), or environment details

---

### 💡 Propose a Feature

Got an idea to improve the protocol?

- Open an issue with the `enhancement` label.
- Describe your idea clearly: what's the use case, and how it fits into the DAO lifecycle.
- Feel free to discuss design trade-offs or partial implementations.

---

### 🧪 Write Tests

Tests are located in the `/tests` directory and run using [blueprint](https://github.com/ton-org/blueprint).

- To run tests:
```bash
blueprint test
```

- To check gas usage:
```bash
blueprint test --gas-report
```

Contributions that improve coverage or fix bugs in test logic are always welcome.

---

### 👨‍💻 Submit a Pull Request

If you'd like to fix a bug or add a feature:

1. Fork the repository
2. Create a feature branch
3. Write clean, tested code with comments
4. Submit a pull request with a clear title and description

---

## 🧼 Code Style & Principles

* Contracts should be clean, modular, and follow the logic-first philosophy of Tact.
* Use descriptive variable names and inline comments when logic isn't obvious.
* Keep test code as clear as production code.

---

## ❓ Questions?

If you’re unsure how to start, feel free to open a draft PR or a discussion — we’re happy to help you contribute.

You can also reach out in the TON community or via Telegram if the project has an official channel.

---

Thank you for helping build onchain governance on TON 🙏
