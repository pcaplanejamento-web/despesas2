// StatusBadge — pílula colorida para status de empenho/liquidação/pagamento.
// Replica fiel do design: usa classes .status .status-{color} já definidas em dattago.css.

import { Check, FileText, Ban, Lock, type LucideIcon } from "lucide-react";

export type StatusKind = "Pago" | "Liquidado" | "Empenhado" | "Anulado" | "Retido";

interface StatusMeta {
  color: "blue" | "green" | "teal" | "amber" | "rose" | "violet";
  icon: LucideIcon;
}

const STATUS_MAP: Record<StatusKind, StatusMeta> = {
  Pago:       { color: "teal",   icon: Check },
  Liquidado:  { color: "green",  icon: Check },
  Empenhado:  { color: "blue",   icon: FileText },
  Anulado:    { color: "rose",   icon: Ban },
  Retido:     { color: "violet", icon: Lock },
};

interface StatusBadgeProps {
  status: StatusKind;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = STATUS_MAP[status] ?? STATUS_MAP.Empenhado;
  const Icon = meta.icon;
  return (
    <span className={`status status-${meta.color}`}>
      <Icon size={11} strokeWidth={2} />
      {status}
    </span>
  );
}
