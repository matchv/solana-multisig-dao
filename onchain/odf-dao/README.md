# ODF-DAO

## Requirements

1. rust 1.64.0
2. solana 1.14.3
3. anchor 0.25.0

## Build

```bash=
anchor build
```

### Test

```bash=
anchor test
```

### Deploy

#### get program id

```bash=
solana address -k  target/deploy/odf_dao-keypair.json
```

#### Replace program id from Cargo.toml and programs/odf-dao/src/lib.rs

```bash
anchor build
anchor depoly
```
