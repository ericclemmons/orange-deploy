import { Text } from "@cloudflare/kumo";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection, like, useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { type } from "arktype";

import { Steps } from "../components/Steps";

export const Route = createFileRoute("/_account/")({
  component: SelectOrganizationRoute,
  search: { middlewares: [stripSearchParams({ org: "" })] },
  validateSearch: type({ "org?": "string.trim" }),
});

function SelectOrganizationRoute() {
  const { organizations } = Route.useRouteContext();
  const search = Route.useSearch();
  const queryClient = useQueryClient();

  const collection = createCollection(
    queryCollectionOptions({
      queryFn: () => organizations,
      queryKey: ["organizations"],
      getKey: (organization) => organization.id,
      queryClient,
    }),
  );

  const query = useLiveQuery(
    (q) => {
      const all = q.from({ collection }).orderBy(({ collection }) => collection.login);

      if (search.org) {
        return all.where(({ collection }) => like(collection.login, `%${search.org}%`));
      }

      return all;
    },
    [search.org],
  );

  return (
    <>
      <Text variant="heading2">Get Started</Text>
      <Steps organizations={query.data} />
    </>
  );
}
