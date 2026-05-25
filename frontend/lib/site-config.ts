export type AstrologerItem = {
  id: string;
  name: string;
  title: string;
  bio: string;
  experience: string;
  phone: string;
  whatsapp: string;
  photoUrl: string;
  upiId: string;
  instagram: string;
  youtube: string;
  facebook: string;
  address: string;
};

export type ServiceItem = {
  id: string;
  name: string;
  price: number;
  description: string;
  type: "consultation" | "class";
  paymentQrUrl: string;
  paymentUrl: string;
};

export type ScheduleItem = {
  id: string;
  className: string;
  teacher: string;
  classDate: string;
  classTime: string;
  courseDuration: string;
  type: string;
  mode: string;
  platform: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type TestimonialItem = {
  id: string;
  name: string;
  quote: string;
  rating: number;
};

export type SiteConfig = {
  brandName: string;
  heroTagline: string;
  heroTitle: string;
  heroDescription: string;
  astrologers: AstrologerItem[];
  services: ServiceItem[];
  schedule: ScheduleItem[];
  faqs: FaqItem[];
  testimonials: TestimonialItem[];
};

export const defaultSiteConfig: SiteConfig = {
  brandName: "Cosmic Consultation Studio",
  heroTagline: "Consultations, classes, remedies, and spiritual guidance",
  heroTitle: "Simple astrology website for consultations and classes with direct UPI booking.",
  heroDescription:
    "Show your services, class schedule, experience, and social links in one elegant place. Clients can choose a service, pay by UPI, and send payment screenshot to the astrologer for final confirmation.",
  astrologers: [
    {
      id: "astro-1",
      name: "Arijit Talukdar",
      title: "Astrologer and Spiritual Guide",
      bio: "Offers practical astrology guidance, spiritual support, and a simple personal booking experience.",
      experience: "12+ years of experience in consultations and teaching",
      phone: "+91 98765 43210",
      whatsapp: "919876543210",
      photoUrl: "",
      upiId: "7584972080jio@jio",
      instagram: "https://instagram.com",
      youtube: "https://youtube.com",
      facebook: "https://facebook.com",
      address: "New Delhi, India"
    }
  ],
  services: [
    {
      id: "service-1",
      name: "Career Consultation",
      price: 201,
      description: "Career direction, job timing, and personal remedies.",
      type: "consultation",
      paymentQrUrl: "",
      paymentUrl: ""
    },
    {
      id: "service-2",
      name: "Marriage Consultation",
      price: 701,
      description: "Marriage timing, compatibility, and relationship guidance.",
      type: "consultation",
      paymentQrUrl: "",
      paymentUrl: ""
    },
    {
      id: "service-3",
      name: "Astrology Foundation Class",
      price: 2500,
      description: "Beginner-friendly weekly class covering horoscope basics.",
      type: "class",
      paymentQrUrl: "",
      paymentUrl: ""
    }
  ],
  schedule: [
    {
      id: "schedule-1",
      className: "Foundation Batch",
      teacher: "Teacher A",
      classDate: "Tuesday",
      classTime: "7:00 PM - 8:30 PM",
      courseDuration: "4 months",
      type: "Theory",
      mode: "Online",
      platform: "Google Meet"
    },
    {
      id: "schedule-2",
      className: "Advanced Batch",
      teacher: "Teacher B",
      classDate: "Sunday",
      classTime: "11:00 AM - 1:00 PM",
      courseDuration: "4 months",
      type: "Practice",
      mode: "Hybrid",
      platform: "Zoom + Classroom"
    }
  ],
  faqs: [
    {
      id: "faq-1",
      question: "How do I book a consultation?",
      answer: "Choose a consultation, pay through the given UPI ID, and send the payment screenshot to the astrologer's WhatsApp number."
    },
    {
      id: "faq-2",
      question: "How do I join a class?",
      answer: "Select the class, complete the UPI payment, send the screenshot, and the astrologer will confirm your seat and class details."
    }
  ],
  testimonials: []
};
