"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Botão de sair, compartilhado entre /admin e /minha-conta — só muda o destino. */
export default function SairBotao({ destino }: { destino: string }) {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Não trava a navegação por causa disso — mesmo se o signOut falhar
      // (rede instável), o guard do servidor barra de novo se a sessão
      // ainda existir. Só loga pra não ficar sem rastro nenhum.
      console.error("[auth] erro ao sair", err);
    }
    router.replace(destino);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={sair}
      className="text-sm font-medium text-[var(--c21-vermelho)] underline underline-offset-2"
    >
      Sair
    </button>
  );
}
