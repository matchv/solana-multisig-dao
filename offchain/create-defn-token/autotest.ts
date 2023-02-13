import {
    createMint,
    getMint,
    getOrCreateAssociatedTokenAccount,
    Account,
    getAccount,
    mintTo,
    transfer,
    createMultisig,
    setAuthority,
    AuthorityType,
  } from '@solana/spl-token'
  import {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
  } from '@solana/web3.js'
  
  import * as dotenv from 'dotenv'
  dotenv.config({ path: __dirname + '/.env' })
  
  const secret: string = process.env.DEPLOYER_PRIV as string
  // wallet-0
  const userWallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(secret)))
  console.log(
    `---Step 1. have a wallet-0 in place with some devnet Sol,  wallat publicKey:${userWallet.publicKey}---`
  )
  
  // variables
  let mint: PublicKey
  let tokenAccount: Account
  
  // regular wallets
  let wallets: Keypair[] = []
  // ATAs of wallet
  let walletTokenAccounts: Account[] = []
  
  // multisig wallet 1
  let multisig1: PublicKey
  let multisig1TokenAccount: Account
  
  // multisig wallet 2
  let multisig2: PublicKey
  let multisig2TokenAccount: Account
  
  const endpoint: string = 'https://metaplex.devnet.rpcpool.com/'
  // const endpoint: string = "https://api.devnet.solana.com/";
  const connection = new Connection(endpoint, 'confirmed')
  
  const createToken = async () => {
    const mint = await createMint(
      connection,
      userWallet,
      userWallet.publicKey,
      userWallet.publicKey,
      9 // We are using 9 to match the CLI decimal default exactly
    )
  
    // console.log(`token address=${mint.toBase58()}`);
    if (mint) {
      console.log(`---Mint token: Success---`)
    } else {
      console.log(`---Mint token: Fail---`)
    }
    return mint
  }
  
  const createATA = async (mint: PublicKey, payer: Keypair, owner: PublicKey) => {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      owner
    )
    return tokenAccount
  }
  
  const getTokenAccountInfo = async (tokenAccount: PublicKey) => {
    const tokenAccountInfo = await getAccount(connection, tokenAccount)
    return tokenAccountInfo
  }
  
  const createWalletsAndATAs = async () => {
    for (let i = 0; i < 5; i++) {
      // create regular wallet
      const wallet = Keypair.generate()
      wallets.push(wallet)
  
      // create ATA
      const walletTokenAccount = await createATA(
        mint,
        userWallet,
        wallet.publicKey
      )
      walletTokenAccounts.push(walletTokenAccount)
      console.log(
        `5-1 wallets[${i}]: ${
          wallet.publicKey
        }, ATA of wallets[${i}]: ${walletTokenAccount.address.toBase58()}`
      )
    }
  }
  
  const createMultisigWallet = async () => {
    const multisigKey = await createMultisig(
      connection,
      userWallet,
      [
        wallets[0].publicKey,
        wallets[1].publicKey,
        wallets[2].publicKey,
        wallets[3].publicKey,
        wallets[4].publicKey,
      ],
      3
    )
  
    // console.log(`Created 3/5 multisig ${multisigKey.toBase58()}`);
    return multisigKey
  }
  
  const transferToken = async (
    payer: Keypair,
    source: PublicKey,
    destination: Account,
    sourceOwner: PublicKey,
    amount: number | bigint
  ) => {
    const signature = await transfer(
      connection,
      payer,
      source,
      destination.address,
      sourceOwner,
      amount
    )
    return signature
  }
  
  const steps = async () => {
    console.log(
      `---Step 2: create a ERC20 token (then ATA), mint 1,000,000 tokens to self---`
    )
  
    // 2-1. mint token, get token address
    mint = await createToken()
    console.log(`2-1 mint(token address): ${mint.toBase58()}`)
  
    // 2-2. create associated account
    tokenAccount = await createATA(mint, userWallet, userWallet.publicKey)
    console.log(
      `2-2 token associated account: ${tokenAccount.address.toBase58()}`
    )
  
    // 2-3. mint 1000000 tokens into the token account
    await mintTo(
      connection,
      userWallet,
      mint,
      tokenAccount.address,
      userWallet.publicKey,
      1000000 * LAMPORTS_PER_SOL
    )
    console.log(`2-3 mint 1000000 tokens into the token account success`)
  
    // 2-4. get token account info again
    let tokenAccountInfo = await getTokenAccountInfo(tokenAccount.address)
    console.log(
      `2-4 after mint, tokenAccountInfo amount=${tokenAccountInfo.amount}`
    )
  
    console.log(
      `---Step 3: create a regular walllet-1 (then create a associated token account ATA)---`
    )
  
    // 3-1. create a regular wallet
    const regularWallet1 = Keypair.generate()
    console.log(
      `3-1 create a regular wallet publicKey: ${regularWallet1.publicKey}`
    )
  
    // 3-2. create associated account
    const regularWallet1Account = await createATA(
      mint,
      userWallet,
      regularWallet1.publicKey
    )
    console.log(
      `3-2 create associated account: ${regularWallet1Account.address.toBase58()}`
    )
  
    console.log(`---Step 4:  transfer 100 token to the wallet-1---`)
  
    // 4-1. transfer 100 token to the wallet-1
    const regularWallet1Signature = await transferToken(
      userWallet,
      tokenAccount.address,
      regularWallet1Account,
      userWallet.publicKey,
      100 * LAMPORTS_PER_SOL
    )
  
    console.log(
      `4-1 transfer 100 token to the wallet-1 regularWallet1Signature: ${regularWallet1Signature}`
    )
  
    // 4-2. get token account info again
    let afterTransferWallet0AccountInfo = await getTokenAccountInfo(
      tokenAccount.address
    )
    console.log(
      `4-2 after transfer, tokenAccountInfo amount=${afterTransferWallet0AccountInfo.amount}`
    )
    // 4-3. get token account info again
    let afterTransferWallet1AccountInfo = await getTokenAccountInfo(
      regularWallet1Account.address
    )
    console.log(
      `4-3 after transfer, regularWallet1AccountInfo amount=${afterTransferWallet1AccountInfo.amount}`
    )
  
    console.log(
      `---Step 5: create a 3/5 multisig wallet-2 (then the ATA), send 100 to the multisig---`
    )
  
    // 5-1. create regular walllet-1 (then create a associated token account ATA
    await createWalletsAndATAs()
  
    // 5-2. create 3/5 multisig wallet-2
    multisig1 = await createMultisigWallet()
    console.log(
      `5-2 Created 3/5 multisig wallet-2 success, multisig1: ${multisig1.toBase58()}`
    )
  
    // 5-3 create ATA of multisig1
    multisig1TokenAccount = await createATA(mint, userWallet, multisig1)
    console.log(
      `5-3 create ATA of multisig1 success, multisig1TokenAccount: ${multisig1TokenAccount.address.toBase58()}`
    )
  
    // 5-4 transfer 100 token to the multisig1TokenAccount
    const signatureMultisig1 = await transferToken(
      userWallet,
      tokenAccount.address,
      multisig1TokenAccount, // destination
      userWallet.publicKey,
      100 * LAMPORTS_PER_SOL
    )
    console.log(
      `5-4 transfer 100 token to the multisig1TokenAccount success, signature: ${signatureMultisig1}`
    )
  
    let afterTransferWallet0AccountInfo1 = await getTokenAccountInfo(
      tokenAccount.address
    )
    console.log(
      `5-5 after transfer, tokenAccountInfo amount=${afterTransferWallet0AccountInfo1.amount}`
    )
  
    let afterTransferMultisig1TokenAccount = await getTokenAccountInfo(
      multisig1TokenAccount.address
    )
    console.log(
      `5-6 after transfer, multisig1TokenAccount amount=${afterTransferMultisig1TokenAccount.amount}`
    )
  
    console.log(
      `---Step 6: create another 3/5 multisig wallet-3 (then ATA), send 100 to it---`
    )
  
    // 6-1. create another 3/5 multisig wallet-3
    multisig2 = await createMultisigWallet()
    console.log(
      `6-1 Created 3/5 multisig wallet-3 success, multisig2: ${multisig2.toBase58()}`
    )
  
    // 6-2. create ATA of multisig2
    multisig2TokenAccount = await createATA(mint, userWallet, multisig2)
    console.log(
      `6-2 create ATA of multisig2: ${multisig2TokenAccount.address.toBase58()}`
    )
    // 6-3 transfer 100 token to the multisig2TokenAccount
    const signatureMultisig2 = await transferToken(
      userWallet,
      tokenAccount.address,
      multisig2TokenAccount, // destination
      userWallet.publicKey,
      100 * LAMPORTS_PER_SOL
    )
    console.log(
      `6-3 transfer 100 token to the multisig2TokenAccount success, signature: ${signatureMultisig2}`
    )
  
    let afterTransferWallet0AccountInfo2 = await getTokenAccountInfo(
      tokenAccount.address
    )
    console.log(
      `6-4 after transfer, tokenAccountInfo amount=${afterTransferWallet0AccountInfo2.amount}`
    )
  
    let afterTransferMultisig2TokenAccount = await getTokenAccountInfo(
      multisig2TokenAccount.address
    )
    console.log(
      `6-5 after transfer, multisig2TokenAccount amount=${afterTransferMultisig2TokenAccount.amount}`
    )
  
    console.log(`---Step 7: transfer 50 tokens from multisig-2 to multisig-3 ---`)
  
    // 7-1. transfer 50 tokens from multisig1 to multisig2
    const signature3 = await transfer(
      connection,
      userWallet,
      multisig1TokenAccount.address,
      multisig2TokenAccount.address, // destination
      multisig1,
      50 * LAMPORTS_PER_SOL,
      [wallets[0], wallets[1], wallets[2]]
    )
    console.log(
      `7-1 transfer 50 token to the multisig1 to multisig2 success, signature: ${signature3}`
    )
  
    let afterTransferMultisig1AccountInfo1 = await getTokenAccountInfo(
      multisig1TokenAccount.address
    )
    console.log(
      `7-2 after transfer, multisig1TokenAccount amount=${afterTransferMultisig1AccountInfo1.amount}`
    )
  
    let afterTransferMultisig2TokenAccount1 = await getTokenAccountInfo(
      multisig2TokenAccount.address
    )
  
    console.log(
      `7-3 after transfer, multisig2TokenAccount amount=${afterTransferMultisig2TokenAccount1.amount}`
    )
  
    console.log(
      `---Step 8: transfer mint authority from the wallet-0 to multisig wallet 2 ---`
    )
    // 8-1 get mint info
    const mintInfo1 = await getMint(connection, mint)
    console.log(
      '8-1 befor transfer mint authority from wallet-0 to multisig wallet 2 mintInfo.authority=',
      mintInfo1.mintAuthority?.toBase58()
    )
    // 8-2 transfer mint authority from wallet-0 to multisig wallet 2
    const hashtx = await setAuthority(
      connection,
      userWallet,
      mint,
      userWallet,
      AuthorityType.MintTokens,
      multisig1
      // [wallets[0], wallets[1], wallets[2]]
    )
    console.log(
      '8-2 transfer mint authority from wallet-0 to multisig wallet 2 hashtx=%o',
      hashtx
    )
    // 8-3 get mint info
    const mintInfo2 = await getMint(connection, mint)
    console.log(
      '8-3 after transfer mint authority from wallet-0 to multisig wallet 2 mintInfo.mintAuthority=',
      mintInfo2.mintAuthority?.toBase58()
    )
  
    console.log(
      `---Step 9: mint 1,000,000 token from the multisig wallet-2 to self ---`
    )
    // 9-1. mint 1,000,000 token from the multisig wallet-2 to self
    await mintTo(
      connection,
      userWallet,
      mint,
      multisig1TokenAccount.address,
      multisig1,
      1000000 * LAMPORTS_PER_SOL, // because decimals for the mint are set to 9
      [wallets[0], wallets[1], wallets[2]]
    )
    console.log(
      `9-1 mint 1,000,000 token from the multisig wallet-2 to self success`
    )
    // 9-2. get token account info again
    let tokenAccountInfo1 = await getTokenAccountInfo(
      multisig1TokenAccount.address
    )
    console.log(
      `9-2 after mint, multisig1TokenAccount amount=${tokenAccountInfo1.amount}`
    )
  
    console.log(
      `---Step 10: transfer 1,000 from multisig wallet-2 to multisig wallet 3 ---`
    )
    // 10-1. transfer 1,000 from multisig wallet-2 to multisig wallet 3
    const signature1 = await transfer(
      connection,
      userWallet,
      multisig1TokenAccount.address,
      multisig2TokenAccount.address, // destination
      multisig1,
      1000 * LAMPORTS_PER_SOL,
      [wallets[0], wallets[1], wallets[2]]
    )
    console.log(
      `10-1 transfer 1000 from multisig wallet-2 to multisig wallet 3 success, signature1: ${signature1}`
    )
  
    // 10-2. get token account info again
    let tokenMultisig1AccountInfo2 = await getTokenAccountInfo(
      multisig1TokenAccount.address
    )
    console.log(
      `10-2 after transfer, multisig1TokenAccount amount=${tokenMultisig1AccountInfo2.amount}`
    )
  
    // 10-3. get token account info again
    let tokenMultisig2AccountInfo2 = await getTokenAccountInfo(
      multisig1TokenAccount.address
    )
    console.log(
      `10-3 after transfer, multisig2TokenAccount amount=${tokenMultisig2AccountInfo2.amount}`
    )
  
    console.log(`---Step 11: create a regular wallet-4 ---`)
    // 11-1. create a regular wallet-4
    const regularWallet4 = Keypair.generate()
    console.log(
      `11-1 create a regular wallet-4 success, publicKey: ${regularWallet4.publicKey}`
    )
  
    // 11-2. create associated account
    const regularWalletAccount = await createATA(
      mint,
      userWallet,
      regularWallet4.publicKey
    )
    console.log(
      `11-2 wallet-4 create associated account success, regularWalletAccount: ${regularWalletAccount.address.toBase58()}`
    )
  
    console.log(
      `---Step 12:  transfer 500 token from multisig wallet 3 to wallet-4 ---`
    )
    // 12-1. get token account info again
    let tokenAccountInfo3 = await getTokenAccountInfo(
      multisig2TokenAccount.address
    )
    console.log(
      `12-1 befor transfer, multisig2TokenAccount amount=${tokenAccountInfo3.amount}`
    )
    // 12-2. transfer 500 token from multisig wallet-3 to wallet-4
    const signature2 = await transfer(
      connection,
      userWallet,
      multisig2TokenAccount.address,
      regularWalletAccount.address, // destination
      multisig2,
      500 * LAMPORTS_PER_SOL,
      [wallets[0], wallets[1], wallets[2]]
    )
    console.log(
      `12-2 transfer 500 token to the multisig wallet-3 to wallet-4 success, signature5: ${signature2}`
    )
  
    // 12-3. get token account info again
    let tokenAccountInfo4 = await getTokenAccountInfo(
      multisig2TokenAccount.address
    )
    console.log(
      `12-3 after trasfer, multisig2TokenAccount amount=${tokenAccountInfo4.amount}`
    )
  
    // 12-4. get token account info again
    let regularWalletAccount1 = await getTokenAccountInfo(
      regularWalletAccount.address
    )
    console.log(
      `12-4 after trasfer, regularWalletAccount amount=${regularWalletAccount1.amount}`
    )
  
    console.log(`mint script end.`)
  }
  
  steps()
  