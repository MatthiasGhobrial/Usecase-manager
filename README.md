# BlueDolphin Use Case Editor

The "Save to repo" button in the use case editor commits the edited data as a
JSON file directly to a GitHub repository, so changes are centrally versioned
and everyone editing the hosted app shares the same source of truth. There is
no database in the loop — GitHub itself is the store.

## How it works

- `src/components/bluedolphin_usecase_editor.tsx` calls a Supabase Edge
  Function (`supabase/functions/save-to-github`) to load and save the data.
- The Edge Function holds the GitHub token as a server-side secret and talks
  to the GitHub Contents API — the token is never shipped to the browser.
- On load, it fetches `data/usecases.json` from the configured repo/branch.
- On save, it commits the new file content using the GitHub Contents API. If
  someone else committed in between (stale `sha`), GitHub returns 409 and the
  app shows a conflict dialog (reload their version, or overwrite with yours).

## One-time setup (required before "Save to repo" will work)

### 1. Create the GitHub repository

Create a new (can be private) repo to hold the data, e.g. `your-org/bluedolphin-usecases`.
No special layout is needed — the app creates `data/usecases.json` on first save.

### 2. Create a GitHub Personal Access Token

Create a **fine-grained PAT** (GitHub → Settings → Developer settings →
Personal access tokens → Fine-grained tokens):
- Repository access: only the repo you created above.
- Permissions: **Contents → Read and write**. Nothing else is needed.

Keep this token secret — do not paste it into chat, commit it, or put it in
`.env` (this repo's `.env` is not currently git-ignored).

### 3. Configure the Edge Function secrets

In the Supabase dashboard for this project → **Edge Functions → Secrets**
(or via `supabase secrets set` if you have the CLI installed), set:

| Secret | Example | Notes |
|---|---|---|
| `GITHUB_TOKEN` | `github_pat_...` | the PAT from step 2 |
| `GITHUB_OWNER` | `your-org` | repo owner/org |
| `GITHUB_REPO` | `bluedolphin-usecases` | repo name |
| `GITHUB_BRANCH` | `main` | optional, defaults to `main` |
| `GITHUB_FILE_PATH` | `data/usecases.json` | optional, defaults to `data/usecases.json` |

### 4. Deploy the Edge Function

With the Supabase CLI (`npm i -g supabase`, then `supabase login`):

```sh
supabase link --project-ref frujotjaprwpolbqegmo
supabase functions deploy save-to-github
```

If you don't have the CLI available, you can instead create the function
from the Supabase dashboard's Edge Functions editor and paste in the contents
of `supabase/functions/save-to-github/index.ts`.

### 5. Try it

Reload the app. First load seeds `data/usecases.json` in the repo with the
default use cases; from then on, "Save to repo" commits your edits there.

## Note on the old Supabase table

An earlier version of this app stored data in a `usecases` Postgres table
(see `supabase/migrations/`). That table is no longer read or written by the
app — GitHub is now the only source of truth. The table/migrations were left
in place rather than dropped, since deleting data wasn't part of this change;
delete them yourself if you want the DB fully cleaned up.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
