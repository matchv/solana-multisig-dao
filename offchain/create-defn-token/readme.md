# Create token

This is a Typescript client code to create DEFN token

# Version

node --version  v18.12.1
tsc --version  Version 4.8.4
ts-node --version v10.9.1

# How to use

1st, Put your Solana wallet secret key into a `secretKey.json` file, 

[1, 2, 3, ...] 

2nd, run

```
yarn install

```

3rd, run

```
ts-node mint.ts

```
You will mint 10^9 ( 1 billion ) the publick key associate with the secret key

# Todo before production

- Create multisig wallet, set it as mint authority
- set "null" to be the freeze authority
- Modify `createMintToInstruction`, delete recipient and amount as they won't work any more if we set the mint authority to a multisig wallet, instead, all minting will go through the multisig wallet.

