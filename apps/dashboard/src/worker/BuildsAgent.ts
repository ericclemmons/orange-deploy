import { Agent, callable } from "agents";
import { App } from "octokit";

export interface BuildsState {
  builds: unknown[];
  githubInstallationId: number | null;
}

export class BuildsAgent extends Agent<Env, BuildsState> {
  initialState: BuildsState = {
    builds: [],
    githubInstallationId: null,
  };

  @callable({ description: "List all repositories for the current GitHub installation" })
  async listRepos(): Promise<string[]> {
    if (!this.state.githubInstallationId) {
      throw new Error("GitHub installation ID is required");
    }

    const app = new App({
      appId: this.env.GITHUB_APP_ID,
      privateKey: this.env.GITHUB_APP_PRIVATE_KEY,
    });

    const repos = [];
    for await (const repo of app.eachRepository.iterator()) {
      repos.push(repo.repository.full_name);
    }

    return repos;
  }

  setGithubInstallationId(githubInstallationId: number) {
    this.setState({ ...this.state, githubInstallationId });
  }
}
