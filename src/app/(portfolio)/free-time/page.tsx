import { FreeTimeGallery } from "@/components/free-time/free-time-gallery";
import { getHobbyImages } from "@/lib/free-time-data";

export default async function FreeTimePage() {
  const images = await getHobbyImages();
  return (
    <div className="relative flex flex-col">
      <main className="flex-1">
        <FreeTimeGallery initialImages={images} />
      </main>
    </div>
  );
}
