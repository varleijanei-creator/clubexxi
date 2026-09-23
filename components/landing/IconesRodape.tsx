/* Ícones simples do rodapé — SVG inline, sem biblioteca nem arquivo.
   Usam currentColor, então herdam a cor do link que os contém. */

export function IconeInstagram() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconeWhatsapp() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20l1.3-4.1A8 8 0 1 1 9 18.6L4 20z" />
      <path d="M8.5 9.5c0 3.5 2.5 6 6 6 .8 0 1-.6 1-1.2v-1c0-.4-.3-.7-.7-.8l-1.7-.4c-.3 0-.6 0-.8.3l-.4.5c-1-.5-1.9-1.4-2.4-2.4l.5-.4c.2-.2.3-.5.3-.8l-.4-1.7c-.1-.4-.4-.7-.8-.7h-1c-.6 0-1.2.2-1.2 1z" />
    </svg>
  );
}

export function IconeEmail() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}
