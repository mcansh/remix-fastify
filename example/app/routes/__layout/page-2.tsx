import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

export function loader() {
  return json({ message: "loader data from page 2" });
}

export default function Page2() {
  let data = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Page 2</h1>
      <h2>{data.message}</h2>
      <p>Here's some content for page 2.</p>
      <Link to="/">Go back home</Link>
    </div>
  );
}
