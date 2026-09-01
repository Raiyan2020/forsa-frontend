export * from "./components";
export * from "./types/cms";
export * from "./types/timeSlot";
// NOTE: do NOT re-export ./schemas here. `schemas/fields.ts` imports the i18n
// singleton (`@/lib/i18n/config`), which pulls in react-i18next — and that
// calls `createContext` at module scope, which does not exist in the React
// Server graph. Any Server Component importing this barrel would crash the
// production build ("(0 , aV.createContext) is not a function"). Schema
// consumers (client forms) import from "@/features/shared/schemas" directly.
