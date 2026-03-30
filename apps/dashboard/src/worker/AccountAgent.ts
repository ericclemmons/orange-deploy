import { Agent, callable, getCurrentAgent, type Connection, type ConnectionContext } from "agents";
import { HTTPException } from "hono/http-exception";
import { parse } from "hono/utils/cookie";
import { produce } from "immer";
import { Octokit } from "octokit";

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

export type AccountConnectionState = {
  gh_token?: string;
};

export class AccountAgent extends Agent<Env, AccountState> {
  initialState: AccountState = {
    installations: {},
  };

  async onConnect(connection: Connection, ctx: ConnectionContext) {
    console.info(ctx.request.headers.get("cookie"));
    const { gh_token } = parse(ctx.request.headers.get("cookie") ?? "", "gh_token");
    console.info({ gh_token });
    connection.setState({ gh_token });
  }

  async getInstallation(installation_id: number) {
    const { data } = await githubApp.octokit.rest.apps.getInstallation({
      installation_id,
    });

    return data as Installation;
  }

  getInstallationByOwner(owner: Installation["account"]["login"]) {
    const installation = Object.values(this.state.installations).find(
      ({ account }) => account.login === owner,
    );

    if (!installation) {
      throw new Error(`You do not have access to ${owner}`);
    }

    return installation;
  }

  getOctokitByOwner(owner: Installation["account"]["login"]) {
    const installation = this.getInstallationByOwner(owner);

    return githubApp.getInstallationOctokit(installation.id);
  }

  @callable({ description: "Get a list of orgs on this account" })
  async getOrganizations() {
    return Object.values(this.state.installations).map(({ account }) => account);
  }

  @callable({ description: "Get a single repository from GitHub" })
  async getRepository(owner: Installation["account"]["login"], repo: string) {
    const octokit = await this.getOctokitByOwner(owner);
    const { data } = await octokit.rest.repos.get({ owner, repo });

    return data;
  }

  @callable({ description: "Get a list of repositories for the current account" })
  async searchRepositories(
    owner: Installation["account"]["login"],
    repo?: string,
  ): Promise<SearchRepositoriesResponse> {
    const auth = await this.verifyGitHubToken();
    const octokit = new Octokit({ auth });
    const { data } = await octokit.rest.search.repos({
      per_page: 10,
      q: [`archived:false`, `user:${owner}`, repo ? `${repo} in:name` : null]
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

  private async verifyGitHubToken() {
    const { connection } = getCurrentAgent() as { connection?: Connection<AccountConnectionState> };
    const gh_token = connection?.state?.gh_token;

    if (!gh_token) {
      throw new HTTPException(401, { message: "GitHub token cookie is required" });
    }

    return gh_token;
  }
}
