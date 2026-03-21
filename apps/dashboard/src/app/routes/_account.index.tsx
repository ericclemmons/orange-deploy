import { Text } from "@cloudflare/kumo";
import { createFileRoute } from "@tanstack/react-router";

import { Steps } from "../components/Steps";

export const Route = createFileRoute("/_account/")({ component: RouteComponent });

function RouteComponent() {
  return (
    <>
      <Text variant="heading2">Get Started</Text>
      <Steps />
    </>
  );
}
