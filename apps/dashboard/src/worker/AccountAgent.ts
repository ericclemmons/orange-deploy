import { Agent, callable } from "agents";
import { produce } from "immer";

import { githubApp } from "./githubApp";

type Installation = Awaited<
  ReturnType<typeof githubApp.octokit.rest.apps.getInstallation>
>["data"] & {
  // Octokit doesn't include `simple-organization` type, which has `account.login`
  account: { login: string };
};

export type AccountState = {
  // TODO: This should've been done by `organization.login` for ease
  installations: Record<Installation["id"], Installation>;
};

export type SearchRepositoriesResponse = Awaited<
  ReturnType<typeof githubApp.octokit.rest.search.repos>
>["data"];

export type GetRepositoryResponse = Awaited<
  ReturnType<typeof githubApp.octokit.rest.repos.get>
>["data"];

export type Repository = SearchRepositoriesResponse["items"][number];

export class AccountAgent extends Agent<Env, AccountState> {
  initialState: AccountState = {
    installations: {},
  };

  async getInstallation(installation_id: number) {
    const { data } = await githubApp.octokit.rest.apps.getInstallation({
      installation_id,
    });

    return data as Installation;
  }

  @callable({ description: "Get a single repository from GitHub" })
  async getRepository(owner: Installation["account"]["login"], repo: string) {
    // TODO: This should be some AuthZ wrapper/middleware that can be used for multiple callabout methods.
    // The goal is to ensure any calls are scoped to this account's approved installations.
    const installation = Object.values(this.state.installations).find(
      ({ account }) => account.login === owner,
    );

    if (!installation) {
      throw new Error(`You do not have access to ${owner}`);
    }

    const octokit = await githubApp.getInstallationOctokit(installation.id);
    const { data } = await octokit.rest.repos.get({ owner, repo });

    return data;
  }

  @callable({ description: "Get a list of repositories for the current account" })
  async searchRepositories(
    orgName: Installation["account"]["login"],
    repoName?: string,
  ): Promise<SearchRepositoriesResponse> {
    const installation = Object.values(this.state.installations).find(
      ({ account }) => account.login === orgName,
    );

    if (!installation) {
      throw new Error(`You do not have access to ${orgName}`);
    }

    const octokit = await githubApp.getInstallationOctokit(installation.id);

    const { data } = await octokit.rest.search.repos({
      per_page: 10,
      q: [`user:${installation.account.login}`, repoName ? `${repoName} in:name` : null]
        .filter(Boolean)
        .join(" "),
      sort: "updated",
    });

    return data;
  }

  @callable({ description: "Store a GitHub installation on the current account" })
  async saveInstallation(installation_id: Installation["id"]): Promise<Installation> {
    const installation = await this.getInstallation(installation_id);

    this.setState(
      produce(this.state, (draft) => {
        draft.installations[installation_id] = installation;
      }),
    );

    return installation;
  }
}
