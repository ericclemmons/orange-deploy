import { Agent, callable } from "agents";
import { env } from "cloudflare:workers";
import { produce } from "immer";
import { App } from "octokit";

const github = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY,
});

type Installation = Awaited<ReturnType<typeof github.octokit.rest.apps.getInstallation>>["data"];

export type AccountState = {
  installations: Record<Installation["id"], Installation>;
};

export class AccountAgent extends Agent<Env, AccountState> {
  initialState: AccountState = {
    installations: {},
  };

  async getInstallation(installation_id: number) {
    const { data } = await github.octokit.rest.apps.getInstallation({
      installation_id,
    });

    return data;
  }

  @callable({ description: "Store a GitHub installation on the current account" })
  async saveInstallation(installation_id: Installation["id"]): Promise<Installation> {
    const installation = await this.getInstallation(installation_id);
    console.info({ installation });

    this.setState(
      produce(this.state, (draft) => {
        if (Array.isArray(draft.installations)) {
          draft.installations = {};
        }

        draft.installations[installation_id] = installation;
      }),
    );

    return installation;
  }
}
