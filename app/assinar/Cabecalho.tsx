import Link from "next/link";

import s from "./Cabecalho.module.css";

export default function Cabecalho() {
  return (
    <header className={s.cabecalho}>
      <Link href="/" className={s.link} aria-label="Voltar pra home do Clube 21">
        <img src="/clube21/logo.png" alt="Clube 21" className={s.logo} />
      </Link>
    </header>
  );
}
