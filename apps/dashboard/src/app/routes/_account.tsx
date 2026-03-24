import { Loader } from "@cloudflare/kumo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import type { AccountAgent, AccountState } from "../../worker/AccountAgent";
import { loadAgent } from "../utils/loadAgent";

export const Route = createFileRoute("/_account")({
  beforeLoad: async () => {
    using agent = await loadAgent<AccountAgent, AccountState>(
      "account-agent",
      import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    );

    const organizations = agent.state
      ? Object.values(agent.state.installations)
          .map(({ account }) => account)
          .toSorted((a, b) => a.login.localeCompare(b.login))
      : [];

    return { account: agent.state, organizations };
  },
  component: AccountLayout,
  pendingComponent: Loader,
});

export function AccountLayout() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
