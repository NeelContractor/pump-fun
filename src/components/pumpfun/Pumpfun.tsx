"use client"
import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { usePumpfunProgram, usePumpfunAccountBySeed } from './pumpfun-data-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Coins, DollarSign, Flame, Plus, Wallet } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { WalletButton } from '../solana/solana-provider'

export default function PumpfunDashboard() {
  const { publicKey, connected } = useWallet()
  const { 
    // program, 
    programId, 
    listingAccounts, 
    listing, 
    buy, 
    sell, 
    burn 
  } = usePumpfunProgram()

  // Form states
  const [createForm, setCreateForm] = useState({
    seed: '',
    name: ''
  })
  const [tradeForm, setTradeForm] = useState({
    seed: '',
    amount: '',
    mintAddress: ''
  })
  const [selectedListing, setSelectedListing] = useState<number | null>(null)
  console.log(selectedListing);

  // Get listing data for selected seed
  const { 
    listingPda, 
    mintPda, 
    solVaultPda, 
    mintVaultPda, 
    listingQuery 
  } = usePumpfunAccountBySeed({ 
    seed: selectedListing || 0 
  })

  const handleCreateListing = async () => {
    if (!publicKey || !createForm.seed || !createForm.name) return

    try {
      await listing.mutateAsync({
        seed: parseInt(createForm.seed),
        name: createForm.name,
        signerPubkey: publicKey
      })
      setCreateForm({ seed: '', name: '' })
    } catch (error) {
      console.error('Error creating listing:', error)
    }
  }

  const handleBuy = async () => {
    if (!publicKey || !tradeForm.seed || !tradeForm.amount || !tradeForm.mintAddress) return

    try {
      await buy.mutateAsync({
        seed: parseInt(tradeForm.seed),
        userPubkey: publicKey,
        buyAmount: parseInt(tradeForm.amount),
        mintPubkey: new PublicKey(tradeForm.mintAddress)
      })
    } catch (error) {
      console.error('Error buying tokens:', error)
    }
  }

  const handleSell = async () => {
    if (!publicKey || !tradeForm.seed || !tradeForm.amount || !tradeForm.mintAddress) return

    try {
      await sell.mutateAsync({
        seed: parseInt(tradeForm.seed),
        userPubkey: publicKey,
        sellAmount: parseInt(tradeForm.amount),
        mintPubkey: new PublicKey(tradeForm.mintAddress)
      })
    } catch (error) {
      console.error('Error selling tokens:', error)
    }
  }

  const handleBurn = async () => {
    if (!publicKey || !tradeForm.seed || !tradeForm.amount || !tradeForm.mintAddress) return

    try {
      await burn.mutateAsync({
        seed: parseInt(tradeForm.seed),
        userPubkey: publicKey,
        burnAmount: parseInt(tradeForm.amount),
        mintPubkey: new PublicKey(tradeForm.mintAddress)
      })
    } catch (error) {
      console.error('Error burning tokens:', error)
    }
  }

  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div>
            <Alert className="max-w-md">
            <Wallet className="h-4 w-4" />
            <AlertDescription>
                Please connect your wallet to use Pumpfun
            </AlertDescription>
            </Alert>
            <div className='flex justify-center p-5'>
                <WalletButton />
            </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pumpfun Dashboard</h1>
          <p className="text-muted-foreground">Create and trade tokens on Solana</p>
        </div>
        <div className='grid gap-2'>
            <Badge variant="outline" className="text-sm">
                Program: {programId.toBase58().slice(0, 8)}...
            </Badge>
            <WalletButton />
        </div>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create">Create Listing</TabsTrigger>
          <TabsTrigger value="trade">Trade</TabsTrigger>
          <TabsTrigger value="listings">All Listings</TabsTrigger>
          <TabsTrigger value="details">Listing Details</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Listing
              </CardTitle>
              <CardDescription>
                Create a new token listing on Pumpfun
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seed">Seed</Label>
                    <Input
                      id="seed"
                      type="number"
                      placeholder="Enter seed number"
                      value={createForm.seed}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, seed: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Token Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter token name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleCreateListing}
                  className="w-full"
                  disabled={listing.isPending || !createForm.seed || !createForm.name}
                >
                  {listing.isPending ? 'Creating...' : 'Create Listing'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trade" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Tokens</CardTitle>
              <CardDescription>
                Buy, sell, or burn tokens from existing listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trade-seed">Seed</Label>
                    <Input
                      id="trade-seed"
                      type="number"
                      placeholder="Listing seed"
                      value={tradeForm.seed}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, seed: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trade-amount">Amount</Label>
                    <Input
                      id="trade-amount"
                      type="number"
                      placeholder="Token amount"
                      value={tradeForm.amount}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mint-address">Mint Address</Label>
                    <Input
                      id="mint-address"
                      placeholder="Token mint address"
                      value={tradeForm.mintAddress}
                      onChange={(e) => setTradeForm(prev => ({ ...prev, mintAddress: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <Button 
                    onClick={handleBuy}
                    disabled={buy.isPending || !tradeForm.seed || !tradeForm.amount || !tradeForm.mintAddress}
                    className="flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4" />
                    {buy.isPending ? 'Buying...' : 'Buy'}
                  </Button>
                  <Button 
                    onClick={handleSell}
                    disabled={sell.isPending || !tradeForm.seed || !tradeForm.amount || !tradeForm.mintAddress}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Coins className="h-4 w-4" />
                    {sell.isPending ? 'Selling...' : 'Sell'}
                  </Button>
                  <Button 
                    onClick={handleBurn}
                    disabled={burn.isPending || !tradeForm.seed || !tradeForm.amount || !tradeForm.mintAddress}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Flame className="h-4 w-4" />
                    {burn.isPending ? 'Burning...' : 'Burn'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Listings</CardTitle>
              <CardDescription>
                View all active token listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {listingAccounts.isLoading ? (
                <p>Loading listings...</p>
              ) : listingAccounts.data?.length === 0 ? (
                <p className="text-muted-foreground">No listings found</p>
              ) : (
                <div className="space-y-4">
                  {listingAccounts.data?.map((account, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Listing #{index + 1}</h3>
                        <Badge variant="secondary">
                          {account.publicKey.toBase58().slice(0, 8)}...
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Account:</span> {account.publicKey.toBase58()}
                        </div>
                        <div>
                          {/* <span className="text-muted-foreground">Data:</span> {JSON.stringify(account.account)} */}
                          <span className="text-muted-foreground">Data:</span> 
                            {/* <span className=''>
                                <div>
                                    Token Name: {account.account.name}
                                </div>
                                <div>
                                    Token Mint: {account.account.mint.toBase58()}
                                </div>
                            </span> */}
                            <div className="space-y-1 text-sm">
                                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                                    <div>
                                        Token Name: {account.account.name}
                                    </div>
                                    <div>
                                        Token Mint: {account.account.mint.toBase58()}
                                    </div>
                                </pre>
                            </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedListing(account.account.seed.toNumber())}
                      >
                        View Details
                      </Button>
                      <p className='text-sm text-gray-400'>On Clicking to View Details Button you can find all details for that token on Listing Details tabs</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Listing Details</CardTitle>
              <CardDescription>
                View detailed information about a specific listing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label htmlFor="detail-seed">Seed:</Label>
                  <Input
                    id="detail-seed"
                    type="number"
                    placeholder="Enter seed to view details"
                    value={selectedListing || ''}
                    onChange={(e) => setSelectedListing(parseInt(e.target.value) || null)}
                    className="max-w-xs"
                  />
                </div>

                {selectedListing && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Program Derived Addresses</h4>
                        <div className="space-y-1 text-sm">
                          <div><strong>Listing PDA:</strong> {listingPda.toBase58()}</div>
                          <div><strong>Mint PDA:</strong> {mintPda.toBase58()}</div>
                          <div><strong>Sol Vault PDA:</strong> {solVaultPda.toBase58()}</div>
                          <div><strong>Mint Vault PDA:</strong> {mintVaultPda.toBase58()}</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">Listing Data</h4>
                        {listingQuery.isLoading ? (
                          <p>Loading...</p>
                        ) : listingQuery.error ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Error loading listing data: {listingQuery.error.message}
                            </AlertDescription>
                          </Alert>
                        ) : listingQuery.data ? (
                          <div className="space-y-1 text-sm">
                            <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                              {JSON.stringify(listingQuery.data, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}