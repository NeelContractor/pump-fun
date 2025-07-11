// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import PumpfunIDL from '../target/idl/pumpfun.json'
import type { Pumpfun } from '../target/types/pumpfun'

// Re-export the generated IDL and type
export { Pumpfun, PumpfunIDL }

// The programId is imported from the program IDL.
export const PUMPFUN_PROGRAM_ID = new PublicKey(PumpfunIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getPumpfunProgram(provider: AnchorProvider, address?: PublicKey): Program<Pumpfun> {
  return new Program({ ...PumpfunIDL, address: address ? address.toBase58() : PumpfunIDL.address } as Pumpfun, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getPumpfunProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('5ENQgn6CTuDUxEyntSuuALPQBkJj9Fd917kyL3Kbwccc')
    case 'mainnet-beta':
    default:
      return PUMPFUN_PROGRAM_ID
  }
}
