# ODF-DAO

## Requirements

1. rust 1.64.0
2. solana 1.14.3
3. anchor 0.26.0

### 1. Install Dependencies

```bash=
yarn
```

### 2. Modify `Anchor.toml`

> wallet = "/Users/username/.config/solana/id.json" (use your own id.json path)

### 3. Build

```bash=
anchor build
```

### 4. Update `program_id`

Get the public key of the deploy key. This keypair is generated automatically so a different key is exptected:

```bash=
anchor keys list
odf_stake: GW65RiuuG2zU27S39FW83Yug1t13RxWWwHSCWRwSaybC
```

Replace the default value of `program_id` with this new value:

```toml
# Anchor.toml

[programs.localnet]
odf_stake = "EqYPUiDkbgZTRJkbuoaEX6PytqYyx8RMEvaGqs99fMcE"

...
```

```rust
// lib.rs

...

declare_id!("EqYPUiDkbgZTRJkbuoaEX6PytqYyx8RMEvaGqs99fMcE");

...
```

Build the program:

```bash=
anchor build
```

### 5. Test

```bash=
anchor test
```

### 6. Deploy

```bash=
# If the local network is deployed, the local network node needs to be started, Startup script: `solana-test-validator`

anchor deploy
...

Program Id: EqYPUiDkbgZTRJkbuoaEX6PytqYyx8RMEvaGqs99fMcE

Deploy success
```

## Appendix

### Install `anchor`

First, make sure that `anchor` is installed:

Install `avm`:

```bash=
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
...
```

Install latest `anchor` version:

```bash=
$ avm install 0.26.0
...
$ avm use 0.26.0
...
```

> If you haven't installed `cargo`, please refer to this [doc](https://book.solmeet.dev/notes/solana-starter-kit#install-rust-and-solana-cli) for installation steps.

### Verify the Installation

Check if Anchor is successfully installed:

```bash
$ anchor --version
anchor-cli 0.26.0
```
