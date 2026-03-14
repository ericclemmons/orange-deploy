Based on [MVP](./004-mvp.md), I'm scaffolding up the "dashboard" app that will host most of the UX.

The key pieces are:

1. Lean into the Framework, not Cloudflare
   Meaning, I'm using [Vite+](https://viteplus.dev/guide/create) as my entrypoint. Not `npx cloudflare create` or `npx wrangler create` (I legitimately can't remember which is right?).

2. React + TypeScript

   ```shell
   vp create vite -- --template react-ts
   ```

   And then tying it together with https://developers.cloudflare.com/workers/vite-plugin/tutorial/

3. [Kumo](https://kumo-ui.com/) for the UI

4. [TanStack Router](https://tanstack.com/router/latest) for SPA routing

5. [Effect](https://github.com/Effect-TS/effect-smol) for TypeSafety

   This replaces [Hono](https://hono.dev/), [oRPC](https://orpc.unnoq.com)
