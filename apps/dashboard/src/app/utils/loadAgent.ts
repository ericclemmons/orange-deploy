import { AgentClient } from "agents/client";

export function loadAgent<AgentState>(agent: string, name?: string) {
  const { promise, resolve, reject } = Promise.withResolvers<AgentState>();
  const { host } = window.location;

  const client = new AgentClient<AgentState>({
    agent,
    name,
    host,
    onStateUpdateError: (error) => {
      client.close();
      reject(error);
    },
    onStateUpdate: (state) => {
      client.close();
      resolve(state);
    },
  });

  return promise;
}
