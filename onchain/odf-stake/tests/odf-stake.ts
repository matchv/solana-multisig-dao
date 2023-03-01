import * as anchor from '@project-serum/anchor'
import * as assert from 'assert'
// import * as serumCmn from '@project-serum/common'
import { TokenInstructions } from '@project-serum/serum'
import { Account, mintTo, createMint } from '@solana/spl-token'

import { TokenHelper } from './token_helper'
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import * as dotenv from 'dotenv'
import fs from 'fs'

// Configure the client to use the local cluster.
anchor.setProvider(anchor.AnchorProvider.local())
const connection = anchor.getProvider().connection
let program = anchor.workspace.OdfStake

// dotenv.config({ path: '.env' })

// const secret: string = process.env.DEPLOYER_PRIV as string
// wallet-0
// let userWallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(secret)))
let userWallet: Keypair = program.provider.wallet

let userKeypair = anchor.web3.Keypair.generate()
let tokenKeypair = anchor.web3.Keypair.generate()
let stake_info: anchor.web3.PublicKey
let vault: anchor.web3.PublicKey
let vaultToken: anchor.web3.PublicKey
let vaultMint: anchor.web3.PublicKey
let mint_token: anchor.web3.PublicKey

let vault_bump
let token_bump
let mint_bump
let stake_bump

let depositor: Account
let user_vault: Account
let helper: TokenHelper = new TokenHelper(connection)

