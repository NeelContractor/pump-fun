import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { Pumpfun } from '../target/types/pumpfun'
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'

describe('Pump Fun', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const wallet = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Pumpfun as Program<Pumpfun>
  console.log(program.programId.toBase58());

  const seed = new anchor.BN(Math.floor(Math.random() * 1000000));
  let name = "elonmusk1";

  let mintVault: PublicKey;
  let userAta: PublicKey;
  let vaultState: PublicKey;

  const [mint] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), seed.toArrayLike(Buffer, 'le', 8)],
    program.programId
  )

  const [listing] = PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), seed.toArrayLike(Buffer, 'le', 8)],
    program.programId
  )

  const [solVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), seed.toArrayLike(Buffer, 'le', 8)],
    program.programId
  )

  it('create a new listing', async () => {
    console.log("listing account ", listing.toBase58())
    console.log("mint account ", mint.toBase58())

    mintVault = getAssociatedTokenAddressSync(
      mint,
      listing,
      true,
      TOKEN_PROGRAM_ID
    );
    console.log("mint vault ", mintVault.toBase58());

    try {
      const tx = await program.methods
        .createListing(seed, name)
        .accountsStrict({
          signer: wallet.publicKey,
          listing,
          mint,
          mintVault,
          solVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
        })
        .rpc()
        console.log("Listing created successfully")
        console.log("Transaction :", tx);
    } catch (error) {
      console.log("Error: ", error);
      throw error;
    }
  })

  it("buys tokens", async () => {
    userAta = getAssociatedTokenAddressSync(
      mint,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    console.log("user ata ", userAta);

    try {
      const tx = await program.methods
        .buy(new anchor.BN(10_000_000))
        .accountsStrict({
          user: wallet.publicKey,
          listing,
          mint,
          mintVault,
          solVault,
          userAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Buy completed successfully");
      console.log("Transaction signature:", tx);
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });

  it("sells tokens", async () => {
    userAta = getAssociatedTokenAddressSync(
      mint,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    console.log("user ata ", userAta);
    try {
      const tx = await program.methods
        .sell(new anchor.BN(5_000_000)) // Selling less than bought
        .accountsStrict({
          user: wallet.publicKey,
          listing,
          mint,
          mintVault,
          solVault,
          userAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("Sell completed successfully");
      console.log("Transaction signature:", tx);
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });

  it("burns tokens", async () => {
    // Make sure userAta is properly set
    userAta = getAssociatedTokenAddressSync(
      mint,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    console.log("user ata ", userAta);
    
    try {
      const tx = await program.methods
        .burnTokens(new anchor.BN(2_000_000)) // Burning remaining tokens
        .accountsStrict({
          user: wallet.publicKey,
          listing,
          mint,
          mintVault,
          solVault,
          userAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc({ skipPreflight: true });

      console.log("Burn completed successfully");
      console.log("Burn Transaction signature:", tx);
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  });
})
