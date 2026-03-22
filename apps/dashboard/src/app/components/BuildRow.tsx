import { Badge, Button, DropdownMenu, Link, Loader, Table, Text, Tooltip } from "@cloudflare/kumo";
import { ArrowClockwiseIcon, DotsThreeIcon, TrashIcon } from "@phosphor-icons/react";

import type { BuildWorkflowProgress } from "../../worker/BuildWorkflow";
import type { BuildWorkflowInfo } from "../../worker/ProjectAgent";

export namespace BuildRow {
  export type Props = {
    onDelete: (workflowId: string) => void;
    onRetry: (workflowId: string) => void;
    progress?: BuildWorkflowProgress;
    workflow: BuildWorkflowInfo;
  };
}

export function BuildRow({ onDelete, onRetry, progress, workflow }: BuildRow.Props) {
  return (
    <Table.Row key={workflow.workflowId}>
      <Table.Cell>
        <Text variant="mono">
          <Link
            href={`https://github.com/${workflow.metadata?.owner}/${workflow.metadata?.repo}/tree/${workflow.metadata?.branch}`}
          >
            {workflow.metadata?.branch} <Link.ExternalIcon />
          </Link>
        </Text>
      </Table.Cell>
      <Table.Cell>
        <Link href={workflow.metadata?.commit.html_url}>
          {workflow.metadata?.commit.commit.message} <Link.ExternalIcon />
        </Link>
      </Table.Cell>
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
                <Tooltip content={workflow.error?.message} side="left">
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
              icon={ArrowClockwiseIcon}
              onClick={() => onRetry(workflow.workflowId)}
            >
              Retry
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              icon={TrashIcon}
              onClick={() => onDelete(workflow.workflowId)}
              variant="danger"
            >
              Delete Build
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Table.Cell>
    </Table.Row>
  );
}
