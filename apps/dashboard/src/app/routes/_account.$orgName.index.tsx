import { Text } from "@cloudflare/kumo";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection, eq, like, useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { useAgent } from "agents/react";
import { type } from "arktype";

import type {
  AccountAgent,
  AccountState,
  SearchRepositoriesResponse,
} from "../../worker/AccountAgent";
import { Steps } from "../components/Steps";

export const Route = createFileRoute("/_account/$orgName/")({
  component: SelectRepositoryRoute,
  // Strip `?repo=` from the URL
  search: { middlewares: [stripSearchParams({ repo: "" })] },
  validateSearch: type({ "repo?": "string.trim" }),
});

type Repository = SearchRepositoriesResponse["items"][number];

function SelectRepositoryRoute() {
  const { organization, organizations } = Route.useRouteContext();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const queryKey = ["repositories", { organization: organization.login }];
  const accountAgent = useAgent<AccountAgent, AccountState>({
    agent: "AccountAgent",
    name: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
  });

  const collection = createCollection(
    queryCollectionOptions({
      getKey: (repo: Repository) => repo.id,
      // Stable `queryKey` to query across all repositories for an organization
      queryKey,
      // TODO: This re-fires with each keystroke. We need to debounce somehow. Normally, React Query does that for us?
      queryFn: async ({ queryKey }) => {
        const response = await accountAgent.stub.searchRepositories(
          organization.login,
          search.repo,
        );

        // DB expects that `queryFn` returns a *complete* list (or [] if empty), so we upsert so we can query on existing items while fetching new ones
        // https://tanstack.com/db/latest/docs/collections/query-collection#handling-partialincremental-fetches
        const existing = queryClient.getQueryData<Repository[]>(queryKey) ?? [];
        for (const item of response.items) {
          if (!collection.has(item.id)) {
            existing.push(item);
          }
        }

        return existing;
      },
      queryClient,
    }),
  );

  const query = useLiveQuery(
    (q) => {
      const byOrganization = q
        .from({ collection })
        .where(({ collection }) => eq(collection.owner?.login, organization.login))
        .orderBy(({ collection }) => collection.score, "desc");

      if (!search.repo) {
        return byOrganization;
      }

      return byOrganization
        .where(({ collection }) => like(collection.name, `%${search.repo}%`))
        .orderBy(({ collection }) => collection.score, "desc");
    },
    [organization, search.repo],
  );

  return (
    <>
      <Text variant="heading2">Choose a Project</Text>
      <Steps organizations={organizations} organization={organization} repositories={query.data} />
    </>
  );
}
