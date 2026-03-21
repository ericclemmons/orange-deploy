import { RouterProvider } from "@tanstack/react-router";

import { router } from "./router";

import "./App.css";

export function App() {
  return <RouterProvider router={router} />;
}
