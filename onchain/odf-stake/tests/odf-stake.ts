import * as anchor from '@project-serum/anchor'
import { Program } from '@project-serum/anchor'
import { OdfStake } from '../target/types/odf_stake'

// describe("odf-stake", () => {
//   // Configure the client to use the local cluster.
//   anchor.setProvider(anchor.AnchorProvider.env());

//   const program = anchor.workspace.OdfStake as Program<OdfStake>;

//   it("Is initialized!", async () => {
//     // Add your test here.
//     const tx = await program.methods.initialize().rpc();
//     console.log("Your transaction signature", tx);
//   });
// });

const assert = require('assert')
const serumCmn = require('@project-serum/common')
const TokenInstructions = require('@project-serum/serum').TokenInstructions

describe.only('Test counter', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.Staking

  const counter = anchor.web3.Keypair.generate()
  it('Let me check the counter', async () => {
    await program.rpc.init(100, {
      accounts: {
        counter: counter.publicKey,
      },
    })
  })
})

describe('Staking ', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.Staking

  const MINT_TOKENS = 2100000000000000 // 21M with 8dp
  const MINT_DECIMALS = 8

  let mint = null
  let god = null
  let creatorTokenAcc = null
  let creatorAcc = anchor.web3.Keypair.generate()

  it('Sets up initial test state', async () => {
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

  it('Deposits token', async () => {
    const depositAmount = new anchor.BN(120)

    await program.rpc.deposit(depositAmount, {
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
    assert.ok(memberVault.amount.eq(depositAmount))
  })
})
