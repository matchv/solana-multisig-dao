# Multisig

A multisig program to execute arbitrary Solana transactions.

This program can be used to allow a multisig to govern anything a regular
Pubkey can govern. Use the multisig as a BPF program upgrade
authority, a mint authority, etc.

To use, first create a `Multisig` account, specifying two important
parameters:

1. Owners - the set of addresses that sign transactions for the multisig.
2. Threshold - the number of signers required to execute a transaction.

In the context of administrating token minting:

Once the `Multisig` account is created, set it as the minting authority of your token mint (ODF).

Then create a `Transaction` account, specifying the parameters for a normal solana transaction, e.g. whom you want to mint token to. `mint_to(recipient, amount)`

To sign, owners should invoke the `approve` instruction, and finally,
the `execute_transaction`, once enough (i.e. `threshold`) of the owners have
signed.

### Build

```bash
anchor build --verifiable
```

The `--verifiable` flag should be used before deploying so that your build artifacts
can be deterministically generated with docker.

### Test

```bash
anchor test
```

### Verify

To verify the program deployed on Solana matches your local source code, install
docker, `cd programs/multisig`, and run

```bash
anchor verify <program-id | write-buffer>
```
