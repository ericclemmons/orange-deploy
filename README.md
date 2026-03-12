# Cloudflare Deploy

> Experiment for BYOB(uilds) for Workers &amp; Pages.

## Why?

[Pages][pages] & [Workers][workers] have a divergent offering & experience in both how they're hosted
and the UX within the Cloudflare Dashboard.

For those that prefer to deploy within their existing CI (e.g. GitHub, GitLab), [Pages Action][pages-action]
has been deprecated since 2024 and [Wrangler Action][wrangler-action] has been needing focus for over a year.

Since I've joined Cloudflare in 2026 as a Principal Systems Engineer and now the Engineering Manager of these
products, I want to ["steel man][steelman] the current system with this project as a [straw man][strawman]
by answering:

> **How simple _could_ this be?**

[pages]: https://pages.cloudflare.com/
[workers]: https://workers.cloudflare.com/
[wrangler-action]: https://github.com/cloudflare/wrangler-action
[pages-action]: https://github.com/cloudflare/pages-action
[steelman]: https://en.wikipedia.org/wiki/Straw_man#Steelmanning
[strawman]: https://en.wikipedia.org/wiki/Straw_man#Steelmanning