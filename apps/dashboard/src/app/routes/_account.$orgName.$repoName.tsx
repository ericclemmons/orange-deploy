import { Button, LayerCard, Table, Text } from "@cloudflare/kumo";
import { CheckIcon, PlayIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import { type AccountState, type GetRepositoryResponse } from "../../worker/AccountAgent";
import { Steps } from "../components/Steps";
import { loadAgent } from "../utils/loadAgent";

export const Route = createFileRoute("/_account/$orgName/$repoName")({
  beforeLoad: async ({ params }) => {
    using agent = await loadAgent<AccountState>(
      "account-agent",
      import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    );

    const { orgName, repoName } = params;
    const repository = await agent.client.call<GetRepositoryResponse>("getRepository", [
      orgName,
      repoName,
    ]);

    return { repository };
  },
  component: RouteComponent,
});

const emailData = [
  {
    id: "1",
    subject: "Kumo v1.0.0 released",
    from: "Visal In",
    date: "5 seconds ago",
  },
  {
    id: "2",
    subject: "New Job Offer",
    from: "Cloudflare",
    date: "10 minutes ago",
  },
  {
    id: "3",
    subject: "Daily Email Digest",
    from: "Cloudflare",
    date: "1 hour ago",
    tags: ["promotion"],
  },
  {
    id: "4",
    subject: "GitLab - New Comment",
    from: "Rob Knecht",
    date: "1 day ago",
  },
  {
    id: "5",
    subject: "Out of Office",
    from: "Johnnie Lappen",
    date: "3 days ago",
  },
];
function RouteComponent() {
  const { organization, organizations, repository } = Route.useRouteContext();

  return (
    <>
      <Steps
        organizations={organizations}
        organization={organization}
        repository={repository}
        repositories={[repository]}
      />

      <LayerCard>
        <LayerCard.Secondary>
          <Text variant="secondary">
            <Text variant="mono">0</Text> Builds
          </Text>
          <div className="grow" />
          <Button variant="primary" size="sm">
            <PlayIcon />
            Build{" "}
            <Text
              // @ts-expect-error className does not exist on Text
              className="text-kumo-base"
              variant="mono"
            >
              {repository.default_branch}
            </Text>
          </Button>
        </LayerCard.Secondary>

        <LayerCard.Primary>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Branch</Table.Head>
                <Table.Head>Commit</Table.Head>
                <Table.Head>Created</Table.Head>
                <Table.Head>Status</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {emailData.slice(0, 3).map((row) => (
                <Table.Row key={row.id}>
                  <Table.Cell>{row.subject}</Table.Cell>
                  <Table.Cell>{row.from}</Table.Cell>
                  <Table.Cell>{row.date}</Table.Cell>
                  <Table.Cell>
                    <CheckIcon />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </LayerCard.Primary>
      </LayerCard>
    </>
  );
}
