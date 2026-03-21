import { useAgent } from "agents/react";
import { useState } from "react";

import type { AccountAgent, AccountState } from "../../worker/AccountAgent";

export function useAccount() {
  const [account, setAccount] = useState<AccountState>();

  useAgent<AccountAgent, AccountState>({
    agent: "account-agent",
    name: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    onStateUpdate: (state) => setAccount(state),
  });

  return account;
}
