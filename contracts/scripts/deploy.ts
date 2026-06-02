import { ethers, network, run } from "hardhat";

// cUSD on Celo mainnet
const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
// cUSD on Alfajores
const CUSD_ALFAJORES = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Network:", network.name);

  const cusd = network.name === "celo" ? CUSD_MAINNET : CUSD_ALFAJORES;

  const SanaaPayment = await ethers.getContractFactory("SanaaPayment");
  const payment = await SanaaPayment.deploy(cusd, deployer.address);
  await payment.waitForDeployment();

  const address = await payment.getAddress();
  console.log("SanaaPayment deployed to:", address);

  if (network.name !== "hardhat") {
    console.log("Waiting for block confirmations...");
    await new Promise((r) => setTimeout(r, 15000));

    try {
      await run("verify:verify", {
        address,
        constructorArguments: [cusd, deployer.address],
      });
      console.log("Contract verified on Celoscan");
    } catch (e) {
      console.log("Verification failed (may already be verified):", e);
    }
  }

  console.log("\nAdd this to your .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
