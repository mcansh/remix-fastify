import { redirect, type DataFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";

export async function action({ request }: DataFunctionArgs) {
  console.log(`ACTION`, await request.json());
  return redirect("/test");
}

export default function () {
  let fetcher = useFetcher();
  return (
    <button
      onClick={() => {
        fetcher.submit(
          { foo: "bar" },
          {
            method: "POST",
            encType: "application/json",
          },
        );
      }}
    >
      test
    </button>
  );
}
