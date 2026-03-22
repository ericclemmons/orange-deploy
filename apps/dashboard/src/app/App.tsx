import { ToastProvider } from "@cloudflare/kumo";
import { RouterProvider } from "@tanstack/react-router";

import "./App.css";
import { router } from "./router";

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
