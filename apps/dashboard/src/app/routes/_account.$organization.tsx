import { Text } from "@cloudflare/kumo";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { type } from "arktype";

import { Steps } from "../components/Steps";

export const Route = createFileRoute("/_account/$organization")({
  component: RouteComponent,
  search: {
    // Strip `?name=` from the URL
    middlewares: [stripSearchParams({ name: "" })],
  },
  validateSearch: type({ "name?": "string.trim" }),
});

function RouteComponent() {
  return (
    <>
      <Text variant="heading2">Choose a Project</Text>
      <Steps />
    </>
  );
}
