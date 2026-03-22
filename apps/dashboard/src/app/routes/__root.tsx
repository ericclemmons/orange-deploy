import { CloudflareLogo, Grid, GridItem, Text } from "@cloudflare/kumo";
import { GithubLogoIcon } from "@phosphor-icons/react";
import {
  ErrorComponent,
  Outlet,
  Link as RouterLink,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import * as React from "react";

import type { AccountState } from "../../worker/AccountAgent";
import heroImg from "../assets/hero.png";

interface RouteContext {
  account?: AccountState;
}

export const Route = createRootRouteWithContext<RouteContext>()({
  component: RootComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <React.Fragment>
      <div id="spacer" />

      <div className="ticks"></div>

      <div className="p-16">
        <Grid variant="side-by-side">
          <GridItem>
            <RouterLink to="/">
              <Text variant="heading1">Orange Deploy</Text>
            </RouterLink>
            <Text variant="secondary">Your personal CI/CD platform on Cloudflare.</Text>
          </GridItem>

          <GridItem>
            <div className="hero">
              <img src={heroImg} className="base" width="170" height="179" alt="" />
              <CloudflareLogo className="cloudflare" variant="glyph" />
              <GithubLogoIcon className="framework" size={24} />
            </div>
          </GridItem>
        </Grid>
      </div>

      <div className="ticks"></div>

      <div className="p-16 flex flex-col items-center">
        <Outlet />
      </div>

      <div className="ticks"></div>
    </React.Fragment>
  );
}
