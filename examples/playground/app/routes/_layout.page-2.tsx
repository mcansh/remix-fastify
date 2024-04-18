import * as React from "react";
import { defer } from "@remix-run/node";
import { Await, useLoaderData } from "@remix-run/react";

// silence the warning due to root eslint config and example eslint config conflicts
// eslint-disable-next-line import/no-unresolved
import { sleep } from "~/sleep";

export function loader() {
  return defer({
    message: "loader data from page 2",
    deferred: sleep(2_000, "some text\n".repeat(2_000)),
  });
}

export default function Page2() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>Page 2</h2>
      <h3>{data.message}</h3>
      <p>Here&apos;s some content for page 2.</p>

      <div style={{ marginTop: 10 }}>
        <React.Suspense fallback={<div>Loading...</div>}>
          <Await resolve={data.deferred}>
            {(text) => <pre style={{ marginTop: 0 }}>{text}</pre>}
          </Await>
        </React.Suspense>
      </div>
    </div>
  );
}
