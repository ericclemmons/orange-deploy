import {
  Button,
  Empty,
  LayerCard,
  Loader,
  Table,
  Text,
  useKumoToastManager,
} from "@cloudflare/kumo";
import { PackageIcon, PlayIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAgent } from "agents/react";
import { Activity } from "react";

import type { BuildWorkflowInfo, ProjectAgent, ProjectState } from "../../worker/ProjectAgent";
import { BuildRow } from "../components/BuildRow";
import { Steps } from "../components/Steps";

export const Route = createFileRoute("/_account/$orgName/$repoName/")({
  component: BuildsRoute,
});

function BuildsRoute() {
  const toast = useKumoToastManager();
  const { organization, organizations, repository } = Route.useRouteContext();
  const project = useAgent<ProjectAgent, ProjectState>({
    agent: "project-agent",
    name: `${organization.login}.${repository.name}`,
    onError: (error) => toast.add({ description: error.type, variant: "error" }),
    onMessage: (message) => {
      console.debug("onMessage", message);
      return listBuilds.refetch();
    },
    // TODO: Use a collection to optimistically update the build list
    onStateUpdate: () => listBuilds.refetch(),
  });

  // @ts-ignore Errors with `vp check --fx`, but not Cursor 🤔
  const listBuilds = useQuery({
    // @ts-ignore Errors with `vp check --fx`, but not Cursor 🤔
    placeholderData: { total: 0, nextCursor: null, workflows: [] },
    // @ts-ignore Errors with `vp check --fx`, but not Cursor 🤔
    queryFn: project.stub.listBuilds,
    queryKey: ["project.workflows", project.name],
    // Have to recast to `BuildWorkflowInfo` due to serialization
    // 🙋 I thought capnweb solved this problem?
    select: (page) => ({
      ...page,
      // @ts-ignore Errors with `vp check --fx`, but not Cursor 🤔
      workflows: page.workflows.map((w) => w as unknown as BuildWorkflowInfo),
    }),
  });

  const createBuild = useMutation({
    mutationFn: ({ branch, commit }: { branch?: string; commit?: string }) =>
      project.stub.createBuild({
        owner: organization.login,
        repo: repository.name,
        branch: branch ?? repository.default_branch,
        commit: commit ?? undefined,
      }),
    mutationKey: [
      "project.createBuild",
      {
        organization: organization.login,
        repository: repository.name,
        branch: repository.default_branch,
      },
    ],
    onError: (error, data) => {
      toast.add({
        description: error.message,
        data,
        title: "Error creating build",
        variant: "error",
      });
    },
    onSuccess: () => listBuilds.refetch(),
  });

  const deleteBuild = useMutation({
    mutationFn: project.stub.deleteBuild,
    mutationKey: [
      "project.deleteBuild",
      { organization: organization.login, repository: repository.name },
    ],
    onError: (error, data) => toast.add({ data, description: error.message, variant: "error" }),
    onSuccess: (description, data) => {
      toast.add({ data, description, variant: "success" });
      return listBuilds.refetch();
    },
  });

  const deleteBuilds = useMutation({
    mutationFn: project.stub.deleteBuilds,
    onError: (error, data) => toast.add({ data, description: error.message, variant: "warning" }),
    onSuccess: (description, data) => {
      toast.add({ data, description, variant: "success" });
      return listBuilds.refetch();
    },
  });

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
          <Text variant="secondary">
            <Text variant="mono">{listBuilds.data?.total}</Text> Builds
          </Text>
          <div className="grow" />
          <Button
            disabled={createBuild.isPending}
            onClick={() => createBuild.mutate({ branch: repository.default_branch })}
            variant="primary"
            size="sm"
          >
            {createBuild.isPending ? <Loader size="sm" /> : <PlayIcon />}
            Build{" "}
            <Text
              // @ts-expect-error className does not exist on Text
              className="text-kumo-base"
              variant="mono"
            >
              {repository.default_branch}
            </Text>
          </Button>
        </LayerCard.Secondary>

        <LayerCard.Primary>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Branch</Table.Head>
                <Table.Head>Commit</Table.Head>
                <Table.Head>Created</Table.Head>
                <Table.Head className="w-0">Status</Table.Head>
                <Table.Head className="w-0">
                  <span className="sr-only">Actions</span>
                </Table.Head>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {listBuilds.data?.workflows.map((workflow) => (
                <BuildRow
                  // @ts-ignore Errors with `vp check --fx`, but not Cursor 🤔
                  key={workflow.workflowId}
                  onDelete={deleteBuild.mutate}
                  onRetry={project.stub.retryBuild}
                  // @ts-ignore Errors with `vp check --fx`, but not Cursor 🤔
                  progress={project.state?.progress[workflow.workflowId]}
                  workflow={workflow}
                />
              ))}
            </Table.Body>
          </Table>

          <Activity mode={listBuilds.data?.workflows.length === 0 ? "visible" : "hidden"}>
            <Empty
              description="Start your first build by pushing to your repository. Or, manually trigger a build above."
              icon={<PackageIcon size={48} />}
              title="Ready to build!"
            />
          </Activity>
        </LayerCard.Primary>

        <LayerCard.Secondary>
          <div className="grow" />
          <Button
            icon={<TrashIcon />}
            disabled={deleteBuilds.isPending}
            onClick={() =>
              deleteBuilds.mutate({ status: ["terminated", "errored", "unknown", "complete"] })
            }
            size="sm"
            variant="secondary-destructive"
          >
            Cleanup Builds
          </Button>
        </LayerCard.Secondary>
      </LayerCard>
    </>
  );
}
