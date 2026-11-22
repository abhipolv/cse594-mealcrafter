import { NavBar } from "@/components/nav-bar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
      <NavBar />
    </>
  );
}
