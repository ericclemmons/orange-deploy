import {
  Badge,
  Button,
  DropdownMenu,
  Loader,
  Table,
  Text,
  Tooltip,
  useKumoToastManager,
} from "@cloudflare/kumo";
import { DotsThreeIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import type { useAgent } from "agents/react";

import type { BuildWorkflowProgress } from "../../worker/BuildWorkflow";
import type { BuildWorkflowInfo, ProjectAgent, ProjectState } from "../../worker/ProjectAgent";

export namespace BuildRow {
  export type Props = {
    progress?: BuildWorkflowProgress;
    project: ReturnType<typeof useAgent<ProjectAgent, ProjectState>>;
    workflow: BuildWorkflowInfo;
  };
}

export function BuildRow({ progress, project, workflow }: BuildRow.Props) {
  const toast = useKumoToastManager();
  const deleteBuild = useMutation({
    mutationFn: project.stub.deleteBuild,
    mutationKey: ["project.deleteBuild", workflow.workflowId],
    onError: (error, data) => toast.add({ data, description: error.message, variant: "error" }),
    onSuccess: (description, data) => toast.add({ data, description, variant: "success" }),
  });

  return (
    <Table.Row key={workflow.workflowId}>
      <Table.Cell>
        <Text variant="mono">{workflow.metadata?.branch}</Text>
      </Table.Cell>
      <Table.Cell>{workflow.metadata?.commit.commit.message}</Table.Cell>
      <Table.Cell>{new Date(workflow.createdAt).toLocaleString()}</Table.Cell>
      <Table.Cell>
        {(() => {
          // TODO: There should just be a Map<WorkflowStatus, String> to have a shared tooltip for `progress?.message`
          switch (workflow.status) {
            case "complete":
              return <Badge variant="success">Complete</Badge>;
            case "terminated":
              return <Badge variant="destructive">Terminated</Badge>;
            case "errored":
              return (
                <Tooltip content={workflow.error?.message}>
                  <Badge variant="destructive">Errored</Badge>
                </Tooltip>
              );
            case "queued":
              return <Badge variant="beta">Queued</Badge>;
            case "unknown":
              return <Badge variant="beta">Unknown</Badge>;
            case "running":
              return (
                <>
                  <Tooltip content={progress?.message} side="top">
                    <Badge className=" flex items-center gap-2" variant="primary">
                      <Loader size={12} />
                      Running
                    </Badge>
                  </Tooltip>
                </>
              );
            case "waiting":
              return <Badge variant="outline">Waiting</Badge>;
            case "waitingForPause":
            case "paused":
              return <Badge variant="outline">Paused</Badge>;

            default:
              workflow.status satisfies never;
              return null;
          }
        })()}
      </Table.Cell>
      <Table.Cell>
        <DropdownMenu>
          <DropdownMenu.Trigger
            render={
              <Button variant="ghost" size="sm">
                <DotsThreeIcon className="size-4" />
              </Button>
            }
          />

          <DropdownMenu.Content align="end">
            <DropdownMenu.Item
              disabled={deleteBuild.isPending}
              onClick={() => deleteBuild.mutate(workflow.workflowId)}
              variant="danger"
            >
              Remove
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Table.Cell>
    </Table.Row>
  );
}
