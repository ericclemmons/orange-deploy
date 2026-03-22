import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_account/$orgName")({
  beforeLoad: ({ context, params }) => {
    const { organizations } = context;
    const organization = organizations.find(({ login }) => login === params.orgName);

    if (!organization) {
      throw redirect({ to: "/" });
    }

    return { organization };
  },
});
