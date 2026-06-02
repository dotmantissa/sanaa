import { defineChain } from "viem";

export const celo = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://forno.celo.org"] },
  },
  blockExplorers: {
    default: { name: "Celo Explorer", url: "https://celoscan.io" },
  },
});

export const celoAlfajores = defineChain({
  id: 44787,
  name: "Celo Alfajores",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://alfajores-forno.celo-testnet.org"] },
  },
  blockExplorers: {
    default: {
      name: "Celo Alfajores Explorer",
      url: "https://alfajores.celoscan.io",
    },
  },
  testnet: true,
});

// cUSD on Celo mainnet
export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// USDT on Celo mainnet
export const USDT_ADDRESS = "0x617f3112bf5397D0467D315cC709EF968D9ba546" as const;

// Fee adapter for gas-free USDT transactions
export const FEE_ADAPTER_ADDRESS = "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72" as const;

// ERC-8004 agent registry on Celo
export const AGENT_REGISTRY_ADDRESS = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

// Price per image in USDT (6 decimals)
export const IMAGE_PRICE_USDT = 50000n; // 0.05 USDT

// Contract address (set after deployment)
export const PAYMENT_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "") as `0x${string}`;

export const CUSD_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const PAYMENT_ABI = [
  {
    type: "function",
    name: "pay",
    inputs: [{ name: "requestId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "hasPaid",
    inputs: [{ name: "requestId", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "GenerationPaid",
    inputs: [
      { name: "payer", type: "address", indexed: true },
      { name: "requestId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
