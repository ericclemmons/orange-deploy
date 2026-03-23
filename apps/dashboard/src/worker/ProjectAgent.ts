import { Agent, callable, getAgentByName } from "agents";
import type { WorkflowInfo } from "agents/workflows";
import { produce } from "immer";

import type { BuildWorkflowProgress, BuildWorkflowResult, Commit } from "./BuildWorkflow";
import { githubApp } from "./githubApp";

export interface ProjectState {
  progress: Record<WorkflowInfo["workflowId"], BuildWorkflowProgress>;
}

export type BuildWorkflowInfo = WorkflowInfo & {
  metadata: {
    owner: string;
    repo: string;
    commit: Commit;
    branch?: string;
  };
};

export class ProjectAgent extends Agent<Env, ProjectState> {
  initialState: ProjectState = { progress: {} };

  @callable({ description: "Create a build for a commit or branch" })
  async createBuild(
    // Always require these
    params: { owner: string; repo: string } &
      // Infer commit from branch, or explicitly provide a commit
      ({ branch: string } | { branch?: string; commit: string }),
  ) {
    const { owner, repo } = params;
    const commit = await this.getCommit(
      owner,
      repo,
      "commit" in params ? params.commit : params.branch,
    );

    const metadata: BuildWorkflowInfo["metadata"] = { ...params, commit };

    return this.runWorkflow("BuildWorkflow", { owner, repo, commit }, { metadata });
  }

  @callable()
  async retryBuild(workflowId: string) {
    return this.restartWorkflow(workflowId);
  }

  @callable()
  async getBuild(workflowId: string) {
    return this.getWorkflow(workflowId);
  }

  @callable({ description: "Get a list of workflows for the current project" })
  async listBuilds() {
    const page = this.getWorkflows({ workflowName: "BuildWorkflow" });

    // This *MUST* satisfy `SerializeableValue` to appear on `stub.*`
    return {
      nextCursor: page.nextCursor,
      total: page.total,
      workflows: page.workflows.map((w) => ({
        ...w,
        completedAt: w.completedAt?.toISOString() ?? null,
        createdAt: w.createdAt.toISOString(),
        error:
          w.error == null
            ? null
            : {
                // ⚠️ This breaks `stub.*` serialization inexplicably
                //  name: w.error.name,
                message: w.error.message,
              },
        updatedAt: w.updatedAt.toISOString(),
      })),
    };
  }

  @callable()
  async deleteBuild(buildId: string) {
    const success = this.deleteWorkflow(buildId);

    if (!success) {
      throw new Error(`Failed to delete build ${buildId}`);
    }

    return `Deleted build ${buildId}`;
  }

  @callable()
  async deleteBuilds(criteria?: Parameters<typeof this.deleteWorkflows>[0]) {
    const total = this.deleteWorkflows(criteria);

    if (!total) {
      throw new Error(`No builds found to delete`);
    }

    return `Deleted ${total} matching builds`;
  }

  async getCommit(owner: string, repo: string, ref: string) {
    const account = await getAgentByName(
      this.env.AccountAgent,
      this.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    );
    const installation = await account.getInstallationByOwner(owner);
    const octokit = await githubApp.getInstallationOctokit(installation.id);
    const { data } = await octokit.rest.repos.getCommit({ owner, repo, ref });

    return data;
  }

  async onWorkflowProgress(
    workflowName: string,
    workflowId: string,
    progress: BuildWorkflowProgress,
  ): Promise<void> {
    this.setState(
      produce(this.state, (draft) => {
        if (!draft.progress) {
          draft.progress = {};
        }

        draft.progress[workflowId] = progress;
      }),
    );

    this.broadcast(
      JSON.stringify({
        type: "workflow_progress",
        workflowId,
        workflowName,
        progress,
      }),
    );
  }

  async onWorkflowComplete(
    workflowName: string,
    workflowId: string,
    result: BuildWorkflowResult,
  ): Promise<void> {
    this.setState(
      produce(this.state, (draft) => {
        draft.progress[workflowId] = {
          message: "Completed",
          percent: 100,
          result,
          step: "complete",
        };
      }),
    );

    this.broadcast(
      JSON.stringify({
        type: "workflow_complete",
        workflowId,
        workflowName,
        result,
      }),
    );
  }

  async onWorkflowError(
    workflowName: string,
    workflowId: WorkflowInfo["workflowId"],
    error: string,
  ) {
    this.setState(
      produce(this.state, (draft) => {
        delete draft.progress[workflowId];
      }),
    );

    this.broadcast(
      JSON.stringify({
        type: "workflow_error",
        workflowId,
        workflowName,
        error,
      }),
    );
  }
}
