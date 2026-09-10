# Especificação — página `/assinar` (Clube 21)

Contexto: o backend já está pronto e testado. O que falta é a tela.
Não alterar a lógica de `/api/checkout` além do item 6 desta spec.

---

## 1. O que já existe (não recriar)

- `app/api/checkout/route.ts` — cria pedido + sessão de checkout no Asaas, devolve `{ url, checkoutId, pedidoId }`
- `app/api/planos/route.ts` — `GET /api/planos?ciclo=MONTHLY` → `{ planos: [{ slug, nome, tipo, valor, ciclo }] }`
- `app/api/afiliadas/route.ts` — `GET /api/afiliadas` → `{ afiliadas: [{ id, nome }] }`
- `lib/supabase/server.ts` — `createClient()` e `createServiceClient()`
- `lib/asaas.ts`
- Tailwind 4, Next 16 (App Router), React 19, TypeScript

---

## 2. Contrato de `/api/checkout` (corpo plano, snake_case)

Obrigatórios: `plano`, `nome`, `email`, `cpf`, `telefone`, `cep`, `logradouro`, `numero`, `bairro`, `cidade`, `uf`

Opcionais: `ciclo` (default `MONTHLY`), `complemento`, `pais` (default `BR`), `ponto_referencia`, `ref_code`

A rota valida e responde:
- `400` → `{ error: string, campos?: Record<string, string> }` — `campos` mapeia nome do campo → mensagem
- `502`/outros → `{ error: string, pedidoId?: string }`
- `200` → `{ url, checkoutId, pedidoId }`

O front deve exibir os erros de `campos` embaixo de cada input correspondente.

---

## 3. Arquivos a criar

```
app/assinar/page.tsx          — Server Component: lê searchParams, renderiza o form
app/assinar/FormAssinatura.tsx — Client Component: a tela
app/assinar/useFormAssinatura.ts — hook com toda a lógica e estado
lib/validacao.ts              — validarCPF, formatarCPF, formatarTelefone, formatarCEP
```

Separação obrigatória: nenhuma regra de negócio dentro do JSX. O componente
só renderiza o que o hook entrega. Motivo: o design ainda não existe e vai ser
trocado depois — a troca não pode encostar na lógica.

---

## 4. Comportamento

### Plano
- Lê `?plano=` da URL (`pessego`, `flor`, `semente`).
- Com plano válido: mostra no topo nome + valor formatado, e um link "trocar plano" que revela a escolha dos três.
- Sem plano ou plano inválido: mostra a escolha dos três já aberta.
- **Filtrar `tipo === "assinatura"`.** O plano `presente-edicao` existe no banco mas tem fluxo próprio, ainda não construído — não pode aparecer aqui.
- Valores vêm de `/api/planos`. Nenhum preço fixo no código.

### Indicação
- Lê `?ref=` da URL e preenche o campo.
- Se não veio pela URL: campo recolhido atrás de um botão de texto ("Tenho um código de indicação"), fechado por padrão.
- Enviado como `ref_code`.

### Afiliada
- Busca `/api/afiliadas` ao montar.
- **Lista vazia → o campo não é renderizado.** Nada de select vazio na tela.
- Com itens: `<select>` com os nomes, opção inicial vazia, rótulo "Quem te indicou o clube?" e a observação de que é opcional.
- Enviado como `afiliada_id`.

### CEP
- Ao completar 8 dígitos, busca `https://viacep.com.br/ws/{cep}/json/`.
- Preenche `logradouro`, `bairro`, `cidade`, `uf` e move o foco para `numero`.
- ViaCEP responde `{ erro: true }` para CEP inexistente → mensagem "CEP não encontrado", campos liberados para digitação manual.
- **Regra importante:** o Asaas valida o CEP contra a base dos Correios e **recusa CEP genérico de cidade (final `-000`)**, que é o CEP que representa o município inteiro e não uma rua. Se o ViaCEP devolver `logradouro` vazio, é esse caso: exibir "Esse CEP é o geral da cidade. Informe o CEP da sua rua" e não deixar seguir. Isso já derrubou testes reais — não é hipótese.
- Estado de carregando enquanto busca.

### CPF
- Validar dígitos verificadores no cliente, não só o tamanho.
- Rejeitar sequências repetidas (`111.111.111-11` etc.).
- Máscara visual; enviar só dígitos.

### Telefone
- Máscara `(11) 98765-4321`; enviar só dígitos.
- 10 ou 11 dígitos.
- Nota de campo: números implausíveis (ex. `11999999999`) são recusados pelo Asaas na criação do cliente.

### Envio
- Validar tudo no cliente antes de chamar a rota.
- Durante o envio: botão desabilitado + texto de carregando. Impedir duplo clique.
- `200` → `window.location.href = data.url` (o checkout do Asaas é externo, não usar `router.push`).
- `400` com `campos` → distribuir as mensagens nos inputs e rolar até o primeiro erro.
- Outros erros → mensagem geral no topo, mantendo o que foi digitado. Nunca perder os dados do formulário.

---

## 5. Visual

Sem design definido ainda. Fazer o mínimo legível com Tailwind: coluna única,
largura máxima confortável, campos empilhados, rótulos acima, mensagens de erro
em vermelho abaixo do campo. Sem cores de marca, sem fontes customizadas, sem
ilustração.

Isolar os inputs em componentes pequenos (`Campo`, `Select`, `Botao`) dentro do
próprio arquivo do formulário, para que a troca de estilo depois seja em um
lugar só.

---

## 6. Ajuste em `/api/checkout` (única alteração no backend)

Aceitar `afiliada_id` no corpo:

- Opcional, formato UUID; se vier em formato inválido, erro de validação
- Gravar em `pedidos.afiliado_id` (a FK para `afiliadas` já existe)
- Incluir em `dados_json` junto com `ref_code`
- Ausente ou vazio → `null`

Não alterar mais nada nessa rota: ela está testada ponta a ponta com o Asaas.

---

## 7. Como testar

1. `/assinar?plano=pessego` → mostra Pêssego a R$ 69,90
2. `/assinar` → mostra os três planos, sem o "Carta surpresa"
3. CEP `01310100` → preenche Avenida Paulista, Bela Vista, São Paulo, SP
4. CEP `13560000` → bloqueia com a mensagem do CEP geral
5. CPF `111.111.111-11` → recusado
6. Envio válido → redireciona para o checkout do Asaas
7. Conferir no Supabase: pedido gravado com `afiliado_id` preenchido quando escolhido

Cartão de teste do sandbox: `5162306219378829`, validade `05/2028`, CVV `318`.
