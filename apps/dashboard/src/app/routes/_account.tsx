import { Loader } from "@cloudflare/kumo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import type { AccountState } from "../../worker/AccountAgent";
import { loadAgentState } from "../utils/loadAgentState";

export const Route = createFileRoute("/_account")({
  async beforeLoad() {
    const account = await loadAgentState<AccountState>(
      "account-agent",
      import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    );

    return { account };
  },
  loader: () => <Loader />,
  component: AccountLayout,
});

export function AccountLayout() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
