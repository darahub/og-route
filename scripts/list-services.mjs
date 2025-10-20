import 'dotenv/config';
import { ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';

const rpc = 'https://evmrpc-testnet.0g.ai';
const pk = process.env.VITE_ZEROG_PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!pk) {
  console.error('Missing private key in env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(rpc);
const wallet = new ethers.Wallet(pk, provider);

const run = async () => {
  const broker = await createZGComputeNetworkBroker(wallet);
  const services = await broker.inference.listService();
  console.log('Services count:', services.length);
  for (const s of services) {
    try {
      const meta = await broker.inference.getServiceMetadata(s.provider);
      console.log(`Provider: ${s.provider}`);
      console.log(`  Endpoint: ${meta.endpoint}`);
      console.log(`  Model: ${meta.model}`);
    } catch (err) {
      console.log(`Provider: ${s.provider}`);
      console.log('  Failed to fetch metadata:', err?.message);
    }
  }
};

run().catch(e => { console.error(e); process.exit(1); });