// src/hooks/useMobileDetect.ts
import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useMobileDetect(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.innerWidth <= MOBILE_BREAKPOINT ||
      "ontouchstart" in window
    );
  });

  useEffect(() => {
    const check = () => {
      setIsMobile(
        window.innerWidth <= MOBILE_BREAKPOINT ||
        "ontouchstart" in window
      );
    };
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
