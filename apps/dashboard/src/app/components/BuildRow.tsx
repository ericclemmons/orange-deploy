import { Button, DropdownMenu, Link, Table, Text } from "@cloudflare/kumo";
import { ArrowClockwiseIcon, DotsThreeIcon, TrashIcon } from "@phosphor-icons/react";
import { Link as RouterLink } from "@tanstack/react-router";

import type { BuildWorkflowProgress } from "../../worker/BuildWorkflow";
import type { BuildWorkflowInfo } from "../../worker/ProjectAgent";
import { WorkflowStatusBadge } from "./WorkflowStatusBadge";

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
            href={`https://github.com/${workflow.metadata.owner}/${workflow.metadata.repo}/tree/${workflow.metadata.branch}`}
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
        <RouterLink
          to="/$orgName/$repoName/builds/$buildId"
          params={{
            orgName: workflow.metadata.owner,
            repoName: workflow.metadata.repo,
            buildId: workflow.workflowId,
          }}
        >
          <WorkflowStatusBadge progress={progress} workflow={workflow} />
        </RouterLink>
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
