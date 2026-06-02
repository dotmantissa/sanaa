"use client";

import { useState, useCallback } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { injected } from "wagmi/connectors";
import { encodePacked, keccak256 } from "viem";
import { useIsMiniPay } from "@/hooks/useIsMiniPay";
import {
  CUSD_ADDRESS,
  CUSD_ABI,
  PAYMENT_ABI,
  PAYMENT_CONTRACT_ADDRESS,
  IMAGE_PRICE_USDT,
  celo,
} from "@/lib/config";

const STYLES = [
  { id: "photo", label: "Photo", emoji: "📸", desc: "Photorealistic" },
  { id: "illustration", label: "Art", emoji: "🎨", desc: "Digital art" },
  { id: "logo", label: "Logo", emoji: "✦", desc: "Clean & minimal" },
  { id: "avatar", label: "Avatar", emoji: "👤", desc: "Portrait style" },
];

type Stage = "idle" | "approving" | "paying" | "generating" | "done" | "error";

export default function Home() {
  const isMiniPay = useIsMiniPay();
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photo");
  const [stage, setStage] = useState<Stage>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [payTxHash, setPayTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();
  useWaitForTransactionReceipt({ hash: approveTxHash });
  useWaitForTransactionReceipt({ hash: payTxHash });

  const handleConnect = useCallback(() => {
    connect({ connector: injected(), chainId: celo.id });
  }, [connect]);

  const isWrongNetwork = isConnected && chainId !== celo.id;

  const generate = useCallback(async () => {
    if (!prompt.trim() || !address) return;
    setStage("idle");
    setErrorMsg(null);
    setImageUrl(null);

    try {
      const newRequestId = keccak256(
        encodePacked(["address", "uint256"], [address, BigInt(Date.now())])
      );

      // Step 1: Approve USDT spend
      setStage("approving");
      const spender = PAYMENT_CONTRACT_ADDRESS || CUSD_ADDRESS;
      const approveTx = await writeContractAsync({
        address: CUSD_ADDRESS,
        abi: CUSD_ABI,
        functionName: "approve",
        args: [spender, IMAGE_PRICE_USDT],
        chainId: celo.id,
      });
      setApproveTxHash(approveTx);
      await new Promise((r) => setTimeout(r, 3000));

      // Step 2: Call payment contract
      setStage("paying");
      const payTx = await writeContractAsync({
        address: PAYMENT_CONTRACT_ADDRESS || CUSD_ADDRESS,
        abi: PAYMENT_ABI,
        functionName: "pay",
        args: [newRequestId],
        chainId: celo.id,
      });
      setPayTxHash(payTx);
      await new Promise((r) => setTimeout(r, 5000));

      // Step 3: Generate image
      setStage("generating");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          requestId: newRequestId,
          txHash: payTx,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Generation failed");
      }

      const data = (await res.json()) as { imageUrl: string };
      setImageUrl(data.imageUrl);
      setStage("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(msg);
      setStage("error");
    }
  }, [prompt, style, address, writeContractAsync]);

  const reset = () => {
    setStage("idle");
    setImageUrl(null);
    setErrorMsg(null);
    setApproveTxHash(undefined);
    setPayTxHash(undefined);
  };

  const shareToWhatsApp = () => {
    if (!imageUrl) return;
    const text = encodeURIComponent(`Made with Sanaa AI on Celo 🎨\n${imageUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const isProcessing = stage === "approving" || stage === "paying" || stage === "generating";

  const stageIndex = (s: Stage) =>
    ["idle", "approving", "paying", "generating", "done", "error"].indexOf(s);
  const currentIndex = stageIndex(stage);

  return (
    <main className="min-h-screen flex flex-col max-w-md mx-auto px-4 pt-6 pb-10">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-[#35D07F]">Sanaa</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">AI Image Studio · 0.05 USDT/image</p>
        </div>
        {!isConnected ? (
          <button
            onClick={handleConnect}
            className="text-sm px-4 py-2 rounded-xl bg-[#35D07F] text-black font-semibold"
          >
            Connect
          </button>
        ) : (
          <div className="text-right">
            <div className="text-xs text-zinc-400 font-mono">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </div>
            {isWrongNetwork && (
              <div className="text-xs text-red-400 mt-0.5">Wrong network</div>
            )}
          </div>
        )}
      </header>

      {isMiniPay && (
        <div className="mb-4 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-[#35D07F]">
          ✓ Running inside MiniPay
        </div>
      )}

      {/* Style selector */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStyle(s.id)}
            className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all text-xs font-medium ${
              style === s.id
                ? "border-[#35D07F] bg-[#35D07F]/10 text-[#35D07F]"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            <span className="text-lg">{s.emoji}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <div className="relative mb-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image… e.g. Professional headshot of a woman in a blue suit"
          maxLength={500}
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 resize-none outline-none focus:border-zinc-600 transition-colors"
        />
        <span className="absolute bottom-3 right-4 text-xs text-zinc-600">
          {prompt.length}/500
        </span>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between mb-5 px-1">
        <span className="text-xs text-zinc-500">No subscription needed</span>
        <span className="text-sm font-semibold text-white">
          0.05 <span className="text-[#35D07F]">USDT</span>
        </span>
      </div>

      {/* CTA */}
      {!isConnected ? (
        <button
          onClick={handleConnect}
          className="w-full py-4 rounded-2xl bg-[#35D07F] text-black font-bold text-base"
        >
          Connect Wallet to Generate
        </button>
      ) : stage === "done" ? (
        <button
          onClick={reset}
          className="w-full py-4 rounded-2xl border border-[#35D07F] text-[#35D07F] font-bold text-base"
        >
          Generate Another
        </button>
      ) : !isProcessing ? (
        <button
          onClick={generate}
          disabled={!prompt.trim() || isWrongNetwork}
          className="w-full py-4 rounded-2xl bg-[#35D07F] text-black font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Generate Image · 0.05 USDT
        </button>
      ) : null}

      {/* Error */}
      {stage === "error" && errorMsg && (
        <div className="mt-3 px-4 py-3 rounded-xl bg-red-950 border border-red-800 text-sm text-red-300">
          {errorMsg}
          <button onClick={reset} className="block mt-2 text-xs text-red-400 underline">
            Try again
          </button>
        </div>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="mt-6 space-y-3">
          <Step
            done={currentIndex > stageIndex("approving")}
            active={stage === "approving"}
            label="Approving USDT spend"
          />
          <Step
            done={currentIndex > stageIndex("paying")}
            active={stage === "paying"}
            label="Confirming payment on Celo"
          />
          <Step
            done={currentIndex > stageIndex("generating")}
            active={stage === "generating"}
            label="Generating your image"
          />
          <div className="pt-2 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[#35D07F] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Result */}
      {stage === "done" && imageUrl && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Generated image"
              className="w-full aspect-square object-cover"
            />
          </div>
          <div className="flex gap-3">
            <a
              href={imageUrl}
              download="sanaa-image.png"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-semibold text-sm text-center"
            >
              Download
            </a>
            <button
              onClick={shareToWhatsApp}
              className="flex-1 py-3 rounded-2xl bg-green-700 text-white font-semibold text-sm"
            >
              Share on WhatsApp
            </button>
          </div>
          <p className="text-center text-xs text-zinc-600">Made with Sanaa AI on Celo</p>
        </div>
      )}
    </main>
  );
}

function Step({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          done
            ? "bg-[#35D07F] text-black"
            : active
            ? "border-2 border-[#35D07F] text-[#35D07F]"
            : "border border-zinc-700 text-zinc-600"
        }`}
      >
        {done ? "✓" : ""}
      </div>
      <span
        className={`text-sm ${
          done ? "text-zinc-400" : active ? "text-white font-medium" : "text-zinc-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
