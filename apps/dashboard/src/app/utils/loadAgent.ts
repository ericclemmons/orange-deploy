import { AgentClient } from "agents/client";

export async function loadAgent<AgentState>(agent: string, name?: string) {
  const { promise, resolve, reject } = Promise.withResolvers<AgentState>();

  const client = new AgentClient<AgentState>({
    agent,
    host: window.location.host,
    name,
    onStateUpdateError: reject,
    onStateUpdate: resolve,
  });

  return {
    client,
    state: await promise,
    [Symbol.dispose]: () => client.close(),
  };
}
