import { Empty, Link, Loader } from "@cloudflare/kumo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import type { AccountAgent, AccountState } from "../../worker/AccountAgent";
import { loadAgent } from "../utils/loadAgent";

export const Route = createFileRoute("/_account")({
  beforeLoad: async () => {
    using agent = await loadAgent<AccountAgent, AccountState>(
      "AccountAgent",
      import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    );

    const organizations = await agent.client.call("getOrganizations");

    return { account: agent.state, organizations };
  },
  component: AccountLayout,
  errorComponent: ({ error }) => {
    if (error.cause instanceof Response && error.cause.status === 401) {
      return (
        <Empty
          title={error.cause.statusText}
          contents={<Link href="/api/auth/github">Connect to GitHub</Link>}
        />
      );
    }

    return <Empty title={error.name} description={error.message} />;
  },
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
