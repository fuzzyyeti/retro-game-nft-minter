# Game ROM NFT Minter

A TypeScript CLI toolkit for creating and minting compressed NFTs (cNFTs) and collection NFTs on Solana using Metaplex Bubblegum and Token Metadata standards.

## Features
- Create a Merkle tree for cNFTs
- Mint compressed NFTs with custom metadata and files
- Create a collection NFT for grouping cNFTs
- All scripts use interactive prompts for user input

## Setup
1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create your `.env` file:**
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your RPC URL, wallet key path, Irsy node, and public keys. Add merkel tree after
    creating it with `createTree.ts`, and add collection NFT public key after creating it with `createCollection.ts`.

## Environment Variables
See `.env.example` for all required and optional variables:
- `RPC_URL`: Solana RPC endpoint
- `KEY_PATH`: Path to your wallet keypair JSON
- `IRYS_NODE`: Irsy node endpoint for uploads
- `MERKLE_TREE_PUBKEY`: Merkle tree public key (for minting)
- `COLLECTION`: Collection NFT public key (required for minting)

## Usage

### 1. Create a Merkle Tree
```bash
npx ts-node createTree.ts
```
- Dry run is defualt. Use --production or -p to create a real Merkle tree.
- Prompts for number of NFTs and creates a Merkle tree.
- Prints the Merkle tree public key (save this for minting).

### 2. Create a Collection NFT
```bash
npx ts-node createCollection.ts
```
- Prompts for image path, collection name, and external URL.
- Mints a collection NFT and prints its public key.

### 3. Mint NFTs
```bash
npx ts-node mintNfts.ts
```
