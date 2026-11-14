# Sushi Roll To Go

Monorepo del negocio.

| Carpeta | Qué es | Deploy |
|---|---|---|
| `landing/` | Landing page pública (Next.js) | Vercel (Root Directory: `landing`) |
| `app-gastos/` | App interna de gastos (Next.js + SQLite) | Local |

## Desarrollo

Cada proyecto es independiente, con su propio `package.json`:

```bash
cd landing && npm install && npm run dev
cd app-gastos && npm install && npm run dev
```
