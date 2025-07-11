'use client'

import { getPumpfunProgram, getPumpfunProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { BN } from 'bn.js'
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'

interface ListingArgs {
  seed: number, 
  name: string, 
  signerPubkey: PublicKey
}

interface BuyArgs {
  seed: number, 
  userPubkey: PublicKey, 
  buyAmount: number,
  mintPubkey: PublicKey
}

interface SellArgs {
  seed: number, 
  userPubkey: PublicKey, 
  sellAmount: number,
  mintPubkey: PublicKey
}

interface BurnArgs {
  seed: number, 
  userPubkey: PublicKey, 
  burnAmount: number,
  mintPubkey: PublicKey
}

export function usePumpfunProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getPumpfunProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getPumpfunProgram(provider, programId), [provider, programId])

  const listingAccounts = useQuery({
    queryKey: ['listing', 'all', { cluster }],
    queryFn: () => program.account.listing.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const listing = useMutation<string, Error, ListingArgs>({
    mutationKey: ['listing', 'initialize', { cluster }],
    mutationFn: async ({ seed, name, signerPubkey }) => {
      const [listing] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )
      const [mint] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )
      const [solVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )
      const mintVault = getAssociatedTokenAddressSync(
        mint,
        listing,
        true,
        TOKEN_PROGRAM_ID
      );

      return await program.methods
        .createListing(new BN(seed), name)
        .accountsPartial({ 
          signer: signerPubkey,
          listing,
          mint,
          mintVault,
          solVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await listingAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to create list.')
    },
  })

  const buy = useMutation<string, Error, BuyArgs>({
    mutationKey: ['list', 'buy', { cluster }],
    mutationFn: async ({ seed, userPubkey, buyAmount, mintPubkey }) => {
      const [listing] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )
      // const [mint] = PublicKey.findProgramAddressSync(
      //   [Buffer.from("mint"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
      //   program.programId
      // )
      const [solVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )
      const mintVault = getAssociatedTokenAddressSync(
        mintPubkey,
        listing,
        true,
        TOKEN_PROGRAM_ID
      );
      const userAta = getAssociatedTokenAddressSync(
        mintPubkey,
        userPubkey,
        false,
        TOKEN_PROGRAM_ID
      );

      return await program.methods
        .buy(new BN(buyAmount))
        .accountsStrict({
          user: userPubkey,
          listing,
          mint: mintPubkey,
          mintVault,
          solVault,
          userAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await listingAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to buy.')
    },
  })

  const sell = useMutation<string, Error, SellArgs>({
    mutationKey: ['list', 'buy', { cluster }],
    mutationFn: async ({ seed, userPubkey, sellAmount, mintPubkey }) => {
      const [listing] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )
      // const [mint] = PublicKey.findProgramAddressSync(
      //   [Buffer.from("mint"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
      //   program.programId
      // )
      const [solVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )
      const mintVault = getAssociatedTokenAddressSync(
        mintPubkey,
        listing,
        true,
        TOKEN_PROGRAM_ID
      );
      const userAta = getAssociatedTokenAddressSync(
        mintPubkey,
        userPubkey,
        false,
        TOKEN_PROGRAM_ID
      );

      return await program.methods
        .sell(new BN(sellAmount))
        .accountsStrict({
          user: userPubkey,
          listing,
          mint: mintPubkey,
          mintVault,
          solVault,
          userAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await listingAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to sell.')
    },
  })

  const burn = useMutation<string, Error, BurnArgs>({
    mutationKey: ['list', 'buy', { cluster }],
    mutationFn: async ({ seed, userPubkey, burnAmount, mintPubkey }) => {
      const [listing] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )
      const [solVault] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), new BN(seed).toArrayLike(Buffer, 'le', 8)],
        program.programId
      )
      const mintVault = getAssociatedTokenAddressSync(
        mintPubkey,
        listing,
        true,
        TOKEN_PROGRAM_ID
      );
      const userAta = getAssociatedTokenAddressSync(
        mintPubkey,
        userPubkey,
        false,
        TOKEN_PROGRAM_ID
      );

      return await program.methods
        .sell(new BN(burnAmount))
        .accountsStrict({
          user: userPubkey,
          listing,
          mint: mintPubkey,
          mintVault,
          solVault,
          userAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await listingAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to sell.')
    },
  })

  return {
    program,
    programId,
    listingAccounts,
    getProgramAccount,
    listing,
    buy,
    sell,
    burn
  }
}

export function usePumpfunProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program } = usePumpfunProgram()

  return {}
}
