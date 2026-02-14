import type { ReactNode } from "react";

interface InstanceCardProps {
  children?: ReactNode;
}

export function InstanceCard({ children }: InstanceCardProps) {
  return <div className="w-full">{children}</div>;
}
