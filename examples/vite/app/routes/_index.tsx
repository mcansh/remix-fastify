import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix</h1>
      <ul>
      <li>
          <Link to="/test"
          >
            Static Test /test/_index
          </Link>
        </li>
        <li>
          <Link to="/inline-dynamic/test"
          >
            Inline Dynamic Test /inline-dynamic/$stub
          </Link>
        </li>
        <li>
          <Link to="/dynamic/test"
          >
            Dynamic Test /dynamic/$stub
          </Link>
        </li>
        <li>
        <Link to="/non-dynamic"
          >
            Non-Dynamic Test /non-dynamic
          </Link>
        </li>

        <li>
        <Link to="/webgl2/extensions/WEBGL_anisotropy"
          >
            Bug Reproduction /webgl2/extensions/WEBGL_anisotropy
          </Link>
        </li>
      </ul>
    </div>
  );
}
