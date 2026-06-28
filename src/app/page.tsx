import { FileBrowser } from "@/components/FileBrowser";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="h-screen">
      <FileBrowser />
    </div>
  );
}
