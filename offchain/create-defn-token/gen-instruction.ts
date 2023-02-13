/* 
* the purpose of this code is to generate a transaction identifier hex,
* the app scenario is that you create a snowflake multisig safe as your token mint authority
* whenever you want to mint tokens
* you run this script in local computer
* it will generate a hex code representation of your intended transaction
* you then copy the hex from the console
* paste it to your snowflake.so multisig wallet to create a mint transaction
* other signers can approve or reject it accordingly
*/

import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  Signer,
} from "@solana/web3.js";
import {
  createMintToCheckedInstruction,
  createMintToInstruction,
  mintToChecked,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

// put a small amount of token in this wallet
// need to fund the creation of ATA for the recipient
// if ATA already exist, no fee will be incurred
import payerSecret from '../token-management/keypairs/key-1.json';


(async () => {
  // connection
  // change to mainnet upon production
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // const endpoint = 'https://metaplex.devnet.rpcpool.com/'; 
  // const connection = new Connection(endpoint);

  // 5YNmS1R9nNSCDzb5a7mMJ1dwK9uHeAAF4CmPEwKgVWr8
  // const feePayer = Keypair.fromSecretKey(
  //   bs58.decode(
  //     "588FU4PktJWfGfxtzpAAXywSNt74AvtroVzGfKkVN1LwRuvHwKGr851uH8czM5qm4iqLbs1kKoMKtMJG4ATR7Ld2"
  //   )
  // );

  // // G2FAbFQPFa5qKXCetoFZQEvF9BVvCKbvUZvodpVidnoY
  // const alice = Keypair.fromSecretKey(
  //   bs58.decode(
  //     "4NMwxzmYj2uvHuq8xoqhY8RXg63KSVJM1DXkpbmkUY7YQWuoyQgFnnzn6yo3CMnqZasnNPNuAT2TLwQsCaKkUddp"
  //   )
  // );

  // const another = Keypair.fromSecretKey(
  //   bs58.decode(
  //     "3o8iDeSV5cjTRZQ8Ahr3pK6GfwWso3bBD7mrm8BP6JFe9Lwc4C8WLcqEnE6HCJ9zWWCMRSQXrpVgDqL4WX4N7fJK"
  //   )
  // );

  // need payer to create ATA
  // 
  const payer = Keypair.fromSecretKey(new Uint8Array(payerSecret));


  // generate random signers as placeholder
  // as we just want to generate the tx identifier hex
  // as long as the number of 
  const randSigner1 = Keypair.generate();
  const randSigner2 = Keypair.generate();
  const randSigner3 = Keypair.generate();


  // token mint pubkey
  // put your token mint here
  const tokenMintPubkey = new PublicKey(
    "F7VUqa72ZkiWijwZcTRpwUMNdD7S2fyrBFfxDXWcyDSe"
  );

  // recipient pub key
  // put your recipient wallet pub key here, could be a pub key of multis wallet
  const recipientPubkey = new PublicKey(
    "7tBtPbbhd5FRmPoqntDrg26G249BePLQNFSmh9xBYjQi"
    );

  // the recipient's ata pubkey associated token account 
  // hardcoded version
  // can use arbitrary address, doesn't change the tx hex
  
  // const recipientATA = new PublicKey(
  //   "BzQbe8VWo4BL9t6SH9QKGK9y2Qu17339HdRw5PZ3Qstf"
  // );


  const recipient_ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    tokenMintPubkey,
    recipientPubkey
  )
  
  const recipientATA = new PublicKey(recipient_ata.address.toBase58());

  console.log("recipient ATA is: " + recipientATA);

  // mint authority pubkey
  const mintAuthorityPubkey = new PublicKey(
    "F2uU54ezT6HMMKTKuVgTsZJt3AL15sch54aP9qywVDo3"
  );

  // 1) use build-in function
  // {
  //   let txhash = await mintToChecked(
  //     connection, // connection
  //     feePayer, // fee payer
  //     mintPubkey, // mint
  //     tokenAccountPubkey, // receiver (sholud be a token account)
  //     alice, // mint authority
  //     1e8, // amount. if your decimals is 8, you mint 10^8 for 1 token.
  //     8 // decimals
  //   );
  //   console.log(`txhash: ${txhash}`);

  //   // if alice is a multisig account
  //   // let txhash = await mintToChecked(
  //   //   connection, // connection
  //   //   feePayer, // fee payer
  //   //   mintPubkey, // mint
  //   //   tokenAccountPubkey, // receiver (sholud be a token account)
  //   //   alice.publicKey, // !! mint authority pubkey !!
  //   //   1e8, // amount. if your decimals is 8, you mint 10^8 for 1 token.
  //   //   8, // decimals
  //   //   [signer1, signer2 ...],
  //   // );
  // }

  // or

  // 2) compose by yourself
  {
    // let tx = new Transaction().add(
    //   createMintToCheckedInstruction(
    //     mintPubkey, // mint
    //     tokenAccountPubkey, // receiver (sholud be a token account)
    //     alice.publicKey, // mint authority
    //     1e8, // amount. if your decimals is 8, you mint 10^8 for 1 token.
    //     8 // decimals
    //     // [signer1, signer2 ...], // only multisig account will use
    //   )
    // );
    // console.log(
    //   `txhash: ${await connection.sendTransaction(tx, [
    //     feePayer,
    //     alice /* fee payer + mint authority */,
    //   ])}`
    // );

    // const userWallet = Keypair.fromSecretKey(new Uint8Array(secret));
    // console.log(`userWallet pubkey: ${userWallet.publicKey.toString()}`);

    let data = createMintToCheckedInstruction(
      tokenMintPubkey, // token mint pubKey
      recipientATA, // receiver (sholud be a token account)
      mintAuthorityPubkey, // mint authority
      300 * 1e9, // 261 * 1e9 = 261 * 10^9
      9, // decimals
      [randSigner1, randSigner2, randSigner3] // a list of multisig signers
    );
    console.log("instruction is: " + data.data.toString("hex"));

    // console.log(
    //   `data: ${createMintToCheckedInstruction(
    //     mintPubkey, // mint
    //     tokenAccountPubkey, // receiver (sholud be a token account)
    //     mintAuthorityPubkey, // mint authority
    //     100 * 1e9, // amount. if your decimals is 8, you mint 10^8 for 1 token.
    //     9, // decimals
    //     [userWallet] // only multisig account will use
    //   ).data.toString("hex")}`
    // );
  }
})();
