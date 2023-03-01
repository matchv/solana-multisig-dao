import {
  Signer,
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
  Connection,
} from '@solana/web3.js'
import * as anchor from '@project-serum/anchor'
import fs from 'fs'
import {
  Account,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token'

// @ts-ignore
// const stakeData = JSON.parse(fs.readFileSync('.keys/stake_mint.json'))
// const stakePayerKeypair = Keypair.fromSecretKey(new Uint8Array(stakeData))
// const stakeMintAddress = stakeMintKeypair.publicKey
class TokenHelper {
  connection: anchor.web3.Connection
  constructor(connection: anchor.web3.Connection) {
    this.connection = connection
  }

  randomPayer = async (lamports = LAMPORTS_PER_SOL) => {
    const wallet = Keypair.generate()
    const signature = await this.connection.requestAirdrop(
      wallet.publicKey,
      lamports
    )
    await this.connection.confirmTransaction(signature)
    // console.log('balance:', await this.connection.getBalance(wallet.publicKey))
    return wallet
  }

  payerWallet = async (lamports = LAMPORTS_PER_SOL) => {
    const wallet = Keypair.generate()
    const signature = await this.connection.requestAirdrop(
      wallet.publicKey,
      lamports
    )
    await this.connection.confirmTransaction(signature)
    // console.log('balance:', await this.connection.getBalance(wallet.publicKey))
    return wallet
  }

  airdrop = async (wallet: PublicKey, lamports = 20000 * LAMPORTS_PER_SOL) => {
    const signature = await this.connection.requestAirdrop(wallet, lamports)
    await this.connection.confirmTransaction(signature)
    const signature1 = await this.connection.requestAirdrop(wallet, lamports)
    await this.connection.confirmTransaction(signature1)
    console.log('balance:', await this.connection.getBalance(wallet))
    return wallet
  }

  // create token
  createToken = async (mintAuthority: PublicKey) => {
    const mint = await createMint(
      this.connection,
      await this.randomPayer(),
      mintAuthority,
      null,
      8 // We are using 9 to match the CLI decimal default exactly
    )
    // console.log(`token address=${mint.toBase58()}`);
    // if (mint) {
    //   console.log(`---Mint token: Success---`)
    // } else {
    //   console.log(`---Mint token: Fail---`)
    // }
    return mint
  }

  mintTo = async (
    mint: PublicKey,
    destination: PublicKey,
    authority: PublicKey
  ) => {
    await mintTo(
      this.connection,
      await this.randomPayer(),
      mint,
      destination,
      authority,
      1000000 * LAMPORTS_PER_SOL // We are using 9 to match the CLI decimal default exactly
    )
  }

  getProgramPDA = async (
    s: string,
    seed1: anchor.web3.PublicKey,
    seed2: anchor.web3.PublicKey,
    program: any
  ): Promise<[PublicKey, number]> => {
    return await PublicKey.findProgramAddressSync(
      [anchor.utils.bytes.utf8.encode(s), seed1.toBuffer(), seed2.toBuffer()],
      program.programId
    )
  }

  createATA = async (
    mint: PublicKey,
    owner: PublicKey,
    isPDA: boolean = false
  ) => {
    const tokenAccount: Account = await getOrCreateAssociatedTokenAccount(
      this.connection,
      await this.randomPayer(),
      mint,
      owner,
      isPDA
    )
    return tokenAccount
  }

  balance = async (tokenBag: PublicKey) => {
    return parseInt(
      (await this.connection.getTokenAccountBalance(tokenBag)).value.amount
    )
  }
}

export { TokenHelper }
