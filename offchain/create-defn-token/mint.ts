// Solana upgraded to versioned transactions in Oct 2022

import {  SystemProgram, Keypair, Connection, PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { MINT_SIZE, TOKEN_PROGRAM_ID, createInitializeMintInstruction, getMinimumBalanceForRentExemptMint, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createMintToInstruction } from '@solana/spl-token';
import { DataV2, createCreateMetadataAccountV2Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { bundlrStorage, keypairIdentity, Metaplex, UploadMetadataInput } from '@metaplex-foundation/js';
import secret from './secretKey.json';

import * as dotenv from "dotenv";
dotenv.config({ path: __dirname+'/.env' });

/* 
const deployer = process.env.DEPLOYER_PRIV;
const mint_auth: string = (process.env.MINT_AUTHORITY_PUB as string);
const freeze_auth: string = (process.env.FREEZE_AUTHORITY_PUB as string);
console.log(dotenv.config()); 
console.log(process.env.DEPLOYER_PRIV); 
*/

const endpoint = 'https://metaplex.devnet.rpcpool.com/'; 
const solanaConnection = new Connection(endpoint);

// token decimals
// token supply
const MINT_CONFIG = {
    numDecimals: 9,
    numberTokens: 1000000000  //todo: change to 0 upon production
}

// Reference: https://docs.metaplex.com/programs/token-metadata/token-standard#the-fungible-standard
// this will be pushed to arweave
const MY_TOKEN_METADATA: UploadMetadataInput = {
    name: "Outdefine Token",
    symbol: "OUTD",
    description: "Outdefine on Solana Devnet",
    image: "https://pbs.twimg.com/profile_images/1550164971392081920/WNdkAJpQ_400x400.jpg"
}

//this will be stored on chain
const ON_CHAIN_METADATA = {
    name: MY_TOKEN_METADATA.name, 
    symbol: MY_TOKEN_METADATA.symbol,
    uri: 'https://outdefine.com',
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null
} as DataV2;

/**
 * 
 * @param wallet Solana Keypair
 * @param tokenMetadata Metaplex Fungible Token Standard object 
 * @returns 
 */
const uploadMetadata = async(wallet: Keypair, tokenMetadata: UploadMetadataInput):Promise<string> => {

    // create metaplex instance on devnet using this wallet
    const metaplex = Metaplex.make(solanaConnection)
        .use(keypairIdentity(wallet))
        .use(bundlrStorage({
        address: 'https://devnet.bundlr.network',
        providerUrl: endpoint,
        timeout: 60000,
        }));
    
    // upload to Arweave
    const { uri } = await metaplex.nfts().uploadMetadata(tokenMetadata);
    console.log(`Arweave URL: `, uri);
    return uri;

}


const createNewMintTransaction = async (connection:Connection, payer:Keypair, mintKeypair: Keypair, destinationWallet: PublicKey, mintAuthority: PublicKey, freezeAuthority: PublicKey)=>{
    // create metaplex instance on devnet using this wallet
    const metaplex = Metaplex.make(solanaConnection)
      .use(keypairIdentity(payer))
      .use(bundlrStorage({
      address: 'https://devnet.bundlr.network',
      providerUrl: endpoint,
      timeout: 60000,
    }));
    
    
    // get the minimum lamport balance to create a new account and avoid rent payments
    const requiredBalance = await getMinimumBalanceForRentExemptMint(connection);
    // metadata account associated with mint
    const metadataPDA = await metaplex.nfts().pdas().metadata({mint: mintKeypair.publicKey});
    // get associated token account of your wallet
    const tokenATA = await getAssociatedTokenAddress(mintKeypair.publicKey, destinationWallet);   
    
    const txInstructions: TransactionInstruction[] = [];

    txInstructions.push(
        SystemProgram.createAccount({
            fromPubkey: payer.publicKey,
            newAccountPubkey: mintKeypair.publicKey,
            space: MINT_SIZE,
            lamports: requiredBalance,
            programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey, // Mint Address
          MINT_CONFIG.numDecimals, // Number of Decimals of New mint
          mintAuthority, // Mint Authority
          freezeAuthority, // Freeze Authority
          TOKEN_PROGRAM_ID),
        createAssociatedTokenAccountInstruction(
          payer.publicKey, // Payer 
          tokenATA, // Associated token account 
          payer.publicKey, // token owner
          mintKeypair.publicKey, // Mint
        ),
        createMintToInstruction(
          mintKeypair.publicKey, // Mint
          tokenATA, // Destination Token Account
          mintAuthority, // Authority
          MINT_CONFIG.numberTokens * Math.pow(10, MINT_CONFIG.numDecimals),//number of tokens //todo: remove before production
        ),
        createCreateMetadataAccountV2Instruction({
            metadata: metadataPDA, 
            mint: mintKeypair.publicKey, 
            mintAuthority: mintAuthority,
            payer: payer.publicKey,
            updateAuthority: mintAuthority,
          },
          { createMetadataAccountArgsV2: 
            { 
              data: ON_CHAIN_METADATA, 
              isMutable: true 
            } 
          }
        )
    );
    const latestBlockhash = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: txInstructions
    }).compileToV0Message();
    console.log(" OK - Compiled Transaction Message");
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([payer, mintKeypair]);
    return transaction;
}

const main = async() => {
    console.log(`---STEP 1: Uploading MetaData---`);
    const userWallet = Keypair.fromSecretKey(new Uint8Array(secret));
    let metadataUri = await uploadMetadata(userWallet, MY_TOKEN_METADATA);
    ON_CHAIN_METADATA.uri = metadataUri;

    console.log(`---STEP 2: Creating Mint Transaction---`);
    // Create new Keypair for Mint address
    let mintKeypair = Keypair.generate();   
    console.log(`New Mint Address: `, mintKeypair.publicKey.toString());

    const newMintTransaction:VersionedTransaction = await createNewMintTransaction(
        solanaConnection,
        userWallet,
        mintKeypair,
        userWallet.publicKey, //todo: change recipient
        userWallet.publicKey, //todo: change mint_authority
        userWallet.publicKey  //todo: change freeze_authority
    );

    console.log(`---STEP 3: Executing Mint Transaction---`);
    const transactionId =  await solanaConnection.sendTransaction(newMintTransaction);
    console.log(`Transaction ID: `, transactionId);
    console.log(`Succesfully minted ${MINT_CONFIG.numberTokens} ${ON_CHAIN_METADATA.symbol} to ${userWallet.publicKey.toString()}.`);
    console.log(`View Transaction: https://explorer.solana.com/tx/${transactionId}?cluster=devnet`);
}

// main();
