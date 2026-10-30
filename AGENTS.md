# Flip Layer Website Agent Directives & Vault Synchronization

> **RULE**: This workspace uses an Obsidian vault (`Flip layer website/`) for persistent memory, design history, and change logs.

## Mandatory Workflow for Every Request

1. **Automatic Pre-Turn Vault Lookback**:
   - Before editing or generating code for the website (`index.html`, `app.js`, `styles.css`, `fx.js`, etc.), you MUST inspect `Flip layer website/AGENT.md` (and any related notes in the vault).
   - Review past changes, architectural invariants, and previous user specifications.

2. **Execution**:
   - Apply clean, functional code changes strictly adhering to the context established in the vault.

3. **Mandatory Post-Turn Ledger Update**:
   - Immediately after applying adjustments to website files, update `Flip layer website/AGENT.md`.
   - Append an entry to `Change & Adjustment Log` with:
     - Timestamp
     - Operator Request
     - Files Modified
     - Specific Adjustments Made
     - Invariants / Rules to uphold for future turns
