import * as anchor from '@project-serum/anchor'
import { Program } from '@project-serum/anchor'
import { OdfDao } from '../../target/types/odf_dao'
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { createAndExecuteProposal } from '../utils/createAndExecuteProposal'
import {
  createOrganization,
  addTeamMember,
  pda,
  removeTeamMember,
  initFreezer,
} from '../../app/api'

import * as assert from 'assert'

describe('Team Member', () => {
  anchor.setProvider(anchor.AnchorProvider.env())
  const program = anchor.workspace.OdfDao as Program<OdfDao>
  const wallet = new anchor.Wallet(Keypair.generate())

  let organization: PublicKey
  const receiver = Keypair.generate()

  it('Init', async () => {
    // Airdrop
    const airdropSignature = await program.provider.connection.requestAirdrop(
      wallet.publicKey,
      anchor.web3.LAMPORTS_PER_SOL * 10
    )

    await program.provider.connection.confirmTransaction(airdropSignature)

    // Create organization
    const createOrganizationTx = await createOrganization(program, wallet)
    const createOrganizationSignedTx = await wallet.signTransaction(
      createOrganizationTx.tx
    )
    const createOrganizationSignature =
      await program.provider.connection.sendRawTransaction(
        createOrganizationSignedTx.serialize()
      )
    await program.provider.connection.confirmTransaction(
      createOrganizationSignature
    )
    organization = createOrganizationTx.organization

    // Init freezer
    const initFreezerTx = await initFreezer(program, wallet, organization)
    const initFreezerSignedTx = await wallet.signTransaction(initFreezerTx)
    const initFreezerSignature =
      await program.provider.connection.sendRawTransaction(
        initFreezerSignedTx.serialize()
      )
    await program.provider.connection.confirmTransaction(initFreezerSignature)
  })

  it('Add team member', async () => {
    // const ix = await addTeamMember(program, organization, receiver.publicKey)
    // const _proposalIndex = await createAndExecuteProposal(
    //   program,
    //   wallet,
    //   organization,
    //   [ix]
    // )
    // const organizationData = await program.account.organization.fetch(
    //   organization
    // )
    // const receiverTeamTokenAccount = await pda.ata(
    //   receiver.publicKey,
    //   organizationData.teamTokenMint
    // )
    // const receiverTeamTokenAccountData =
    //   await program.provider.connection.getParsedAccountInfo(
    //     receiverTeamTokenAccount
    //   )
    // console.log('receiverTeamTokenAccountData:', receiverTeamTokenAccountData)
    // assert.ok(
    //   receiverTeamTokenAccountData !== null &&
    //     receiverTeamTokenAccountData.value !== null &&
    //     'parsed' in receiverTeamTokenAccountData.value.data,
    //   'Assert 1'
    // )
    // assert.ok(
    //   receiverTeamTokenAccountData.value.data.parsed.info.state === 'frozen',
    //   'Assert 2'
    // )
    // assert.ok(
    //   parseInt(
    //     receiverTeamTokenAccountData.value.data.parsed.info.tokenAmount.amount
    //   ) >= 1,
    //   'Assert 3'
    // )
  })

  it('Remove team member', async () => {
    // const ix = await removeTeamMember(program, organization, receiver.publicKey)
    // console.log(
    //   'receiverTeamTokenAccountData _proposalIndex:',
    //   'remove team member1'
    // )
    // const _proposalIndex = await createAndExecuteProposal(
    //   program,
    //   wallet,
    //   organization,
    //   [ix]
    // )
    // console.log('receiverTeamTokenAccountData _proposalIndex:', _proposalIndex)
    // const organizationData = await program.account.organization.fetch(
    //   organization
    // )
    // const receiverTeamTokenAccount = await pda.ata(
    //   receiver.publicKey,
    //   organizationData.teamTokenMint
    // )
    // const receiverTeamTokenAccountData =
    //   await program.provider.connection.getParsedAccountInfo(
    //     receiverTeamTokenAccount
    //   )
    // console.log('receiverTeamTokenAccountData1:', receiverTeamTokenAccountData)
    // assert.ok(
    //   receiverTeamTokenAccountData !== null &&
    //     receiverTeamTokenAccountData.value !== null &&
    //     'parsed' in receiverTeamTokenAccountData.value.data &&
    //     parseInt(
    //       receiverTeamTokenAccountData.value.data.parsed.info.tokenAmount.amount
    //     ) >= 1 &&
    //     receiverTeamTokenAccountData.value.data.parsed.info.state !== 'frozen'
    // )
  })
})
