import type { DataFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";

export async function action({ request }: DataFunctionArgs) {
  let data = await request.json();
  return json(data);
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
