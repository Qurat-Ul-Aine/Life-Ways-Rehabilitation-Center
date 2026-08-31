export interface Testimonial {
  id: string;
  name: string;
  relation: string;
  text: string;
  rating: number;
}

export const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Ahmed K.",
    relation: "Recovered Patient",
    text: "Life Ways gave me my life back. The doctors and therapists treated me with dignity, and the structured program helped me beat my addiction for good.",
    rating: 5,
  },
  {
    id: "2",
    name: "Fatima R.",
    relation: "Family Member",
    text: "My brother was struggling for years. After his stay here, the change is remarkable. The family counseling sessions helped us all heal together.",
    rating: 5,
  },
  {
    id: "3",
    name: "Anonymous",
    relation: "Patient",
    text: "The environment is calm and supportive. The clinical psychologists genuinely listen and the personalized treatment plan made all the difference.",
    rating: 5,
  },
  {
    id: "4",
    name: "Bilal H.",
    relation: "Family Member",
    text: "Professional, compassionate, and effective. Dr. Usman Ghani and the team are exceptional. Highly recommended for anyone needing mental health support.",
    rating: 5,
  },
  {
    id: "5",
    name: "Sana M.",
    relation: "Recovered Patient",
    text: "The CBT sessions with Maryam changed my outlook on life. I learned tools I still use every day. Forever grateful to the entire Life Ways team.",
    rating: 5,
  },
  {
    id: "6",
    name: "Anonymous",
    relation: "Family Member",
    text: "Clean facilities, qualified staff, and a real focus on long-term recovery — not just quick fixes. Worth every bit of trust we placed in them.",
    rating: 4,
  },
];
