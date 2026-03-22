import { Text } from "@cloudflare/kumo";
import { createFileRoute } from "@tanstack/react-router";

import { type AccountState, type Repository } from "../../worker/AccountAgent";
import { Steps } from "../components/Steps";
import { loadAgent } from "../utils/loadAgent";

export const Route = createFileRoute("/_account/$orgName/$repoName")({
  beforeLoad: async ({ params }) => {
    using agent = await loadAgent<AccountState>(
      "account-agent",
      import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    );
    const { orgName, repoName } = params;

    const repository = await agent.client.call<Repository>("getRepository", [orgName, repoName]);

    return { repository };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { organization, organizations } = Route.useRouteContext();

  return (
    <>
      <Text variant="heading2">Choose a Project</Text>
      <Steps organizations={organizations} organization={organization} repositories={[]} />
    </>
  );
}
