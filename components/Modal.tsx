"use client";
import { ReactNode } from "react";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <section aria-label={title} style={{ padding: "12px 0", borderTop: "1px solid #e5e5e5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button onClick={onClose}>Close</button>
      </div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </section>
  );
}
