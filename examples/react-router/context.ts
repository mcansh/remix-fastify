import { unstable_createContext } from "react-router";

type AdapterContextType = {
  session: string;
};

let initialValue = {
  session: "lol default value",
} satisfies AdapterContextType;

export const adapterContext =
  unstable_createContext<AdapterContextType>(initialValue);
