import * as anchor from '@project-serum/anchor'
import * as assert from 'assert'
import * as serumCmn from '@project-serum/common'
import { TokenInstructions } from '@project-serum/serum'
import { expect } from 'chai'
import { createMint } from '@solana/spl-token'

import { TokenHelper } from './token_helper'
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import * as dotenv from 'dotenv'

// Configure the client to use the local cluster.
anchor.setProvider(anchor.AnchorProvider.local())
const connection = anchor.getProvider().connection

// test odf stake
describe('Test Odf Stake', () => {
  // dotenv.config({ path: __dirname + '/.env' })

  // const secret: string = process.env.DEPLOYER_PRIV as string
  // wallet-0
  // const userWallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(secret)))

  const program = anchor.workspace.OdfStake

  const userWallet = program.provider.wallet

  const helper = new TokenHelper(connection)

  it('1. test init', async () => {
    let mint_token = await helper.createToken(userWallet)
    // let mint_token = anchor.web3.Keypair.generate()
    console.log('mint_token:%o', mint_token)

    console.log('userWallet.publicKey:%o', userWallet.publicKey)

    const [vault, num1] = await helper.getProgramPDA(
      'vault',
      mint_token,
      userWallet.publicKey,
      program
    )
    console.log('vault:', vault)

    const [vaultToken, num2] = await helper.getProgramPDA(
      'vault_token',
      mint_token,
      vault,
      program
    )

    console.log('vaultToken:', vaultToken)
    const [vaultMint, num3] = await helper.getProgramPDA(
      'vault_mint',
      mint_token,
      vault,
      program
    )
    console.log('vaultMint:', vaultMint)

    await program.rpc.init(
      {
        vaultBump: vault,
        tokenBump: vaultToken,
        mintBump: vaultMint,
      },
      {
        accounts: {
          vault: vault,
          vaultToken: vaultToken,
          vaultMint: vaultMint,
          mintToken: mint_token,
          payer: userWallet.publicKey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }
    )

    let account = await program.account.vault.fetch(vault)

    console.log('account: %o', account)
  })
})

describe('2. test stake', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.local())

  const program = anchor.workspace.OdfStake

  const MINT_TOKENS = 2100000000000000 // 21M with 8dp
  const MINT_DECIMALS = 8

  let mint = null
  let god = null
  let creatorTokenAcc = null
  let creatorAcc = anchor.web3.Keypair.generate()

  it('2-1. create token account', async () => {
    const [_mint, _god] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(MINT_TOKENS),
      undefined,
      MINT_DECIMALS
    )
    mint = _mint
    god = _god

    creatorTokenAcc = await serumCmn.createTokenAccount(
      program.provider,
      mint,
      creatorAcc.publicKey
    )
  })

  it('2-2. test stake token', async () => {
    const stakeAmount = new anchor.BN(120)

    await program.rpc.stake(stakeAmount, {
      accounts: {
        depositor: god,
        vault: creatorTokenAcc,
        owner: program.provider.wallet.publicKey,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      },
    })

    const memberVault = await serumCmn.getTokenAccount(
      program.provider,
      creatorTokenAcc
    )

    assert.ok(memberVault.amount.eq(stakeAmount))
  })

  it('2-3. test unstake token', async () => {
    const stakeAmount = new anchor.BN(120)

    await program.rpc.unStake(stakeAmount, {
      accounts: {
        depositor: god,
        vault: creatorTokenAcc,
        owner: program.provider.wallet.publicKey,
        tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      },
    })

    const memberVault = await serumCmn.getTokenAccount(
      program.provider,
      creatorTokenAcc
    )
    assert.ok(memberVault.amount.eq(stakeAmount))
  })
})
