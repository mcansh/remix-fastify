import { MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";

export const loader = async ({ params }: LoaderFunctionArgs) => {
    if (
      !params.extension 
    ) {
      throw new Response('extension is missing', { status: 401 });
    }
  
    return { extension: params.extension   };
  };


export const meta: MetaFunction<typeof loader> = ({ data }) => {
    return [
      { title: data?.extension }
    ];
  };
  
  export default function Index() {
    const { extension } = useLoaderData<typeof loader>();
  
   
      return (
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
          <h1>{`extension is ${extension}`}</h1>
        </div>
      );
    }
    