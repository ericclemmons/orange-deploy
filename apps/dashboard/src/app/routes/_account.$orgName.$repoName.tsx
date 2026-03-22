import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_account/$orgName/$repoName")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_account/$organization/$repo"!</div>;
}
