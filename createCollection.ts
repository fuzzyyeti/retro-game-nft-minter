import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata, createNft } from '@metaplex-foundation/mpl-token-metadata';
import {
    createGenericFile,
    createSignerFromKeypair,
    generateSigner,
    signerIdentity,
    some,
    none
} from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import { askQuestion, closeRl } from './utils';
import { createCollection, createCollectionV2, plugin, pluginKeyToPluginType } from '@metaplex-foundation/mpl-core';

async function main() {
    const umi = createUmi(process.env.RPC_URL!)
        .use(mplTokenMetadata())
        .use(irysUploader({ address: process.env.IRYS_NODE! }));

    const walletFile = fs.readFileSync(process.env.KEY_PATH!, { encoding: 'utf-8' });
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(JSON.parse(walletFile)));
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer));

    // Prompt for collection image path
    const collectionImagePath = await askQuestion('Enter the file path for the collection image: ');
    const collectionImageFile = fs.readFileSync(collectionImagePath);
    const genericCollectionImageFile = createGenericFile(collectionImageFile, 'collection.png');
    const [collectionImageUri] = await umi.uploader.upload([genericCollectionImageFile]);

    // Prompt for collection name
    const collectionName = await askQuestion('Enter the collection name: ');
    // Prompt for external URL
    const externalUrl = await askQuestion('Enter the external URL for the collection: ');

    const collectionSigner = generateSigner(umi);

    const collectionMetadata = {
        name: collectionName,
        image: collectionImageUri,
        externalUrl,
        properties: {
            files: [
                {
                    uri: collectionImageUri,
                    type: 'image/png',
                },
            ],
        },
    };

    const collectionMetadataUri = await umi.uploader.uploadJson(collectionMetadata);


    await createCollection(umi,
    {
        collection: collectionSigner,
        name: collectionName,
        uri: collectionMetadataUri,
        plugins: [
            {
                type: "BubblegumV2",
            },
        ],
    }).sendAndConfirm(umi);

    console.log('Collection NFT created! Public Key:', collectionSigner.publicKey);
    closeRl();
}

main();
