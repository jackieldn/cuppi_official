import { AppGallery } from "@/components/apps/app-gallery";
import { getApps } from "@/lib/apps-data";

export default async function AppsPage() {
  const apps = await getApps();

  return (
    <div className="relative flex flex-col">
      <main className="flex-1">
        <AppGallery initialApps={apps} />
      </main>
    </div>
  );
}
