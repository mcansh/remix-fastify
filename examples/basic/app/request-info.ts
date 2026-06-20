import { createContext } from "react-router"

export interface RequestInfo {
  requestId: string
  userAgent: string
  source: string
}

export const requestInfoContext = createContext<RequestInfo>()
