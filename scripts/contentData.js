const path = require("path");
const { buildDefaultFarePackages } = require(path.join(__dirname, "..", "src", "utils", "cabFarePackages"));

const rawCabs = [
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

const cabs = rawCabs.map((cab) => ({
  ...cab,
  farePackages: buildDefaultFarePackages(cab)
}));

const packages = [
  {
    id: 1,
    name: "Shimla & Manali",
    vendor: "Mountain Trails",
    duration: "4N/5D",
    price: 12499,
    originalPrice: 15699,
    discountPercentage: 20,
    image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=60",
    hourlyRate: 950,
    dayRate: 4200,
    extraHourRate: 700,
    tags: ["Family", "Hill"],
    seo: "Shimla Manali tour, hill station package, Himachal, family trip",
    seoTitle: "Shimla & Manali 4N/5D — Mountain Trails | Cabzii",
    seoDescription: "Scenic Himachal getaway with curated stays and transport options for families and small groups."
  },
  {
    id: 2,
    name: "Goa Beach Escape",
    vendor: "Sunset Holidays",
    duration: "3N/4D",
    price: 9999,
    originalPrice: 12499,
    discountPercentage: 20,
    image: "https://images.unsplash.com/photo-1587922546307-776227941871?auto=format&fit=crop&w=1200&q=60",
    hourlyRate: 840,
    dayRate: 3800,
    extraHourRate: 620,
    tags: ["Beach", "Couple"],
    seo: "Goa package, beach holiday, couple trip, Sunset Holidays",
    seoTitle: "Goa Beach Escape 3N/4D — Cabzii Tours",
    seoDescription: "Sun, sand and curated beach experiences with flexible add-ons for dining and activities."
  },
  {
    id: 3,
    name: "Rajasthan Royal Route",
    vendor: "Desert Quest",
    duration: "5N/6D",
    price: 16999,
    originalPrice: 20999,
    discountPercentage: 19,
    image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=60",
    hourlyRate: 1200,
    dayRate: 5200,
    extraHourRate: 880,
    tags: ["Heritage", "Group"],
    seo: "Rajasthan tour, Jaipur Udaipur, heritage circuit, Desert Quest",
    seoTitle: "Rajasthan Royal Route 5N/6D — Cabzii Tours",
    seoDescription: "Palaces, forts and desert landscapes on a heritage-focused itinerary with group-friendly pacing."
  },
  {
    id: 4,
    name: "Kerala Backwater Bliss",
    vendor: "Green Trails",
    duration: "4N/5D",
    price: 13999,
    originalPrice: 17499,
    discountPercentage: 20,
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=60",
    hourlyRate: 980,
    dayRate: 4500,
    extraHourRate: 730,
    tags: ["Nature", "Family"],
    seo: "Kerala backwaters, Alleppey, family nature tour, Green Trails",
    seoTitle: "Kerala Backwater Bliss 4N/5D — Cabzii Tours",
    seoDescription: "Houseboats, greenery and relaxed pacing for families who want nature without rough travel."
  },
  {
    id: 5,
    name: "Kashmir Snowline",
    vendor: "North Adventures",
    duration: "5N/6D",
    price: 18999,
    originalPrice: 22999,
    discountPercentage: 17,
    image: "https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=1200&q=60",
    hourlyRate: 1380,
    dayRate: 5900,
    extraHourRate: 980,
    tags: ["Hill", "Premium"],
    seo: "Kashmir tour, Gulmarg, premium hill package, North Adventures",
    seoTitle: "Kashmir Snowline 5N/6D — Cabzii Tours",
    seoDescription: "Premium snowline experience with upgraded stays and transport suited to mountain roads."
  },
  {
    id: 6,
    name: "Udaipur Weekend",
    vendor: "Royal Journeys",
    duration: "2N/3D",
    price: 7999,
    originalPrice: 9999,
    discountPercentage: 20,
    image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=60",
    hourlyRate: 760,
    dayRate: 3300,
    extraHourRate: 560,
    tags: ["Heritage", "Quick"],
    seo: "Udaipur weekend, short heritage trip, lakes, Royal Journeys",
    seoTitle: "Udaipur Weekend 2N/3D — Cabzii Tours",
    seoDescription: "Quick heritage break focused on lakes, palaces and compact sightseeing for busy travellers."
  }
];

const driverServices = [
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

const blogs = [
  {
    id: 1,
    title: "How to Choose the Right Cab for Family Trips",
    excerpt:
      "Match seat count, luggage space and AC comfort to your route. A simple checklist before you hit Book on Cabzii.",
    author: "Cabzii Editorial",
    date: "May 18, 2026",
    seo: "family cab, choose cab type, luggage, seats",
    seoTitle: "How to Choose the Right Cab for Family Trips | Cabzii Blog",
    seoDescription: "Use this checklist to match cab type, seats and luggage to your family itinerary before you book."
  },
  {
    id: 2,
    title: "5 Ways to Save Money on Weekend Cab Bookings",
    excerpt:
      "Book early, compare package slabs, and skip unused add-ons. Weekend travel does not have to be expensive.",
    author: "Travel Desk",
    date: "May 15, 2026",
    seo: "save on cabs, weekend booking, cab fares India",
    seoTitle: "5 Ways to Save on Weekend Cab Bookings | Cabzii Blog",
    seoDescription: "Timing, vendor comparison and add-on discipline can materially lower your weekend cab spend."
  },
  {
    id: 3,
    title: "Sedan vs SUV: Which One Should You Book?",
    excerpt:
      "Sedans win on city mileage; SUVs win on space and hill roads. Here is how to decide in under two minutes.",
    author: "Cab Expert Team",
    date: "May 12, 2026",
    seo: "sedan vs SUV, which cab to book, comfort comparison",
    seoTitle: "Sedan vs SUV: Which Cab Should You Book? | Cabzii Blog",
    seoDescription: "A concise comparison of comfort, pricing and scenarios to help you pick sedan or SUV with confidence."
  },
  {
    id: 4,
    title: "Airport Pickup Tips for Stress-Free Travel",
    excerpt:
      "Share flight details, allow buffer time for traffic, and confirm terminal pickup points with your driver in advance.",
    author: "Cabzii Editorial",
    date: "May 10, 2026",
    seo: "airport taxi, airport pickup Chennai, cab to airport",
    seoTitle: "Airport Pickup Tips | Cabzii Blog",
    seoDescription: "Practical airport transfer advice for Indian metros — timing, terminals and fare transparency on Cabzii."
  },
  {
    id: 5,
    title: "When to Hire an Acting Driver Instead of a Cab",
    excerpt:
      "Use your own car with a professional chauffeur for weddings, long workdays or multi-stop city errands.",
    author: "Driver Services Team",
    date: "May 8, 2026",
    seo: "acting driver, chauffeur hire, driver on rent",
    seoTitle: "When to Hire an Acting Driver | Cabzii Blog",
    seoDescription: "Learn when acting driver packages beat traditional cab booking for flexibility and comfort."
  },
  {
    id: 6,
    title: "Planning Outstation Trips: Distance, Tolls & Night Charges",
    excerpt:
      "Understand one-way vs round trip, night allowance and extra km rates before you confirm an outstation cab.",
    author: "Route Planning Desk",
    date: "May 5, 2026",
    seo: "outstation cab, toll charges, night charge cab",
    seoTitle: "Outstation Trip Planning Guide | Cabzii Blog",
    seoDescription: "A clear guide to outstation fare components on Cabzii so your long-distance bill has no surprises."
  }
];

const testimonials = [
  {
    id: 1,
    name: "Priya Sharma",
    location: "Delhi",
    message:
      "Booked an Innova for our family trip to Agra. Driver was punctual, cab was clean, and the fare matched the quote on the website.",
    rating: 5
  },
  {
    id: 2,
    name: "Rahul Jain",
    location: "Mumbai",
    message:
      "I use Cabzii for airport runs every month. Transparent pricing and quick OTP login make it my go-to app.",
    rating: 5
  },
  {
    id: 3,
    name: "Anita Rao",
    location: "Bengaluru",
    message:
      "Hired an acting driver for a full day of meetings. Professional, knew the city well, and billing was straightforward.",
    rating: 5
  },
  {
    id: 4,
    name: "Karthik Menon",
    location: "Chennai",
    message:
      "Weekend outstation to Pondicherry was smooth. Support helped me pick the right package when I was unsure about extra km.",
    rating: 5
  },
  {
    id: 5,
    name: "Sneha Patel",
    location: "Ahmedabad",
    message:
      "Tour package booking was easy — pickup, person count and total updated instantly. Would recommend for group travel.",
    rating: 4
  },
  {
    id: 6,
    name: "Arjun Mehta",
    location: "Pune",
    message:
      "Compared three vendors in one search and saved on our sedan booking. The whole flow took less than five minutes.",
    rating: 5
  }
];

module.exports = { cabs, packages, driverServices, blogs, testimonials };
