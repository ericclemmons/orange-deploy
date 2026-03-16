import {
  Button,
  CloudflareLogo,
  Combobox,
  Flow,
  Grid,
  GridItem,
  Link,
  Surface,
  Text,
} from "@cloudflare/kumo";
import { CpuIcon, GithubLogoIcon, GlobeIcon } from "@phosphor-icons/react";
import { useAgent } from "agents/react";
import { useEffect, useState } from "react";

import type { BuildsAgent, BuildsState } from "../worker/BuildsAgent";

import "./App.css";
import heroImg from "./assets/hero.png";

function App() {
  const [state, setState] = useState<BuildsState>();
  const [repos, setRepos] = useState<string[]>();

  const agent = useAgent<BuildsAgent, BuildsState>({
    agent: "builds-agent",
    name: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID,
    onStateUpdate: (state) => setState(state),
  });

  useEffect(() => {
    agent.stub.listRepos().then(setRepos).catch(console.error);
  }, [state?.githubInstallationId]);

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
              <Link href="/api/auth/github" variant="plain">
                <Button
                  disabled={!state}
                  icon={<GithubLogoIcon />}
                  loading={!state}
                  variant="primary"
                >
                  {state?.githubInstallationId ? "Update GitHub App" : "Connect to GitHub"}
                  <Link.ExternalIcon />
                </Button>
              </Link>
            }
          />

          <Flow.Node
            disabled={!state?.githubInstallationId}
            render={
              <div>
                <Combobox disabled={!repos}>
                  <Combobox.TriggerInput placeholder="Select a Repository" />
                  <Combobox.Content>
                    <Combobox.List>
                      {repos?.map((repo) => (
                        <Combobox.Item key={repo} value={repo}>
                          {repo}
                        </Combobox.Item>
                      ))}
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
      </Surface>

      <div className="ticks"></div>
    </>
  );
}

export default App;
