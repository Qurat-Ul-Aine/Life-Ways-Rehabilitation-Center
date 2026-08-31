export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  category: "Environment" | "Therapy" | "Facilities" | "Activities";
}

export const galleryImages: GalleryImage[] = [
  { id: "1", src: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=900&q=80", alt: "Welcoming reception area", category: "Environment" },
  { id: "2", src: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=900&q=80", alt: "Peaceful garden walkway", category: "Environment" },
  { id: "3", src: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=900&q=80", alt: "One-on-one counseling session", category: "Therapy" },
  { id: "4", src: "https://images.unsplash.com/photo-1591343395082-e120087004b4?w=900&q=80", alt: "Group therapy circle", category: "Therapy" },
  { id: "5", src: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80", alt: "Modern consultation room", category: "Facilities" },
  { id: "6", src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=900&q=80", alt: "Physiotherapy facility", category: "Facilities" },
  { id: "7", src: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80", alt: "Yoga and meditation activity", category: "Activities" },
  { id: "8", src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80", alt: "Team building activity", category: "Activities" },
  { id: "9", src: "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=900&q=80", alt: "Comfortable patient lounge", category: "Environment" },
  { id: "10", src: "https://images.unsplash.com/photo-1666214277657-e1c4a3f3c1c6?w=900&q=80", alt: "Art therapy in session", category: "Therapy" },
  { id: "11", src: "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=900&q=80", alt: "Family counseling room", category: "Facilities" },
  { id: "12", src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80", alt: "Outdoor recreation", category: "Activities" },
];
