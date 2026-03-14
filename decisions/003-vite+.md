[Vite+](https://viteplus.dev/) literally dropped yesterday which replaces the need for explicitly
having [Oxide](./000-oxide.md).

This will also remove the need for `turbo`, `nvm`, etc.

1. `curl -fsSL https://vite.plus | bash`
1. `vp env pin lts`
1. `vp migrate`
1. Removed `ultracite`, `husky`, and most `.ox*` files
1. https://viteplus.dev/guide/ide-integration doesn't have Cursor, so installing Oxc & Vitest per https://marketplace.visualstudio.com/items?itemName=VoidZero.vite-plus-extension-pack
1. Disable Prettier extension to see if that fixes format on save
1. Stuck with \_Running 'Oxc' Formatter' on save
1. There's a stupid bug with Oxc extension that's using v0.38 in _this_ project but v0.40 in `/tmp` projects.
1. Aha! In a parent directory I had `oxfmt` at a different version that was being used instead!
