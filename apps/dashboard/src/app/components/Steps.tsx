import { Button, Combobox, Flow, Link, Loader, Select, Text } from "@cloudflare/kumo";
import { CpuIcon, GithubLogoIcon, GlobeIcon } from "@phosphor-icons/react";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection, eq, like, useLiveQuery } from "@tanstack/react-db";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import {
  Link as RouterLink,
  useNavigate,
  useParams,
  useRouteContext,
  useSearch,
} from "@tanstack/react-router";

const ADD_GITHUB_ORGANIZATION = Symbol("add-github-organization");

import { useAgent } from "agents/react";

import type {
  AccountAgent,
  AccountState,
  SearchRepositoriesResponse,
} from "../../worker/AccountAgent";

export function Steps() {
  const { account } = useRouteContext({ from: "/_account" });
  const { organization } = useParams({ strict: false });
  const navigate = useNavigate({ from: "/$organization" });
  const { name } = useSearch({ strict: false });
  const accountAgent = useAgent<AccountAgent, AccountState>({
    agent: "account-agent",
    name: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
  });
  const queryClient = useQueryClient();
  const isReposFetching = useIsFetching({ queryKey: ["repositories", { organization }] });

  // TODO: This should be a DB query (findOne)
  const selectedInstallation = Object.values(account.installations).find(
    (installation) => installation.account.login === organization,
  );

  // TODO: This should also be a DB query
  const organizationOptions = account
    ? Object.values(account.installations)
        .map(({ account }) => account)
        .toSorted((a, b) => a.login.localeCompare(b.login))
    : [];

  // TODO: This should be a DB query (findOne)
  const selectedOrganization: (typeof organizationOptions)[number] | null =
    organizationOptions.find((option) => option.login === organization) ?? null;

  const reposCollection = createCollection(
    queryCollectionOptions({
      enabled: Boolean(selectedInstallation),
      onInsert: async (repo) => {
        console.info("Inserted", repo);
      },
      getKey: (repo: SearchRepositoriesResponse["items"][number]) => repo.id,
      // TODO: Extract this with `queryKey(opts) => ...`
      queryKey: ["repositories", { organization }],
      // https://tanstack.com/db/latest/docs/collections/query-collection#handling-partialincremental-fetches
      queryFn: async ({ queryKey }) => {
        console.info("queryKey", ...queryKey);
        if (!selectedInstallation) {
          return [];
        }

        // TODO: This would be better if it was by Org name and the ID was looked up internally
        console.info("Searching for", { name });
        const response = await accountAgent.stub.searchRepositories(selectedInstallation.id, name);
        // console.info({ name });

        const existing =
          queryClient.getQueryData<SearchRepositoriesResponse["items"]>([
            "repositories",
            { organization },
          ]) ?? [];

        // console.info("existing", existing.length);

        for (const item of response.items) {
          if (!reposCollection.has(item.id)) {
            console.info("Pushing", item.name);
            // reposCollection.utils.writeUpsert(item);
            existing.push(item);
          }
        }

        // console.info("Returning", existing.length, "from", response.items);

        return existing;
      },
      queryClient,
      // ⚠️ Setting `syncMode: "on-demand"` will auto add `ctx.meta.loadSubsetOptions` to this queryKey.
      // Instead, we're doing a `liveQuery` based on cumulative results of a shared `queryKey`
      // https://tanstack.com/db/latest/docs/collections/query-collection#queryfn-and-predicate-push-down
      // syncMode: "on-demand",
    }),
  );

  const reposQuery = useLiveQuery(
    (q) => {
      // Set `isEnabled` to `false` if we can't query by `organization`
      // https://tanstack.com/db/latest/docs/guides/live-queries#conditional-queries
      if (!organization) {
        return undefined;
      }

      // console.info({ name });

      const byOrganization = q
        .from({ repos: reposCollection })
        .where(({ repos }) => eq(repos.owner?.login, organization))
        .orderBy(({ repos }) => repos.name);

      if (!name) {
        return byOrganization;
      }

      return byOrganization.where(({ repos }) => like(repos.name, `${name}%`));
    },
    [name, organization],
  );

  console.info(
    {
      queryIsLoading: reposQuery.isLoading,
      isLoadingSubset: reposCollection.isLoadingSubset,
      isFetching: reposCollection.utils.isFetching,
      isLoading: reposCollection.utils.isLoading,
      status: reposCollection.utils.fetchStatus,
      organization,
      isEnabled: reposQuery.isEnabled,
    },
    queryClient.isFetching({ queryKey: ["repositories", { organization }] }),
  );

  return (
    <Flow align="center">
      <Flow.Node
        render={
          <div>
            <Select
              aria-label="Select an Organization"
              loading={!account}
              placeholder="Select an Organization"
              renderValue={(organization) => {
                if (!organization) {
                  return <Text key="select-organization">Select an Organization</Text>;
                }

                return (
                  <div className="flex items-center gap-2!">
                    <img
                      className="size-4 rounded"
                      src={organization.avatar_url}
                      alt={`Avatar for ${organization.login}`}
                    />
                    <Text>{organization.login}</Text>
                  </div>
                );
              }}
              // @ts-expect-error Not sure how to make this compatible
              value={selectedOrganization}
            >
              {organizationOptions.map((organization) => (
                <RouterLink
                  key={organization.id}
                  params={{ organization: organization.login }}
                  to="/$organization"
                >
                  <Select.Option value={organization}>
                    <div className="flex items-center gap-2!">
                      <img
                        className="size-4 rounded"
                        src={organization.avatar_url}
                        alt={`Avatar for ${organization.login}`}
                      />
                      <Text>{organization.login}</Text>
                    </div>
                  </Select.Option>
                </RouterLink>
              ))}

              <Link key="add-github-organization" href="/api/auth/github" variant="plain">
                <Select.Option value={ADD_GITHUB_ORGANIZATION}>
                  <div className="flex items-center gap-2!">
                    <GithubLogoIcon className="size-4 rounded" />
                    <Text>Add GitHub Organization</Text>
                  </div>
                </Select.Option>
              </Link>
            </Select>
          </div>
        }
      />

      <Flow.Node
        disabled={!selectedInstallation}
        render={
          <div>
            <Combobox<SearchRepositoriesResponse["items"][number]>
              disabled={!reposQuery.isEnabled}
              onInputValueChange={(name) => navigate({ search: { name }, replace: true })}
              items={reposQuery.data}
            >
              <Combobox.TriggerValue>Select a Repository</Combobox.TriggerValue>
              <Combobox.Content>
                <Combobox.Input
                  render={() => (
                    <>
                      <div className="grid items-center justify-items-end">
                        <Combobox.Input className="col-start-1 row-start-1" />
                        {isReposFetching ? (
                          <Loader
                            className="col-start-1 row-start-1 mr-3 mb-2 text-kumo-subtle pointer-events-none"
                            size="sm"
                          />
                        ) : null}
                      </div>
                    </>
                  )}
                />
                <Combobox.Empty>
                  <Text variant="secondary" size="xs">
                    Not seeing what you're looking for?{" "}
                    <Link href="/api/auth/github">Configure GitHub</Link>
                  </Text>
                </Combobox.Empty>
                <Combobox.List>
                  {(repository: NonNullable<typeof reposQuery.data>[number]) => (
                    <RouterLink
                      key={repository.id}
                      to="/$organization/$repo"
                      params={{
                        organization: organization!,
                        repo: repository.name,
                      }}
                    >
                      <Combobox.Item value={repository}>{repository.name}</Combobox.Item>
                    </RouterLink>
                  )}
                </Combobox.List>
              </Combobox.Content>
            </Combobox>
          </div>
        }
      />

      <Flow.Node disabled render={<Button disabled>Checks</Button>} />

      <Flow.Node
        disabled
        render={
          <Button disabled icon={<CpuIcon />} variant="primary">
            Deploy
          </Button>
        }
      />

      <Flow.Node
        disabled
        render={
          <Button icon={<GlobeIcon />} disabled>
            Production
          </Button>
        }
      />
    </Flow>
  );
}
