"use client";
import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ variant = "primary", style, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #222",
    background: variant === "primary" ? "#222" : "#f3f3f3",
    color: variant === "primary" ? "#fff" : "#222",
    cursor: "pointer",
  };

  return <button {...props} style={{ ...base, ...style }} />;
}
