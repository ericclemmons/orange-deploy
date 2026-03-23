import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_account/$orgName/$repoName/builds/$buildId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_account/$orgName/$repoName/builds/$buildId"!</div>;
}
