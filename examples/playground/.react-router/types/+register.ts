import "react-router";

declare module "react-router" {
  interface Register {
    params: Params;
  }
}

type Params = {
  "/": {};
  "/fetcher": {};
  "/loader-error": {};
  "/page-2": {};
  "/resource-route-error": {};
  "/route-error": {};
};