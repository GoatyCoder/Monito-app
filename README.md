# Monito App - Refactoring C# + Blazor WASM

Questo repository è stato rifattorizzato verso una struttura enterprise-ready in C# con frontend Blazor WebAssembly e backend API, mantenendo per ora la persistenza locale e preparando l'integrazione Supabase.

## Nuova architettura

- `src/Monito.Domain`: regole dominio, entità, invarianti.
- `src/Monito.Application`: use-case e DTO applicativi.
- `src/Monito.Infrastructure`: repository locale e gateway Supabase-ready.
- `apps/Monito.Api`: backend HTTP Minimal API.
- `apps/Monito.Web`: frontend Blazor WASM.
- `docs/migration`: analisi logica legacy e roadmap evolutiva.

## Obiettivo tecnico

- Ridurre accoppiamento UI/business/data.
- Abilitare scalabilità e testabilità.
- Preparare switch verso Supabase senza rework delle regole business.

## Configurazione Supabase (non attiva localmente)

`apps/Monito.Api/appsettings.Development.json`:

```json
{
  "Supabase": {
    "Url": "",
    "AnonKey": ""
  }
}
```

Finché i valori restano vuoti, la modalità è locale in-memory.

## Deploy GitHub Pages (Blazor WASM) — passo passo

È stato aggiunto il workflow:

- `.github/workflows/deploy-gh-pages.yml`

### 1) Abilitare Pages nel repository

1. Vai su **Settings → Pages**.
2. In **Build and deployment**, seleziona **Source: GitHub Actions**.

### 2) Verificare branch di rilascio

Il workflow parte su:

- push su `main`
- esecuzione manuale con `workflow_dispatch`

Se usi un branch diverso, aggiorna il file workflow.

### 3) Commit e push

Esegui push su `main`:

```bash
git push origin main
```

### 4) Monitorare la pipeline

1. Vai su tab **Actions**.
2. Apri workflow **Deploy Blazor WASM to GitHub Pages**.
3. Verifica che i job `build` e `deploy` siano verdi.

### 5) Aprire il sito pubblicato

A deploy completato, l’URL è visibile:

- nel job `deploy` (output `page_url`)
- in **Settings → Pages**

Il workflow imposta automaticamente il `base href` del build pubblicato usando il nome repository (`/<repo-name>/`).

## Stato ambiente in questa sessione

Il runtime `dotnet` non è installato in ambiente di esecuzione, quindi il codice non è stato compilato in CI locale durante questa attività.

## Roadmap

Vedi `docs/migration/analysis-and-roadmap.md`.
