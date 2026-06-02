# Sanaa — Pay-Per-Request AI Image Studio on Celo

> Generate AI images for **0.05 USDT** — no subscription, no credit card. Built for MiniPay users.

## What it is

Sanaa lets any MiniPay user in Nigeria, Kenya, Ghana, or Colombia pay $0.05 to generate one AI image — a flyer, WhatsApp post, CV photo, or wedding invitation. No monthly subscription required.

Built for [Proof of Ship Season 2](https://talent.app) on Celo.

## Architecture

```
User (MiniPay)
    │
    ▼
MiniApp (Next.js, App Router)
    │  0.05 cUSD via SanaaPayment.sol
    ▼
SanaaPayment Contract (Celo Mainnet)
    │  on-chain payment verified
    ▼
/api/generate (Next.js route)
    │
    ▼
Fal.ai (fast-sdxl image generation)
    │
    ▼
Image URL → display + download/share
```

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS v4
- **Wallet**: wagmi v2 + viem (MiniPay compatible — no ethers.js)
- **Smart Contract**: Solidity 0.8.20, Hardhat, deployed on Celo
- **Image Generation**: Fal.ai fast-sdxl (~$0.006/image, charge $0.05 → ~85% margin)
- **Payment Token**: cUSD (Celo Dollar, 18 decimals)

## Quick Start

### Frontend

```bash
npm install
cp .env.example .env.local
# Fill in FAL_API_KEY and NEXT_PUBLIC_CONTRACT_ADDRESS
npm run dev
```

### Smart Contract

```bash
cd contracts
npm install
cp ../.env.example .env
# Set PRIVATE_KEY and CELOSCAN_API_KEY in .env

# Deploy to Alfajores testnet
npm run deploy:alfajores

# Deploy to Celo mainnet
npm run deploy:celo

# Run tests
npm test
```

## Deployment

Deploy to Vercel:

```bash
npm i -g vercel
vercel --prod
```

Set env vars in Vercel dashboard:
- `FAL_API_KEY`
- `NEXT_PUBLIC_CONTRACT_ADDRESS`

## Contract Addresses

| Network | Contract | Address |
|---------|----------|---------|
| Celo Mainnet | SanaaPayment | TBD after deployment |
| Celo Alfajores | SanaaPayment | TBD after deployment |

## License

MIT
