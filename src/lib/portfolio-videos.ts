// The videos uploaded to the Work projects, as files for the desktop's
// "Portfolio videos" folder. A project keeps them in `videoUrls` (see
// project-form), next to any YouTube links it has; only the uploaded files go
// in the folder, because those are the ones the Videos window plays with its own
// controls. Projects behind a password stay out, just as the Works page keeps
// them locked.
//
// Kept free of imports so the unit tests can load it straight from Node.

/** The parts of a project document this needs. */
export type ProjectVideoSource = {
  id: string;
  title?: string;
  /** The project's cover picture, used as the file's icon. */
  imageUrl?: string;
  videoUrls?: unknown;
  privacy?: { isPasswordProtected?: boolean };
};

export type PortfolioVideo = {
  /** `projectId:position`, where the position is the video's place in the project's own list. */
  id: string;
  title: string;
  url: string;
  thumbnail: string | null;
};

const YOUTUBE_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i;

/** The address if it is a well-formed https link, otherwise null. */
function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** An https link to an uploaded video file. YouTube links, other schemes and junk give null. */
export function uploadedVideoUrl(value: unknown): string | null {
  const url = httpsUrl(value);
  if (!url) return null;
  return YOUTUBE_HOSTS.test(new URL(url).hostname) ? null : url;
}

/**
 * Every uploaded video from the given projects, in the projects' order. A project
 * with one video gives a file named after it; with several, "Title (1)", "Title (2)".
 */
export function portfolioVideos(projects: ProjectVideoSource[]): PortfolioVideo[] {
  const files: PortfolioVideo[] = [];
  for (const project of projects) {
    if (project.privacy?.isPasswordProtected) continue;

    const links = Array.isArray(project.videoUrls) ? project.videoUrls : [];
    const uploaded = links
      .map((link, position) => ({ position, url: uploadedVideoUrl(link) }))
      .filter((video): video is { position: number; url: string } => video.url !== null);

    const title = project.title?.trim() || 'Untitled project';
    const thumbnail = httpsUrl(project.imageUrl);
    uploaded.forEach(({ position, url }, n) => {
      files.push({
        id: `${project.id}:${position}`,
        title: uploaded.length > 1 ? `${title} (${n + 1})` : title,
        url,
        thumbnail,
      });
    });
  }
  return files;
}
