import {
  Button,
  CloudflareLogo,
  Flow,
  Grid,
  GridItem,
  Link,
  Select,
  Surface,
  Text,
} from "@cloudflare/kumo";
import { CpuIcon, GithubLogoIcon, GlobeIcon } from "@phosphor-icons/react";
import { useAgent } from "agents/react";
import { useState } from "react";

import type { AccountAgent, AccountState } from "../worker/AccountAgent";

import "./App.css";
import heroImg from "./assets/hero.png";

const ADD_GITHUB_ORGANIZATION = Symbol("add-github-organization");

function App() {
  const [account, setAccount] = useState<AccountState>();

  useAgent<AccountAgent, AccountState>({
    agent: "account-agent",
    name: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    onStateUpdate: (state) => setAccount(state),
  });

  // Have to explicitly check for `login` because Octokit types don't include `organization-simple` schema
  const accounts = account
    ? Object.values(account.installations)
        .map(({ account }) => (account && "login" in account ? account : null))
        .filter((account) => account !== null)
    : [];

  return (
    <>
      <div id="spacer" />
      <div className="ticks"></div>

      <Surface className="p-16">
        <Grid variant="side-by-side">
          <GridItem>
            <Text variant="heading1">Orange Deploy</Text>
            <Text variant="secondary">
              No Wrangler. No GitHub Actions. <Text bold>You can just ship things.</Text>
            </Text>
          </GridItem>

          <GridItem>
            <div className="hero">
              <img src={heroImg} className="base" width="170" height="179" alt="" />
              <CloudflareLogo className="cloudflare" variant="glyph" />
              <GithubLogoIcon className="framework" size={24} />
            </div>
          </GridItem>
        </Grid>
      </Surface>

      <div className="ticks"></div>

      <Surface className="p-16 flex flex-col items-center">
        <Text variant="heading2">Get Started</Text>

        <Flow align="center">
          <Flow.Node
            render={
              <div>
                <Select
                  aria-label="Select an Organization"
                  loading={!account}
                  placeholder="Select an Organization"
                >
                  {accounts.map((account) => (
                    <Select.Option key={account.id} value={account.login}>
                      <div className="flex items-center gap-2">
                        <img
                          className="size-4 rounded"
                          src={account.avatar_url}
                          alt={`Avatar for ${account.login}`}
                        />
                        <Text>{account.login}</Text>
                      </div>
                    </Select.Option>
                  ))}
                  <Select.Option key="add-github-organization" value={ADD_GITHUB_ORGANIZATION}>
                    <Link
                      className="flex items-center gap-2!"
                      href="/api/auth/github"
                      variant="plain"
                    >
                      <GithubLogoIcon className="size-4 rounded" />
                      <Text>Add GitHub Organization</Text>
                    </Link>
                  </Select.Option>
                </Select>
              </div>
            }
          />

          <Flow.Node
            disabled
            render={
              <div>
                <Select
                  disabled
                  aria-label="Select a Repository"
                  placeholder="Select a Repository"
                  items={{}}
                />
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
      </Surface>

      <div className="ticks"></div>
    </>
  );
}

export default App;
