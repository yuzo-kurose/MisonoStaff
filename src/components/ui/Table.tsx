import type { ReactNode } from "react";

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-white shadow-sm">
      <table className="w-full border-collapse text-body-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-label-md text-neutral-700">
          {head}
        </thead>
        <tbody className="divide-y divide-neutral-200 [&>tr:hover]:bg-neutral-50">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-medium">{children}</th>;
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-neutral-900">{children}</td>;
}
