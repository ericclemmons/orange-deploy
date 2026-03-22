import { Button, Combobox, Flow, Link, Loader, Text } from "@cloudflare/kumo";
import { CpuIcon, GithubLogoIcon, GlobeIcon } from "@phosphor-icons/react";
import { useIsFetching } from "@tanstack/react-query";
import { Link as RouterLink, useNavigate } from "@tanstack/react-router";

import type {
  AccountState,
  GetRepositoryResponse,
  SearchRepositoriesResponse,
} from "../../worker/AccountAgent";

type Organization = AccountState["installations"][number]["account"];
type Repository = GetRepositoryResponse | SearchRepositoriesResponse["items"][number];

export namespace Steps {
  export type Props = {
    organization?: Organization;
    organizations: Organization[];
    repository?: Repository;
    repositories?: Repository[];
  };
}

export function Steps({ organization, organizations, repository, repositories }: Steps.Props) {
  const navigate = useNavigate();
  const isFetching = useIsFetching({
    queryKey: ["repositories", { organization: organization?.login }],
  });

  return (
    <Flow align="center">
      <Flow.Node
        render={
          <div>
            <Combobox<Organization>
              items={organizations}
              itemToStringLabel={(organization) => organization.login}
              onInputValueChange={async (org, details) => {
                // This fires after `onValueChange` with `""`, which causes a race-condition
                // that redirects to `/` immediately after `/$orgName`
                if (details.event.type === "input") {
                  await navigate({ replace: true, search: { org }, to: "/" });
                }
              }}
              onValueChange={async (organization) => {
                if (!organization) {
                  return await navigate({ to: "/" });
                }

                return await navigate({ to: "/$orgName", params: { orgName: organization.login } });
              }}
              value={organization ?? null}
            >
              <Combobox.TriggerInput placeholder="Select an Organization" />
              <Combobox.Content>
                <Combobox.Empty>
                  <Text variant="error" size="xs">
                    No matching organizations installed.
                  </Text>
                </Combobox.Empty>

                <Combobox.List>
                  {organizations.map((organization) => (
                    <Combobox.Item key={organization.id} value={organization}>
                      <div className="flex items-center gap-2!">
                        <img
                          className="size-4 rounded"
                          src={organization.avatar_url}
                          alt={`Avatar for ${organization.login}`}
                        />
                        <Text>{organization.login}</Text>
                      </div>
                    </Combobox.Item>
                  ))}

                  <Link
                    className="group mx-1.5 grid cursor-pointer grid-cols-[1fr_16px] gap-2 rounded px-2 py-1.5 text-base data-highlighted:bg-kumo-tint"
                    href="/api/auth/github"
                    variant="plain"
                  >
                    <div className="flex items-center gap-2!">
                      <GithubLogoIcon className="size-4 rounded" />
                      <Text>Add GitHub Organization</Text>
                    </div>
                  </Link>
                </Combobox.List>
              </Combobox.Content>
            </Combobox>
          </div>
        }
      />

      <Flow.Node
        disabled={!organization}
        render={
          <div>
            <Combobox<Repository>
              disabled={!organization}
              itemToStringLabel={(repository) => repository.name}
              onInputValueChange={(repo) =>
                navigate({
                  params: { orgName: organization?.login ?? "" },
                  replace: true,
                  search: { repo },
                  to: "/$orgName",
                })
              }
              items={repositories}
              value={repository ?? null}
            >
              <Combobox.TriggerInput
                render={() => (
                  <>
                    <Combobox.TriggerInput placeholder="Select a Repository" />
                    {isFetching ? (
                      <Loader
                        className="absolute right-8 top-3 text-kumo-subtle pointer-events-none"
                        size="sm"
                      />
                    ) : null}
                  </>
                )}
              />
              <Combobox.Content>
                <Combobox.Empty>
                  <Text variant="error" size="xs">
                    Not seeing what you're looking for?{" "}
                    <Link href="/api/auth/github">Configure GitHub</Link>
                  </Text>
                </Combobox.Empty>

                <Combobox.List>
                  {(repository: Repository) => (
                    <RouterLink
                      key={repository.id}
                      to="/$orgName/$repoName"
                      params={{
                        orgName: organization!.login,
                        repoName: repository.name,
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

      <Flow.Node
        disabled={!repository}
        render={
          <Button disabled={!repository} variant={repository ? "primary" : undefined}>
            Builds
          </Button>
        }
      />

      <Flow.Node
        disabled
        render={
          <Button disabled icon={<CpuIcon />}>
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
