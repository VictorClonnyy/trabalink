# Trabalink: aplicação funcional

Versão com back-end das telas WF-01 a WF-08: contas com senha, banco de dados compartilhado, conversa entre as partes, localização por CEP (ViaCEP) e as regras RN01–RN08 validadas no servidor.

```
trabalink-app/
├── public/            front-end (index.html, css, js)
├── api/trabalink.js   função serverless da Vercel (recebe todas as rotas /api/*)
├── lib/app.js         rotas, sessão e regras de negócio
├── lib/db.js          banco: Neon (Vercel) ou PGlite (seu PC) + criação das tabelas
├── lib/seed.js        dados de demonstração
├── server-local.js    servidor para rodar no seu PC
└── vercel.json
```

## Rodar no seu PC

Precisa do Node.js 20 ou mais novo.

```bash
cd trabalink-app
npm install
npm run dev
```

Abra **http://localhost:3000**. O banco é criado sozinho na pasta `.dados-local` (Postgres embutido, sem instalar nada).

- Para testar a conversa, abra duas janelas: uma normal e uma anônima (Ctrl+Shift+N). Entre como **Carla** numa e como **João** na outra.
- Outras pessoas na mesma rede Wi-Fi acessam pelo endereço "na mesma rede" que aparece no terminal.
- `npm run reset` apaga tudo e recria os dados de demonstração.

Contas de teste (senha `demo1234`): carla@trabalink.dev e bruno@trabalink.dev (contratantes); joao@trabalink.dev e mariana@trabalink.dev (profissionais).

## Publicar na Vercel

1. **Enviar o projeto.** Escolha uma das opções:
   - **GitHub:** suba a pasta `trabalink-app` para um repositório e, na Vercel, use *Add New → Project → Import*. Em *Root Directory*, escolha `trabalink-app` se ela estiver dentro de outro repositório.
   - **Terminal:** dentro de `trabalink-app`, rode `npx vercel` e responda às perguntas. O padrão serve; o preset é "Other".
2. **Criar o banco.** No painel do projeto: *Storage → Create Database → Neon (Postgres) → Continue → Connect*. A Vercel cria a variável `DATABASE_URL` sozinha.
3. **Chave de sessão (recomendado).** Em *Settings → Environment Variables*, crie `SESSION_SECRET` com um texto longo e aleatório.
4. **Publicar de novo** para as variáveis valerem: *Deployments → ⋯ → Redeploy*, ou `npx vercel --prod`.

Na primeira visita, as tabelas e os dados de demonstração são criados automaticamente no Neon.

Para zerar o banco da Vercel: copie a `DATABASE_URL` do painel e rode, no seu PC:

```bash
DATABASE_URL="postgres://..." npm run reset
```

No PowerShell: `$env:DATABASE_URL="postgres://..."; npm run reset`.

## Como funciona

| Recurso | Implementação |
|---|---|
| Login | Senha com scrypt; sessão em cookie HttpOnly assinado (30 dias) |
| Privacidade (RN08) | O servidor só devolve propostas, contratações, conversas e notificações de quem está envolvido |
| Regras (RN02, RN04–RN07) | Validadas em `lib/app.js` antes de gravar, com atualização condicional (ex.: só aceita se a demanda ainda estiver `aberta`), o que impede contratação dupla (RNF15) |
| Conversa | Mensagens gravadas no banco. A tela da conversa busca novidades a cada 3 s e as outras telas a cada 8 s. Uma notificação por conversa não lida |
| ViaCEP | `GET /api/cep?cep=01001000` consulta `viacep.com.br` pelo servidor. Se falhar, o navegador tenta direto. Usado em demanda, perfil, serviço e no campo "Cidade ou região" da busca (aceita CEP) |

**Limites desta versão:**
- A atualização da conversa é por consulta periódica, não instantânea, porque as funções da Vercel não mantêm conexão aberta.
- Fotos e imagens do portfólio ficam no próprio banco, com até 1,5 MB cada. Para produção, use o Vercel Blob.
- Anexos de demanda guardam só o nome do arquivo.
- "Esqueci minha senha" não envia e-mail, porque exigiria um serviço de e-mail.

> **Relatório:** a RNF12 e a seção 4.4 dizem que o MVP não usa APIs externas. Com o ViaCEP, esses trechos precisam ser atualizados. No Bubble, a integração equivalente é feita pelo **API Connector**, que está disponível no plano gratuito.
