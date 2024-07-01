import { unstable_defineLoader as defineLoader } from "@remix-run/node";

export const loader = defineLoader(() => {
  throw new Error("This is an error");
});
