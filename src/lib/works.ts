export interface Work {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  images: string[];
  tags: string[];
  author: {
    name: string;
    avatar: string;
  };
  contributorType?: 'staff' | 'student' | 'community';
  publicationStatus?: 'draft' | 'pending_review' | 'published' | 'rejected';
  relatedArticleId?: string;
}

export async function getWorks(): Promise<Work[]> {
  try {
    const response = await fetch('/data/works.json');
    const works: Work[] = await response.json();
    return works;
  } catch (error) {
    console.error('Failed to fetch works:', error);
    return [];
  }
}
