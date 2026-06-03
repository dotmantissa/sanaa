import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { PAYMENT_ABI, PAYMENT_CONTRACT_ADDRESS, celo } from "@/lib/config";

const publicClient = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

const STYLE_SUFFIXES: Record<string, string> = {
  photo: "photorealistic, high quality photography, professional lighting",
  illustration: "digital illustration, vibrant colors, artistic, detailed",
  logo: "minimal logo design, clean vector style, professional, white background",
  avatar: "portrait avatar, professional headshot, detailed face, studio lighting",
};

async function generateWithPollinations(prompt: string, style: string): Promise<string> {
  const suffix = STYLE_SUFFIXES[style] ?? STYLE_SUFFIXES.photo;
  const fullPrompt = `${prompt}, ${suffix}`;
  const encoded = encodeURIComponent(fullPrompt);
  const seed = Math.floor(Math.random() * 1_000_000);

  // Pollinations returns the image directly at this URL — no API key needed
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

  // Verify the URL resolves to an actual image before returning
  const check = await fetch(url, { method: "HEAD" });
  if (!check.ok) throw new Error("Image generation failed");

  return url;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, style, requestId, txHash } = (await req.json()) as {
      prompt: string;
      style: string;
      requestId: string;
      txHash: string;
    };

    if (!prompt || !requestId || !txHash) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (prompt.length > 500) {
      return NextResponse.json({ error: "Prompt too long" }, { status: 400 });
    }

    // Verify payment on-chain when contract is deployed
    if (PAYMENT_CONTRACT_ADDRESS) {
      const hasPaid = await publicClient.readContract({
        address: PAYMENT_CONTRACT_ADDRESS,
        abi: PAYMENT_ABI,
        functionName: "hasPaid",
        args: [requestId as `0x${string}`],
      });

      if (!hasPaid) {
        return NextResponse.json({ error: "Payment not found on-chain" }, { status: 402 });
      }
    }

    const imageUrl = await generateWithPollinations(prompt, style ?? "photo");

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("Generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
