export const cabs = [
  {
    id: 1,
    title: "City Comfort Sedan",
    vendor: "SwiftRide",
    type: "Sedan",
    seats: 4,
    price: 1400,
    hourlyRate: 320,
    dayRate: 2800,
    extraHourRate: 250,
    originalPrice: 1800,
    discountPercentage: 22,
    features: ["AC", "GPS", "Music"],
    seo: "sedan, city cab, airport transfer, SwiftRide, AC cab",
    seoTitle: "City Comfort Sedan — SwiftRide | Cabzii",
    seoDescription: "Book a comfortable AC sedan for city rides and airport transfers with transparent fares and GPS tracking."
  },
  {
    id: 2,
    title: "Urban Premium SUV",
    vendor: "Urban Wheels",
    type: "SUV",
    seats: 6,
    price: 2600,
    hourlyRate: 520,
    dayRate: 4700,
    extraHourRate: 420,
    originalPrice: 3200,
    discountPercentage: 19,
    features: ["AC", "GPS", "FastTag"],
    seo: "SUV, premium cab, family trip, Urban Wheels, outstation",
    seoTitle: "Urban Premium SUV — Urban Wheels | Cabzii",
    seoDescription: "Spacious premium SUV for families and groups with FastTag, GPS and generous luggage space."
  },
  {
    id: 3,
    title: "Family XL Van",
    vendor: "Highway Partner",
    type: "Van",
    seats: 8,
    price: 3200,
    hourlyRate: 620,
    dayRate: 5600,
    extraHourRate: 500,
    originalPrice: 3900,
    discountPercentage: 18,
    features: ["AC", "Music", "FastTag"],
    seo: "van, 8 seater, family cab, group travel, Highway Partner",
    seoTitle: "Family XL Van — Highway Partner | Cabzii",
    seoDescription: "Eight-seat van ideal for family holidays and group outstation trips with AC and entertainment."
  },
  {
    id: 4,
    title: "Business Sedan Plus",
    vendor: "Metro Cabs",
    type: "Sedan",
    seats: 4,
    price: 2200,
    hourlyRate: 420,
    dayRate: 3600,
    extraHourRate: 320,
    originalPrice: 2800,
    discountPercentage: 21,
    features: ["AC", "GPS"],
    seo: "business sedan, corporate cab, Metro Cabs, airport pickup",
    seoTitle: "Business Sedan Plus — Metro Cabs | Cabzii",
    seoDescription: "Executive sedan for meetings and airport runs with reliable drivers and clear pricing."
  },
  {
    id: 5,
    title: "Adventure SUV",
    vendor: "Trail Taxis",
    type: "SUV",
    seats: 6,
    price: 3800,
    hourlyRate: 690,
    dayRate: 6100,
    extraHourRate: 550,
    originalPrice: 4500,
    discountPercentage: 16,
    features: ["AC", "GPS", "Music", "FastTag"],
    seo: "adventure SUV, hill station cab, Trail Taxis, long drive",
    seoTitle: "Adventure SUV — Trail Taxis | Cabzii",
    seoDescription: "Rugged-ready SUV for hill routes and long drives with comfort features and experienced partners."
  },
  {
    id: 6,
    title: "Group Shuttle Van",
    vendor: "GoTransit",
    type: "Van",
    seats: 9,
    price: 2900,
    hourlyRate: 580,
    dayRate: 5100,
    extraHourRate: 460,
    originalPrice: 3400,
    discountPercentage: 15,
    features: ["AC", "Music"],
    seo: "9 seater van, shuttle, group cab, GoTransit",
    seoTitle: "Group Shuttle Van — GoTransit | Cabzii",
    seoDescription: "Nine-seat shuttle van for teams and events with straightforward per-day and hourly options."
  },
  {
    id: 7,
    title: "Intercity Smart Bus",
    vendor: "RoadLink",
    type: "Bus",
    seats: 36,
    price: 5200,
    hourlyRate: 900,
    dayRate: 7800,
    extraHourRate: 700,
    originalPrice: 6400,
    discountPercentage: 19,
    features: ["AC", "GPS", "FastTag", "Music"],
    seo: "bus hire, intercity coach, large group, RoadLink",
    seoTitle: "Intercity Smart Bus — RoadLink | Cabzii",
    seoDescription: "AC coach-style bus for large groups and corporate movements with GPS and on-board comfort."
  }
];

export const packages = [];

