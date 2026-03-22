import {
  AgentWorkflow,
  type AgentWorkflowEvent,
  type AgentWorkflowStep,
  type DefaultProgress,
} from "agents/workflows";

import type { Repository } from "./AccountAgent";
import type { githubApp } from "./githubApp";
import type { ProjectAgent } from "./ProjectAgent";

export type Commit = Awaited<ReturnType<typeof githubApp.octokit.rest.repos.getCommit>>["data"];

export type BuildWorkflowParams = {
  owner: NonNullable<Repository["owner"]>["login"];
  repo: Repository["name"];
  commit: Commit;
};

export type BuildWorkflowResult = {};
export type BuildWorkflowState = {};
export type BuildWorkflowProgress = DefaultProgress & {
  result?: BuildWorkflowResult;
};

export class BuildWorkflow extends AgentWorkflow<
  ProjectAgent,
  BuildWorkflowParams,
  BuildWorkflowProgress
> {
  async run(
    event: AgentWorkflowEvent<BuildWorkflowParams>,
    step: AgentWorkflowStep,
  ): Promise<BuildWorkflowResult> {
    await step.sleep("1 second", "1 second");

    await this.reportProgress({
      message: "Waiting for concurrency slot",
      percent: 0,
      status: "pending",
      step: "wait-for-slot",
    });

    // TODO: This should be gated based on concurrency limits.
    // This puts it in `queued`
    // await step.waitForEvent("start", { timeout: "30 minutes", type: "start" });

    const { owner, repo, commit } = event.payload;

    await step.sleep("1 second", "1 second");
    await this.reportProgress({
      message: `Starting build for ${owner}/${repo}@${commit.sha}...`,
      percent: 5,
      status: "running",
      step: "start-build",
    });

    await step.sleep("1 second", "1 second");

    await this.reportProgress({
      message: "Creating Sandbox...",
      percent: 10,
      status: "running",
      step: "create-sandbox",
    });

    await step.sleep("1 second", "1 second");

    await step.do("Creating Sandbox", async () => {
      throw new Error("Not implemented");
    });

    await this.reportProgress({
      message: "Restoring Backup...",
      percent: 15,
      step: "restore-backup",
    });

    await step.do("Restoring Backup", async () => {
      throw new Error("Not implemented");
    });

    await this.reportProgress({
      message: "Checking out ${owner}/${repo}@${commit.sha}...",
      percent: 20,
      step: "checkout",
    });

    await step.do(`Checking out ${owner}/${repo}@${commit.sha}`, async () => {
      throw new Error("Not implemented");
    });

    await this.reportProgress({
      message: "Installing Dependencies...",
      percent: 25,
      step: "install-dependencies",
    });

    await step.do("Installing Dependencies", async () => {
      throw new Error("Not implemented");
    });

    await this.reportProgress({
      message: "Linting...",
      percent: 30,
      step: "lint",
    });

    await step.do("Linting", async () => {
      throw new Error("Not implemented");
    });

    await this.reportProgress({
      message: "Testing...",
      percent: 40,
      step: "test",
    });

    await step.do("Testing", async () => {
      throw new Error("Not implemented");
    });

    await this.reportProgress({
      message: "Building...",
      percent: 50,
      step: "build",
    });

    await step.do("Building", async () => {
      throw new Error("Not implemented");
    });

    await this.reportProgress({
      message: "Deploying...",
      percent: 75,
      step: "deploy",
    });

    const result = await step.do("Deploying", async () => {
      throw new Error("Not implemented");
    });

    await step.reportComplete(result);

    return result;
  }
}
