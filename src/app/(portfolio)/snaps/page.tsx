import { SnapsGallery } from "@/components/snaps/snaps-gallery";
import { getSnaps } from "@/lib/snaps-data";

export default async function SnapsPage() {
  const snaps = await getSnaps();
  return (
    <div className="relative flex flex-col">
      <main className="flex-1">
        <SnapsGallery initialSnaps={snaps} />
      </main>
    </div>
  );
}
