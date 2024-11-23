import { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';


export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.stub) throw new Response('Could not find stub', { status: 401 });

  return { stub: params.stub };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: data?.stub }
  ];
};

export default function Index() {
  const { stub } = useLoaderData<typeof loader>();

 
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
        <h1>{`stub is ${stub}`}</h1>
      </div>
    );
  }
  