import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { PAYMENT_ABI, PAYMENT_CONTRACT_ADDRESS, celo } from "@/lib/config";

const publicClient = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

const STYLE_PROMPTS: Record<string, string> = {
  photo: "photorealistic, high quality photography, professional lighting",
  illustration: "digital illustration, vibrant colors, artistic, detailed painting",
  logo: "minimalist logo, clean vector graphic, flat design, white background, centered",
  avatar: "professional portrait headshot, studio lighting, detailed facial features",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function generateImage(prompt: string, style: string): Promise<string> {
  const suffix = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.photo;
  const fullPrompt = `${prompt}, ${suffix}`;

  const res = await fetch(
    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: { num_inference_steps: 4, guidance_scale: 3.5 },
      }),
    },
  );

  if (res.status === 503) {
    throw new Error("Model is warming up — please try again in 30 seconds");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Generation failed: ${res.status}`);
  }

  const buf = await res.arrayBuffer();
  return `data:image/jpeg;base64,${arrayBufferToBase64(buf)}`;
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

    const imageUrl = await generateImage(prompt, style ?? "photo");
    return NextResponse.json({ imageUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
