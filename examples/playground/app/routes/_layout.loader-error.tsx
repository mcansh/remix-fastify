import { unstable_defineLoader as defineLoader } from "@remix-run/node";

export const loader = defineLoader(() => {
  throw new Error("This is an error");
});

export default function Component() {
	return <p>You'll never see this</p>;
}
