import { Button, LayerCard, Text, useKumoToastManager } from "@cloudflare/kumo";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAgent } from "agents/react";

import type { BuildWorkflowInfo, ProjectAgent, ProjectState } from "../../worker/ProjectAgent";
import { Steps } from "../components/Steps";
import { WorkflowStatusBadge } from "../components/WorkflowStatusBadge";
import { loadAgent } from "../utils/loadAgent";

export const Route = createFileRoute("/_account/$orgName/$repoName/builds/$buildId")({
  beforeLoad: async ({ params }) => {
    const { orgName, repoName, buildId } = params;
    using agent = await loadAgent<ProjectAgent, ProjectState>(
      "project-agent",
      `${orgName}.${repoName}`,
    );
    // @ts-expect-error `getBuild` isn't Serializable due to `WorkflowInfo`
    const build = (await agent.client.call("getBuild", [buildId])) as BuildWorkflowInfo;

    if (!build) {
      throw redirect({ to: "/$orgName/$repoName", params: { orgName, repoName } });
    }

    return { build };
  },
  component: BuildDetailsRoute,
});

function BuildDetailsRoute() {
  const { organization, organizations, repository, build } = Route.useRouteContext();
  const toast = useKumoToastManager();

  const project = useAgent<ProjectAgent, ProjectState>({
    agent: "project-agent",
    name: `${organization.login}.${repository.name}`,
    onError: (error) => toast.add({ description: error.type, variant: "error" }),
    onMessage: (message) => {
      console.debug("onMessage", message);
    },
  });

  const progress = project.state?.progress[build.workflowId];

  return (
    <>
      <Steps
        organizations={organizations}
        organization={organization}
        repository={repository}
        repositories={[repository]}
      />

      <LayerCard>
        <LayerCard.Secondary>
          <WorkflowStatusBadge progress={progress} workflow={build} />
          <Text variant="secondary">{new Date(build.updatedAt).toLocaleString()}</Text>
          <div className="grow" />
          <Button disabled={build.status !== "complete"} variant="primary" size="sm">
            Deploy
          </Button>
        </LayerCard.Secondary>
        <LayerCard.Primary>
          <Text>Build Details</Text>
        </LayerCard.Primary>
      </LayerCard>
    </>
  );
}
