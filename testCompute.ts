import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const broker = await createZGComputeNetworkBroker(wallet);

  const services = await broker.inference.listService();

  const providerAddress = services[0][0];
    
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
  console.log("Endpoint:", endpoint);
  console.log("Model:", model);
  await broker.inference.acknowledgeProviderSigner(providerAddress);

  // await broker.inference.acknowledgeProviderSigner(providerAddress).then(() => console.log("Provider acknowledged")).catch(console.error);

}

main().catch(console.error);