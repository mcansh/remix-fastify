import * as React from "react";
import { Await, useLoaderData } from "react-router";
import { withDelay } from "~/utils";

export function loader() {
  return {
    message: "loader data from page 2",
    deferred: withDelay(2_000, "some text\n".repeat(2_000)),
  };
}

export default function Page2() {
  let data = useLoaderData<typeof loader>();

  return (
    <div>
      <h2>Page 2</h2>
      <h3>{data.message}</h3>
      <p>Here's some content for page 2.</p>

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
