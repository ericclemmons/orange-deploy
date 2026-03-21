import { AgentClient } from "agents/client";

export function loadAgentState<T>(agent: string, name?: string) {
  const { promise, resolve, reject } = Promise.withResolvers<T>();

  const client = new AgentClient({
    agent,
    name,
    host: window.location.host,
    onStateUpdateError: (error) => {
      client.close();
      reject(error);
    },
    onStateUpdate: (state: T) => {
      client.close();
      resolve(state);
    },
  });

  return promise;
}
