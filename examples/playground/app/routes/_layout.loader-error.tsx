export function loader()  {
  throw new Error("This is an error");
}

export default function Component() {
	return <p>You'll never see this</p>;
}
