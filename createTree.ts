import { createTreeV2 } from '@metaplex-foundation/mpl-bubblegum';
import {
    createSignerFromKeypair,
    generateSigner,
    signerIdentity,
    lamports,
    subtractAmounts,
    amountToString
} from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import fs from 'fs';
import { askQuestion, closeRl } from './utils';
import dotenv from 'dotenv';
dotenv.config();


async function main() {
    const isProduction = process.argv.includes('--prod') || process.argv.includes('-p');
    const umi = createUmi(process.env.RPC_URL!);
    const walletFile = fs.readFileSync(process.env.KEY_PATH!, { encoding: 'utf-8' });
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(JSON.parse(walletFile)));
    const signer = createSignerFromKeypair(umi, keypair);
    umi.use(signerIdentity(signer));
    const merkleTree = generateSigner(umi);
    console.log('Merkle Tree Public Key:', merkleTree.publicKey, '\nStore this address as you will need it later.');
    const mintAmountRaw = await askQuestion('How many NFTs do you want to mint? ');
    const mintAmount = Math.max(1, parseInt(mintAmountRaw));
    let maxDepth = 5;
    while ((1 << maxDepth) < 2 * mintAmount) {
        maxDepth++;
    }
    const canopyDepth = Math.max(0, maxDepth - 2);
    const maxBufferSize = 8;
    console.log(`Tree parameters: maxDepth=${maxDepth}, maxBufferSize=${maxBufferSize}, canopyDepth=${canopyDepth}`);
    const beforeLamports = await umi.rpc.getBalance(signer.publicKey);
    const tx = await (await createTreeV2(umi, {
        merkleTree,
        maxDepth,
        maxBufferSize,
        canopyDepth,
    })).buildWithLatestBlockhash(umi);
    const simResult = await umi.rpc.simulateTransaction(tx, {
        accounts: [signer.publicKey]
    });
    if( simResult?.err ) {
        console.log('Simulation error:', simResult.err);
        console.log(simResult.logs);
    }
    else if( simResult ) {
        const usedLamports =  subtractAmounts(beforeLamports,lamports(simResult.accounts![0]!.lamports));
        console.log('Amount of SOL needed to create merkle tree:', amountToString(usedLamports));
    } else {
        console.log('Simulation result:', simResult);
    }
    if (!isProduction) {
        console.log('\n=== DRY RUN MODE ===');
        console.log('Skipping actual tree creation.');
        console.log('Run with --prod or -p to execute for real.');
        closeRl();
        return;
    }
    console.log('\n=== PRODUCTION MODE ===');
    console.log('Creating Merkle tree...');
    const createTreeTx = await createTreeV2(umi, {
        merkleTree,
        maxDepth,
        maxBufferSize,
        canopyDepth,
    });
    await createTreeTx.sendAndConfirm(umi);
    closeRl();
}

main();
