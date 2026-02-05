<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1T_GYkSUSi9j6Lgl5VAv4OtU-nK4aUxA8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Deploy su GitHub Pages

Questo repository include il workflow `.github/workflows/deploy-gh-pages.yml` che effettua build e deploy automatico su GitHub Pages ad ogni push su `main`.

### Setup richiesto
1. Vai su **Settings → Pages** del repository.
2. In **Build and deployment**, seleziona **Source: GitHub Actions**.
3. Esegui push su `main` (oppure avvia manualmente il workflow da tab **Actions**).

### Note base path
La configurazione Vite imposta automaticamente il `base` in GitHub Actions usando il nome repository (es. `/Monito-app/`). In locale resta `/`.


## Piano evoluzione anagrafiche (v2)

Per schema dati, validazioni centrali, wireframe UX testuale e migrazione localStorage:
- `docs/anagrafiche-v2-plan.md`
