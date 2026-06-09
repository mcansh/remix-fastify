import { data, useFetcher } from "react-router";
import { Button } from "~/components/button";
import type { Route } from "./+types/_layout.fetcher";

export async function action({ request }: Route.ActionArgs) {
  let response = await request.json();
  return data(response);
}

export default function Page() {
  let fetcher = useFetcher<typeof action>();

  return (
    <>
      {fetcher.data ? <pre>{JSON.stringify(fetcher.data)}</pre> : null}
      <Button
        type="button"
        onClick={() => {
          fetcher.submit(
            { foo: "bar" },
            { method: "POST", encType: "application/json" },
          );
        }}
      >
        fetcher.submit
      </Button>
    </>
  );
}
1;
