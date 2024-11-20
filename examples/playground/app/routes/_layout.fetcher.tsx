import type { ActionFunctionArgs } from "@remix-run/node";
import { data, useFetcher } from "@remix-run/react";

export async function action({ request }: ActionFunctionArgs) {
  let response = await request.json();
  return data(response);
}

export default function () {
  let fetcher = useFetcher<typeof action>();

  return (
    <>
      {fetcher.data ? <pre>{JSON.stringify(fetcher.data)}</pre> : null}
      <button
        type="button"
        onClick={() => {
          fetcher.submit(
            { foo: "bar" },
            { method: "POST", encType: "application/json" },
          );
        }}
      >
        fetcher.submit
      </button>
    </>
  );
}