describe('Test Odf Stake', async () => {
  before(async function () {
    mint_token = await helper.createToken(userWallet.publicKey)
    // console.log('mint_token:', mint_token.toBase58())
    ;[vault, vault_bump] = await helper.getProgramPDA(
      'vault',
      mint_token,
      userWallet.publicKey,
      program
    )
    // console.log('vault:', vault)
    ;[vaultToken, token_bump] = await helper.getProgramPDA(
      'vault_token',
      mint_token,
      vault,
      program
    )

    // console.log('vaultToken:', vaultToken)
    ;[vaultMint, mint_bump] = await helper.getProgramPDA(
      'vault_mint',
      mint_token,
      vault,
      program
    )
    ;[stake_info, stake_bump] = await helper.getProgramPDA(
      'stake',
      mint_token,
      vault,
      program
    )

    // console.log(
    //   'mint_token:%s, vault:%s, vault_token:%s,vault_mint:%s, userWallet:%s',
    //   mint_token,
    //   vault,
    //   vaultToken,
    //   vaultMint,
    //   userWallet.publicKey
    // )
  })

  describe('Test Init', async () => {
    // test odf stake
    it('1. test init', async () => {
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
            stakeInfo: stake_info,
          },
        }
      )

      let account = await program.account.vault.fetch(vault)

      assert.ok(account.minLockPeriod.eq(new anchor.BN(14)))
      assert.ok(account.maxLockPeriod.eq(new anchor.BN(730)))
      assert.ok(account.apy.eq(new anchor.BN(4)))
    })
  })

  describe('Test Stake', async () => {
    before(async function () {
      depositor = await helper.createATA(
        mint_token,
        userWallet.publicKey,
        false
      )
      user_vault = await helper.createATA(
        vaultMint,
        userWallet.publicKey,
        false
      )
    })
    it('2-1. stake Test amount is less than 1000', async () => {
      const stakeAmount = new anchor.BN(120)
      const period = new anchor.BN(14)

      try {
        await program.rpc.stake(stakeAmount, period, {
          accounts: {
            depositor: depositor.address,
            vault: vault,
            vaultToken: vaultToken,
            vaultMint: vaultMint,
            userVault: user_vault.address,
            owner: userWallet.publicKey,
            tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
            stakeInfo: stake_info,
          },
        })
      } catch (err) {
        // console.log('err.message:', err.message)
        assert.ok(err.message.includes('amount is too small'))
      }
    })

    it('2-2. Test lock period is too short', async () => {
      const stakeAmount = new anchor.BN(1200)
      const period = new anchor.BN(10)
      try {
        await program.rpc.stake(stakeAmount, period, {
          accounts: {
            depositor: depositor.address,
            vault: vault,
            vaultToken: vaultToken,
            vaultMint: vaultMint,
            userVault: user_vault.address,
            owner: userWallet.publicKey,
            tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
            stakeInfo: stake_info,
          },
        })
      } catch (err) {
        // console.log('err.message:', err.message)
        assert.ok(err.message.includes('Invalid period'))
      }
    })

    it('2-3. Test lock period is too long', async () => {
      const stakeAmount = new anchor.BN(1200)
      const period = new anchor.BN(1000)
      try {
        await program.rpc.stake(stakeAmount, period, {
          accounts: {
            depositor: depositor.address,
            vault: vault,
            vaultToken: vaultToken,
            vaultMint: vaultMint,
            userVault: user_vault.address,
            owner: userWallet.publicKey,
            tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
            stakeInfo: stake_info,
          },
        })
      } catch (err) {
        // console.log('err.message:', err.message)
        assert.ok(err.message.includes('Invalid period'))
      }
    })

    it('2-4. Test stake Insufficient funds', async () => {
      const stakeAmount = new anchor.BN(1000)
      const period = new anchor.BN(14)
      try {
        await program.rpc.stake(stakeAmount, period, {
          accounts: {
            depositor: depositor.address,
            vault: vault,
            vaultToken: vaultToken,
            vaultMint: vaultMint,
            userVault: user_vault.address,
            owner: userWallet.publicKey,
            tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
            stakeInfo: stake_info,
          },
        })
      } catch (err) {
        // console.log('stake err:%s', err.message)
        assert.ok(err.message.includes('custom program error: 0x1'))
      }
    })

    it('2-5. Test stake success', async () => {
      // const stakeAmount = new anchor.BN(1000)
      // const period = new anchor.BN(14)
      // console.log('depositor.address:%s', depositor.address)
      // // airdrop 1 sol
      // await helper.airdrop(depositor.address)
      // console.log(
      //   ' mint_token:%s, userWallet.publicKey:%',
      //   mint_token.toBase58(),
      //   userWallet.publicKey
      // )
      // console.log(
      //   'stake mint_token:%s, userWallet:%o, depositor.address:%s, userWallet.publickey:%s,connection:%s',
      //   mint_token,
      //   userWallet,
      //   depositor.address,
      //   userWallet.publicKey,
      //   connection
      // )
      // await mintTo(
      //   connection,
      //   userWallet,
      //   mint_token,
      //   depositor.address,
      //   userWallet.publicKey,
      //   1000000 * LAMPORTS_PER_SOL
      // )
      // console.log('stake mintTo before:%s', '!')
      // // await helper.mintTo(mint_token, depositor.address, userWallet.publicKey)
      // console.log('stake mintTo after:%s', '!')
      // try {
      //   await program.rpc.stake(stakeAmount, period, {
      //     accounts: {
      //       depositor: depositor.address,
      //       vault: vault,
      //       vaultToken: vaultToken,
      //       vaultMint: vaultMint,
      //       userVault: user_vault.address,
      //       owner: userWallet.publicKey,
      //       tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
      //       stakeInfo: stake_info,
      //     },
      //   })
      //   console.log('stake success2:%s', '!')
      // } catch (err) {
      //   console.log('stake err:%s', err.message)
      // }
      // let account = await program.account.vault_token.fetch(vaultToken)
      // console.log('account:%o', account)
      // const memberVault = await serumCmn.getTokenAccount(
      //   program.provider,
      //   mint_token
      // )
      // assert.ok(memberVault.amount.eq(stakeAmount))
    })
  })
  // describe('Test unStake', async () => {
  //   it('3-1. test Take it without stake', async () => {
  //     const stakeAmount = new anchor.BN(120)
  //     const serial_number = new anchor.BN(1)
  //     try {
  //       await program.rpc.unStake(stakeAmount, serial_number, {
  //         accounts: {
  //           withdrawer: depositor.address,
  //           vault: vault,
  //           vaultToken: vaultToken,
  //           vaultMint: vaultMint,
  //           userVault: user_vault.address,
  //           owner: program.provider.wallet.publicKey,
  //           tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
  //           stakeInfo: stake_info,
  //         },
  //       })
  //     } catch (err) {
  //       console.log('err.message:', err.message)
  //       assert.ok(err.message.includes('not staked'))
  //     }
  //   })

  //   it('3-2. Test already claim complete', async () => {
  //     const stakeAmount = new anchor.BN(120)
  //     const serial_number = new anchor.BN(1)
  //     try {
  //       await program.rpc.unStake(stakeAmount, serial_number, {
  //         accounts: {
  //           withdrawer: depositor.address,
  //           vault: vault,
  //           vaultToken: vaultToken,
  //           vaultMint: vaultMint,
  //           userVault: user_vault.address,
  //           owner: program.provider.wallet.publicKey,
  //           tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
  //           stakeInfo: stake_info,
  //         },
  //       })
  //     } catch (err) {
  //       assert.ok(err.message.includes('already claim complete'))
  //     }
  //   })

  //   it('3-3. Test stake amount not enough', async () => {
  //     const stakeAmount = new anchor.BN(120)
  //     const serial_number = new anchor.BN(1)
  //     try {
  //       await program.rpc.unStake(stakeAmount, serial_number, {
  //         accounts: {
  //           withdrawer: depositor.address,
  //           vault: vault,
  //           vaultToken: vaultToken,
  //           vaultMint: vaultMint,
  //           userVault: user_vault.address,
  //           owner: program.provider.wallet.publicKey,
  //           tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
  //           stakeInfo: stake_info,
  //         },
  //       })
  //     } catch (err) {
  //       assert.ok(err.message.includes('stake amount not enough'))
  //     }
  //   })

  //   it('3-4. Test lock period has not arrived', async () => {
  //     const stakeAmount = new anchor.BN(120)
  //     const serial_number = new anchor.BN(1)
  //     try {
  //       await program.rpc.unStake(stakeAmount, serial_number, {
  //         accounts: {
  //           withdrawer: depositor.address,
  //           vault: vault,
  //           vaultToken: vaultToken,
  //           vaultMint: vaultMint,
  //           userVault: user_vault.address,
  //           owner: program.provider.wallet.publicKey,
  //           tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
  //           stakeInfo: stake_info,
  //         },
  //       })
  //     } catch (err) {
  //       assert.ok(err.message.includes('The lock-up period is not reached'))
  //     }
  //   })

  //   it('3-5. Test unStake success', async () => {
  //     const stakeAmount = new anchor.BN(120)
  //     const serial_number = new anchor.BN(1)
  //     await program.rpc.unStake(stakeAmount, serial_number, {
  //       accounts: {
  //         withdrawer: depositor.address,
  //         vault: vault,
  //         vaultToken: vaultToken,
  //         vaultMint: vaultMint,
  //         userVault: user_vault.address,
  //         owner: program.provider.wallet.publicKey,
  //         tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
  //         stakeInfo: stake_info,
  //       },
  //     })
  //     // check success data
  //   })
  // })
})
