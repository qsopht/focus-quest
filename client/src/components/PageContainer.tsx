import { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>;
}
