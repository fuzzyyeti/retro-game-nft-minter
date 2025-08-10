import {
    mintV2,
    mplBubblegum,
} from '@metaplex-foundation/mpl-bubblegum';
import {
    mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import {
    createSignerFromKeypair,
    createGenericFile,
    some,
    signerIdentity, publicKey
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import fs from 'fs';
import path from 'path';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { askQuestion, closeRl } from './utils';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const umi = createUmi(process.env.RPC_URL!)
        .use(mplBubblegum())
        .use(mplTokenMetadata())
        .use(irysUploader({ address: process.env.IRYS_NODE! }));
    const walletFile = fs.readFileSync(process.env.KEY_PATH!, { encoding: 'utf-8' });
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(JSON.parse(walletFile)));
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer));

    let merkleTreePubKey = process.env.MERKLE_TREE_PUBKEY;
    if (!merkleTreePubKey) {
        merkleTreePubKey = await askQuestion('Enter the Merkle Tree Public Key: ');
    }
    const merkleTree = publicKey(merkleTreePubKey.trim());

    let collectionString = process.env.COLLECTION;
    if (!collectionString) {
        console.error('Error: COLLECTION is not set in .env. Please set COLLECTION to your collection public key.');
        closeRl();
        process.exit(1);
    }
    let collection = publicKey(collectionString);

    const mintAmount = parseInt(await askQuestion('How many NFTs do you want to mint? '));
    const imagePath = await askQuestion('Enter the file path for the image: ');
    const gbRomPath = await askQuestion('Enter the file path for the GB ROM: ');
    const nftName = await askQuestion('Enter the NFT name: ');
    const nftDescription = await askQuestion('Enter the NFT description: ');
    const traitsRaw = await askQuestion('Enter traits as comma-separated key:value pairs (e.g. Color:Red,Size:Large): ');
    const traits = traitsRaw.split(',').map(trait => {
        const [trait_type, value] = trait.split(':').map(s => s.trim());
        return { trait_type, value };
    }).filter(t => t.trait_type && t.value);
    const imageBuffer = fs.readFileSync(path.resolve(imagePath));
    const imageFile = createGenericFile(imageBuffer, path.basename(imagePath));
    const [imageUri] = await umi.uploader.upload([imageFile]);
    const gbRomBuffer = fs.readFileSync(path.resolve(gbRomPath));
    const gbRomFile = createGenericFile(gbRomBuffer, path.basename(gbRomPath));
    const [gbRomUri] = await umi.uploader.upload([gbRomFile]);
    const nftMetadata = {
        name: nftName,
        description: nftDescription,
        image: imageUri,
        attributes: traits,
        properties: {
            category: 'image',
            files: [
                { type: 'image/png', uri: imageUri },
                { type: 'application/x-gb-rom', uri: gbRomUri }
            ]
        },
        symbol: ''
    };
    const nftMetadataUri = await umi.uploader.uploadJson(nftMetadata);
    console.log(`Minting ${mintAmount} Compressed NFTs...`);
    for (let i = 0; i < mintAmount; i++) {
        console.log(`Minting Compressed NFT ${i + 1} of ${mintAmount}...`);
        console.log("collection:", collection.toString());
        const { signature } = await mintV2(umi, {
            leafOwner: keypair.publicKey,
            merkleTree,
            metadata: {
                name: nftName,
                uri: nftMetadataUri,
                sellerFeeBasisPoints: 500,
                collection: some(collection),
                creators: [
                    {
                        address: umi.identity.publicKey,
                        verified: true,
                        share: 100,
                    },
                ],
            },
        }).sendAndConfirm(umi, { send: { commitment: 'finalized' } });
        console.log('NFT minted! Signature:', signature);
    }
    closeRl();
}

main();
