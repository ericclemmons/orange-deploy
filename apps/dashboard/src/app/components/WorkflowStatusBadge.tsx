import { Badge, Loader, Tooltip, type BadgeVariant } from "@cloudflare/kumo";

import type { BuildWorkflowProgress } from "../../worker/BuildWorkflow";
import type { BuildWorkflowInfo } from "../../worker/ProjectAgent";

export namespace WorkflowStatusBadge {
  export type Props = {
    progress?: BuildWorkflowProgress;
    workflow: BuildWorkflowInfo;
  };
}

const VARIANTS: Record<BuildWorkflowInfo["status"], BadgeVariant> = {
  complete: "success",
  terminated: "destructive",
  errored: "destructive",
  queued: "beta",
  unknown: "beta",
  running: "primary",
  waiting: "outline",
  waitingForPause: "outline",
  paused: "outline",
} as const;

export function WorkflowStatusBadge({ progress, workflow }: WorkflowStatusBadge.Props) {
  const content = workflow.error?.message ?? progress?.message;
  return (
    <Tooltip content={content} disabled={!content}>
      <Badge className="capitalize flex items-center gap-2" variant={VARIANTS[workflow.status]}>
        {workflow.status === "running" ? <Loader size={12} /> : null}
        {workflow.status}
      </Badge>
    </Tooltip>
  );
}
