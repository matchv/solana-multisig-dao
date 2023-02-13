# Create token

This is a Typescript client code to create DEFN token

# Version

node --version  v18.12.1
tsc --version  Version 4.8.4
ts-node --version v10.9.1

# How to mint ODF token

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

# How to create instruction

1st, put your private key into ./token-management/keypairs/key-1.json file

2nd, fund the wallet with roughly 1 Sol

3rd, modify the amount of tokens you want to mint, and the recipient address you want to mint to

3rd, run "ts-node gen-instruction.ts"

4th, copy the instruction hex you see on the screen; copy the recipient ATA too

5th, enter them into the snowflake.so multisig wallet UI (this is the multisig mint authority) to mint tokens to a recipient.

Note that this recipient can be, and usually will be, another multisig wallet address such as airdrop wallet, referral reward wallet, etc.

From the UI, the wallet signers can further transfer tokens to individual recipients.

See the "custom action" screenshot - minting in our case, to enter the instructions and account information correctly.

./token-management/docs/snowflake-custom-action.jpeg

![snowflake custom action for multisi mint authority](./token-management/docs/snowflake-custom-action.jpeg?raw=true "Snowflake UI")

# Todo before production

- Create multisig wallet, set it as mint authority
- disable the freeze authority
- Modify `createMintToInstruction`, delete recipient and amount as they won't work any more if we set the mint authority to a multisig wallet, instead, all minting will go through the multisig wallet.

