/* eslint-disable @next/next/no-img-element -- tiny static brand marks from /public; next/image adds nothing here */
import { Banknote } from "lucide-react";
import type { PaymentMethod } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Official acceptance marks for each payment method, served from /public/payments.
 * Sources are listed in README.md. Cash on delivery has no brand mark.
 */
const marks: Record<Exclude<PaymentMethod, "cod">, { label: string; logos: { src: string; className?: string }[] }> = {
  card: {
    label: "Visa · Mastercard",
    logos: [
      { src: "/payments/visa.svg", className: "h-[42%]" },
      { src: "/payments/mastercard.svg", className: "h-[62%]" },
    ],
  },
  mpesa: { label: "M-Pesa", logos: [{ src: "/payments/mpesa.svg", className: "h-[92%]" }] },
  mixx: { label: "Mixx by Yas", logos: [{ src: "/payments/mixx.svg", className: "h-[72%]" }] },
  airtel: { label: "Airtel Money", logos: [{ src: "/payments/airtel.svg", className: "h-[76%]" }] },
  halopesa: { label: "HaloPesa", logos: [{ src: "/payments/halopesa.png", className: "h-[52%]" }] },
  tpesa: { label: "T-Pesa", logos: [{ src: "/payments/tpesa.png", className: "h-[86%] rounded-[3px]" }] },
  azampesa: { label: "AzamPesa", logos: [{ src: "/payments/azampesa.png", className: "h-[62%]" }] },
};

export function PaymentMark({ method, className }: { method: PaymentMethod; className?: string }) {
  const base = "inline-flex h-7 min-w-14 shrink-0 items-center justify-center gap-1 rounded-md border border-black/5 bg-white px-1.5 shadow-xs";
  if (method === "cod") {
    return (
      <span className={cn(base, "gap-1 text-[10px] font-bold text-emerald-700", className)} role="img" aria-label="Cash on delivery">
        <Banknote className="h-[60%] w-auto" />
        CASH
      </span>
    );
  }
  const m = marks[method];
  return (
    <span className={cn(base, className)} role="img" aria-label={m.label} title={m.label}>
      {m.logos.map((logo) => (
        <img key={logo.src} src={logo.src} alt="" draggable={false} className={cn("w-auto max-w-full object-contain", logo.className)} />
      ))}
    </span>
  );
}

export const ONLINE_METHODS: PaymentMethod[] = ["mpesa", "mixx", "airtel", "halopesa", "tpesa", "azampesa", "card"];
export const MOBILE_MONEY: PaymentMethod[] = ["mpesa", "mixx", "airtel", "halopesa", "tpesa", "azampesa"];
