import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { PAYMENT_ABI, PAYMENT_CONTRACT_ADDRESS, celo } from "@/lib/config";

const publicClient = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

async function generateWithFal(prompt: string, style: string): Promise<string> {
  const stylePrompts: Record<string, string> = {
    photo: "photorealistic, high quality photography, professional",
    illustration: "digital illustration, vibrant colors, artistic",
    logo: "minimal logo design, clean, professional, vector style",
    avatar: "portrait avatar, professional headshot style, detailed face",
  };

  const enhancedPrompt = `${prompt}, ${stylePrompts[style] ?? stylePrompts.photo}`;

  const response = await fetch("https://fal.run/fal-ai/fast-sdxl", {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      negative_prompt: "blurry, low quality, distorted, ugly",
      image_size: "square_hd",
      num_inference_steps: 4,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Fal.ai error: ${err}`);
  }

  const data = (await response.json()) as { images: { url: string }[] };
  const url = data?.images?.[0]?.url;
  if (!url) throw new Error("No image returned from Fal.ai");
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

    // Verify payment on-chain
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

    const imageUrl = await generateWithFal(prompt, style ?? "photo");

    return NextResponse.json({ imageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("Generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
