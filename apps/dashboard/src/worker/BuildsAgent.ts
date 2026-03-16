import { Agent } from "agents";

export interface BuildsState {
  builds: unknown[];
  githubInstallationId: string | null;
}

export class BuildsAgent extends Agent<Env, BuildsState> {
  initialState: BuildsState = {
    builds: [],
    githubInstallationId: null,
  };

  setGithubInstallationId(githubInstallationId: string) {
    this.setState({ ...this.state, githubInstallationId });
  }
}
