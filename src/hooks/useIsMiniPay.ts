import { useEffect, useState } from "react";

export function useIsMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isMini =
        ua.includes("MiniPay") ||
        !!(window as { ethereum?: { isMiniPay?: boolean } }).ethereum?.isMiniPay;
      setIsMiniPay(isMini);
    }
  }, []);

  return isMiniPay;
}
