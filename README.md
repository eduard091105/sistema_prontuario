# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Supabase Setup

1. Create a Supabase project.
2. In **SQL Editor**, run the SQL from `supabase/schema.sql`. Row Level Security (RLS) restricts each account to its own workspace.
3. In **Project Settings > API**, copy the Project URL and the public `anon`/`publishable` key. Never put the `service_role` key in the browser.
4. Copy `.env.example` to `.env.local`, replace the values, and restart Vite:

  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-public-key
  ```

5. Create an account on the app login screen. To skip confirmation during development, turn off **Confirm email** under **Authentication > Sign In / Providers > Email** in Supabase. This is a project-wide setting; every new signup will be affected.

The login screen's **Remember me** option keeps the session after closing the browser and remembers the email. When unchecked, the session lasts only until the browser session ends. Supabase email rate limits remain active; wait before retrying or configure your own SMTP provider under **Authentication > SMTP Settings**. The app translates the rate-limit response but cannot bypass Supabase's server-side limit.

The app stores each signed-in user's workspace in `public.clinic_workspaces.data` (JSONB) and saves changes automatically. `.env.local` is ignored by Git.

## Backups

Enable database backups for the Supabase project. For an independent copy, schedule an encrypted `pg_dump` to private storage, restrict access, define retention, and test restores regularly. The Excel export is useful for reports but is not a complete database backup. Clinical data is sensitive; apply appropriate LGPD safeguards.
