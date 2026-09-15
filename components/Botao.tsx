import Link from "next/link";
import type { ReactNode } from "react";

import s from "./Botao.module.css";

export default function Botao({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className ? `${s.botao} ${className}` : s.botao}>
      {children}
    </Link>
  );
}
