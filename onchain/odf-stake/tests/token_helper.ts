import {
  Signer,
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
  Connection,
} from '@solana/web3.js'
import * as anchor from '@project-serum/anchor'

import {
  createMint,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token'

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
    console.log('balance:', await this.connection.getBalance(wallet.publicKey))
    return wallet
  }

  // create token
  createToken = async (wallet: Keypair) => {
    const mint = await createMint(
      this.connection,
      await this.randomPayer(),
      wallet.publicKey,
      null,
      8 // We are using 9 to match the CLI decimal default exactly
    )
    // console.log(`token address=${mint.toBase58()}`);
    if (mint) {
      console.log(`---Mint token: Success---`)
    } else {
      console.log(`---Mint token: Fail---`)
    }
    return mint
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

  createATA = async (mint: PublicKey, payer: Keypair, owner: PublicKey) => {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      payer,
      mint,
      owner
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
