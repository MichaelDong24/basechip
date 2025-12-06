"use client";
import type { Result } from "@zxing/library";
import { useZxing } from "react-zxing";

type CameraProps = {
  onDecoded: (value: string) => void;
  onError?: (error: unknown) => void;
  className?: string;
};

export function Camera({ onDecoded, onError, className }: CameraProps) {
  const { ref } = useZxing({
    onDecodeResult: (result: Result) => {
      const value = result.getText();
      if (value) onDecoded(value);
    },
    onError,
    constraints: {
      video: { facingMode: "environment" },
    },
  });

  return <video ref={ref} className={className} />;
}
