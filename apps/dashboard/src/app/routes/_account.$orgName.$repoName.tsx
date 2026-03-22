import { Loader } from "@cloudflare/kumo";
import { createFileRoute } from "@tanstack/react-router";

import type { AccountState, GetRepositoryResponse } from "../../worker/AccountAgent";
import { loadAgent } from "../utils/loadAgent";

export const Route = createFileRoute("/_account/$orgName/$repoName")({
  beforeLoad: async ({ params }) => {
    using agent = await loadAgent<AccountState>(
      "account-agent",
      import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    );

    const { orgName, repoName } = params;
    const repository = await agent.client.call<GetRepositoryResponse>("getRepository", [
      orgName,
      repoName,
    ]);

    return { repository };
  },
  pendingComponent: Loader,
});
