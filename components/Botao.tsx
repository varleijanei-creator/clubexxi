import Link from "next/link";
import type { ReactNode } from "react";

import s from "./Botao.module.css";

export default function Botao({
  href,
  children,
  className,
  target,
  rel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={className ? `${s.botao} ${className}` : s.botao}
    >
      {children}
    </Link>
  );
}
