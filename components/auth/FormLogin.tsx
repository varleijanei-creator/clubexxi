"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FormLogin({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // Login nunca cria conta nova — quem pode entrar já existe em
        // `admins` ou `membros` (provisionados em outro lugar). Sem isso,
        // qualquer e-mail digitado aqui recebe um "link de acesso" não
        // solicitado, mesmo que nunca passe em ehAdmin().
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });

    setEnviando(false);
    if (error) {
      console.error("[auth] erro ao enviar magic link", error);
      setErro("Não foi possível enviar o link. Tente de novo em instantes.");
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <p className="text-sm text-[var(--c21-tinta)]">
        Enviamos um link de acesso pra <strong>{email}</strong>. Confira sua
        caixa de entrada.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <label
        htmlFor="email"
        className="text-sm font-semibold text-[var(--c21-tinta)]"
      >
        E-mail
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@clubexxi.com.br"
        className="rounded-[var(--c21-raio-sm)] border border-[var(--c21-linha)] bg-[var(--c21-papel)] px-3 py-2 text-sm text-[var(--c21-tinta)] outline-none focus:border-[var(--c21-foco)]"
      />
      {erro && <p className="text-sm text-[var(--c21-erro)]">{erro}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-[var(--c21-raio-pilula)] bg-[var(--c21-acao)] px-4 py-2.5 text-sm font-bold text-[var(--c21-papel)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? "Enviando…" : "Enviar link de acesso"}
      </button>
    </form>
  );
}