export const driverServices = [
  {
    id: 1,
    type: "standard",
    rating: "4.9",
    pricing: { "4 hour": 300, day: 2400, weekly: 5000, monthly: 18000 },
    serviceTitle: "Incity Driver Service",
    serviceSubtitle: "standard cars",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/101487/corolla-altis-exterior-right-front-three-quarter-5.jpeg?isig=0&q=80",
    vehiclePricing: 400,
    serviceCharges: { extraHour: 80, nightCharge: 100, dropCharge: "₹50-100", cancelCharge: 100 },
    seo: "driver on hire, incity chauffeur, standard car driver",
    seoTitle: "Incity Driver Service — Standard | Cabzii",
    seoDescription: "Hire a vetted driver by the hour or day for city use with clear extra-hour and night charges."
  },
  {
    id: 2,
    type: "luxury",
    rating: "4.9",
    pricing: { "4 hour": 300, day: 2400, weekly: 5000, monthly: 18000 },
    serviceTitle: "Incity Driver Service",
    serviceSubtitle: "luxury cars",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/107719/new-range-rover-exterior-right-front-three-quarter-2.jpeg?isig=0&q=80",
    vehiclePricing: 400,
    serviceCharges: { extraHour: 80, nightCharge: 100, dropCharge: "₹50-100", cancelCharge: 100 },
    seo: "luxury driver hire, premium chauffeur, city driver service",
    seoTitle: "Incity Driver Service — Luxury | Cabzii",
    seoDescription: "Professional drivers for luxury vehicles with predictable pricing for business and events."
  },
  {
    id: 3,
    type: "outstation standard",
    rating: "4.9",
    pricing: { "12 hour": 900, day: 2400, weekly: 5000, monthly: 18000 },
    serviceTitle: "Outstation Driver Service",
    serviceSubtitle: "standard cars",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/44709/sonet-exterior-right-front-three-quarter-5.jpeg?isig=0&q=80",
    vehiclePricing: 400,
    serviceCharges: { extraHour: 80, accommodation: "applicable", oneWayBusFare: 300, dropCharge: "₹50-100", cancelCharge: 100 },
    seo: "outstation driver, long trip chauffeur, standard SUV driver",
    seoTitle: "Outstation Driver — Standard | Cabzii",
    seoDescription: "Multi-day driver hire for outstation trips with accommodation rules and one-way fare clarity."
  },
  {
    id: 4,
    type: "outstation luxury",
    rating: "4.9",
    pricing: { "12 hour": 1200, day: 3000, weekly: 6200, monthly: 22000 },
    serviceTitle: "Outstation Driver Service",
    serviceSubtitle: "luxury cars",
    image: "https://imgd.aeplcdn.com/664x374/n/cw/ec/131825/x7-exterior-right-front-three-quarter-2.jpeg?isig=0&q=80",
    vehiclePricing: 400,
    serviceCharges: { extraHour: 100, accommodation: "applicable", oneWayBusFare: 500, dropCharge: "₹100-200", cancelCharge: 100 },
    seo: "luxury outstation driver, premium road trip chauffeur",
    seoTitle: "Outstation Driver — Luxury | Cabzii",
    seoDescription: "Experienced drivers for premium SUVs on long routes with higher comfort and service standards."
  }
];

// Backward-compatible driver listing used by legacy pages/APIs.
export const drivers = driverServices.map((service) => ({
  id: service.id,
  name: service.type.replace(/\b\w/g, (char) => char.toUpperCase()),
  experience: "5 Years",
  trips: 500,
  rating: service.rating,
  languages: ["Hindi", "English"],
  supportedVehicles: ["Sedan", "SUV", "Van"],
  pricing: {
    hourly: service.pricing?.["4 hour"] ?? service.pricing?.["12 hour"] ?? 300,
    day: service.pricing?.day ?? 2400,
    extraHour: service.serviceCharges?.extraHour ?? 80
  },
  seo: service.seo,
  seoTitle: service.seoTitle,
  seoDescription: service.seoDescription
}));

export const blogs = [
  {
    id: 1,
    title: "How to Choose the Right Cab for Family Trips",
    excerpt: "A practical checklist for cab type, seat count, luggage capacity and fare planning.",
    author: "Cabzii Editorial",
    date: "Apr 20, 2026",
    seo: "family cab, choose cab type, luggage, seats",
    seoTitle: "How to Choose the Right Cab for Family Trips | Cabzii Blog",
    seoDescription: "Use this checklist to match cab type, seats and luggage to your family itinerary before you book."
  },
  {
    id: 2,
    title: "5 Ways to Save Money on Weekend Cab Bookings",
    excerpt: "Learn when to book, how to compare vendors, and which add-ons to avoid.",
    author: "Travel Desk",
    date: "Apr 17, 2026",
    seo: "save on cabs, weekend booking, cab fares India",
    seoTitle: "5 Ways to Save on Weekend Cab Bookings | Cabzii Blog",
    seoDescription: "Timing, vendor comparison and add-on discipline can materially lower your weekend cab spend."
  },
  {
    id: 3,
    title: "Sedan vs SUV: Which One Should You Book?",
    excerpt: "Quick comparison of comfort, pricing and use-cases so you can pick confidently.",
    author: "Cab Expert Team",
    date: "Apr 14, 2026",
    seo: "sedan vs SUV, which cab to book, comfort comparison",
    seoTitle: "Sedan vs SUV: Which Cab Should You Book? | Cabzii Blog",
    seoDescription: "A concise comparison of comfort, pricing and scenarios to help you pick sedan or SUV with confidence."
  }
];

export const testimonials = [
  {
    id: 1,
    name: "Priya Sharma",
    location: "Delhi",
    message: "Super smooth booking experience. Driver arrived on time and cab condition was excellent.",
    rating: 5
  },
  {
    id: 2,
    name: "Rahul Jain",
    location: "Mumbai",
    message: "Loved the transparent fare breakdown. The filter options helped me pick the right cab fast.",
    rating: 5
  },
  {
    id: 3,
    name: "Anita Rao",
    location: "Bengaluru",
    message: "Support was very responsive and the payment process was seamless from booking to confirmation.",
    rating: 4
  }
];
