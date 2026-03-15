import {
  Button,
  CloudflareLogo,
  Combobox,
  Flow,
  Grid,
  GridItem,
  Surface,
  Text,
} from "@cloudflare/kumo";
import { CpuIcon, GithubLogoIcon, GlobeIcon } from "@phosphor-icons/react";

import heroImg from "./assets/hero.png";

import "./App.css";

function App() {
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
              <Button icon={<GithubLogoIcon />} variant="primary">
                Connect to GitHub
              </Button>
            }
          />

          <Flow.Node
            disabled
            render={
              <div>
                <Combobox disabled>
                  <Combobox.TriggerInput placeholder="Select a Repository" />
                  <Combobox.Content>
                    <Combobox.Empty />
                    <Combobox.Item value="1">Repository 1</Combobox.Item>
                    <Combobox.Item value="2">Repository 2</Combobox.Item>
                    <Combobox.Item value="3">Repository 3</Combobox.Item>
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
