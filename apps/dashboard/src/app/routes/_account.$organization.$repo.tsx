import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_account/$organization/$repo")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_account/$organization/$repo"!</div>;
}
