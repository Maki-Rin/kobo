export interface Event {
  date: string;
  image: string;
}

export async function getEvents(): Promise<Event[]> {
  try {
    const response = await fetch('/data/events.json');
    const events: Event[] = await response.json();
    return events;
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}
