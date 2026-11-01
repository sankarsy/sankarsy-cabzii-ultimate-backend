const path = require("path");
const { buildDefaultFarePackages } = require(path.join(__dirname, "..", "src", "utils", "cabFarePackages"));

const CAB_TYPES_STANDARD = [
  { id: "sedan", label: "Sedan", seats: 4, multiplier: 1 },
  { id: "suv", label: "SUV", seats: 6, multiplier: 1.12 },
  { id: "innova", label: "Innova", seats: 7, multiplier: 1.18 },
  { id: "tempo", label: "Tempo Traveller", seats: 12, multiplier: 1.35 }
];

const VEHICLE_IMAGES = {
  sedan:
    "https://images.unsplash.com/photo-1621007947382-b6263ac8e237?auto=format&fit=crop&w=900&q=80",
  dzire:
    "https://images.unsplash.com/photo-1621007947382-b6263ac8e237?auto=format&fit=crop&w=900&q=80",
  wagon:
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=80",
  etios:
    "https://images.unsplash.com/photo-1552519507-da3b42c508e2?auto=format&fit=crop&w=900&q=80",
  ertiga:
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58dd?auto=format&fit=crop&w=900&q=80",
  innova:
    "https://images.unsplash.com/photo-1563729784474-d77dcd085025?auto=format&fit=crop&w=900&q=80",
  tempo:
    "https://images.unsplash.com/photo-1570125909232-e097327a4962?auto=format&fit=crop&w=900&q=80",
  amaze:
    "https://images.unsplash.com/photo-1552519507-da3b42c508e2?auto=format&fit=crop&w=900&q=80"
};

function buildCabSeo({ city, vehicleModel, category, vendor, type, seats }) {
  const cat = category.toLowerCase();
  return {
    seo: [
      `${city} ${vehicleModel} cab booking`,
      `${vehicleModel} taxi ${city}`,
      `${vehicleModel} cab hire ${city}`,
      `${type} cab ${city}`,
      `outstation ${vehicleModel} ${city}`,
      `airport taxi ${city} ${vehicleModel}`,
      `${cat} rental ${city}`,
      `${vehicleModel} per km ${city}`,
      `book ${vehicleModel} online ${city}`,
      "cab booking cabzii.in"
    ].join(", "),
    seoTitle: `Book ${vehicleModel} Cab in ${city} | ${category} Taxi & Outstation | cabzii.in`,
    seoDescription: `Rent ${vehicleModel} ${cat} in ${city} — AC ${type}, ${seats} seats, airport transfer, 4 Hrs/40 Km & 8 Hrs/80 Km packages. Verified ${vendor}. Book on cabzii.in.`
  };
}

function buildDriverSeo({ city, vehicleModel, category, vendor, type }) {
  const cat = category.toLowerCase();
  return {
    seo: [
      `${city} acting driver ${vehicleModel}`,
      `${vehicleModel} chauffeur ${city}`,
      `hire driver for ${vehicleModel} ${city}`,
      `driver on hire ${city} ${type}`,
      `${vehicleModel} driver package ${city}`,
      `acting driver ${cat} ${city}`,
      "cabzii acting driver",
      "cabzii.in chauffeur hire"
    ].join(", "),
    seoTitle: `Hire ${vehicleModel} Acting Driver in ${city} | Chauffeur for Your ${type} | cabzii.in`,
    seoDescription: `Professional acting driver for your ${vehicleModel} in ${city}. Same 4 Hrs/40 Km, 8 Hrs/80 Km & outstation packages as cab booking. Verified ${vendor} chauffeur on cabzii.in.`
  };
}

const rawCabs = [
  {
    id: 1,
    vehicleModel: "Maruti Dzire",
    title: "Maruti Dzire Taxi",
    category: "Taxi Car",
    vendor: "Cabzii Premier",
    type: "Sedan",
    seats: 4,
    bags: 2,
    examples: "Dzire, Etios, Xcent",
    price: 1199,
    hourlyRate: 299,
    dayRate: 2499,
    extraHourRate: 220,
    originalPrice: 1499,
    discountPercentage: 20,
    rating: 4.8,
    city: "Chennai",
    location: "T. Nagar",
    image: VEHICLE_IMAGES.sedan,
    features: ["AC", "GPS", "Bottled water", "Fuel included"]
  },
  {
    id: 2,
    vehicleModel: "Maruti Ertiga",
    title: "Maruti Ertiga Taxi",
    category: "Taxi Car",
    vendor: "Skyline Cabs",
    type: "SUV",
    seats: 6,
    bags: 4,
    examples: "Ertiga, XL6, Marazzo",
    price: 1899,
    hourlyRate: 449,
    dayRate: 3999,
    extraHourRate: 380,
    originalPrice: 2399,
    discountPercentage: 21,
    rating: 4.85,
    city: "Bengaluru",
    location: "Kempegowda Airport",
    image: VEHICLE_IMAGES.ertiga,
    features: ["AC", "GPS", "FastTag", "Fuel included"]
  },
  {
    id: 3,
    vehicleModel: "Toyota Innova Crysta",
    title: "Toyota Innova Crysta Taxi",
    category: "Taxi Car",
    vendor: "Deccan Wheels",
    type: "MUV",
    seats: 7,
    bags: 4,
    examples: "Innova Crysta, Innova Hycross",
    price: 2199,
    hourlyRate: 499,
    dayRate: 4499,
    extraHourRate: 420,
    originalPrice: 2799,
    discountPercentage: 21,
    rating: 4.9,
    city: "Hyderabad",
    location: "Hitech City",
    image: VEHICLE_IMAGES.innova,
    features: ["AC", "GPS", "Music", "Fuel included"]
  },
  {
    id: 4,
    vehicleModel: "Force Tempo Traveller",
    title: "Force Tempo Traveller Van",
    category: "Van / Bus",
    vendor: "South Pilgrim Tours",
    type: "Tempo Traveller",
    seats: 12,
    bags: 8,
    examples: "12-seater tempo, mini bus, van bus",
    price: 4499,
    hourlyRate: 899,
    dayRate: 7999,
    extraHourRate: 750,
    originalPrice: 5499,
    discountPercentage: 18,
    rating: 4.75,
    city: "Madurai",
    location: "Meenakshi Temple",
    image: VEHICLE_IMAGES.tempo,
    features: ["AC", "Pushback seats", "First aid", "Group travel"]
  },
  {
    id: 5,
    vehicleModel: "Honda Amaze",
    title: "Honda Amaze Taxi",
    category: "Taxi Car",
    vendor: "Kongu Ride",
    type: "Sedan",
    seats: 4,
    bags: 2,
    examples: "Amaze, Dzire, City",
    price: 1599,
    hourlyRate: 349,
    dayRate: 2999,
    extraHourRate: 280,
    originalPrice: 1999,
    discountPercentage: 20,
    rating: 4.7,
    city: "Coimbatore",
    location: "Gandhipuram",
    image: VEHICLE_IMAGES.amaze,
    features: ["AC", "GPS", "Hill-route ready"]
  },
  {
    id: 6,
    vehicleModel: "Maruti Ertiga",
    title: "Maruti Ertiga Taxi",
    category: "Taxi Car",
    vendor: "Coastal Cabs",
    type: "SUV",
    seats: 6,
    bags: 4,
    examples: "Ertiga, XL6",
    price: 1799,
    hourlyRate: 399,
    dayRate: 3499,
    extraHourRate: 350,
    originalPrice: 2199,
    discountPercentage: 18,
    rating: 4.82,
    city: "Pondicherry",
    location: "Promenade Beach",
    image: VEHICLE_IMAGES.ertiga,
    features: ["AC", "GPS", "Beach permit ready", "Fuel included"]
  }
].map((cab) => ({
  ...cab,
  ...buildCabSeo(cab),
  ac: true,
  fuelIncluded: true
}));

const cabs = rawCabs.map((cab) => ({
  ...cab,
  farePackages: buildDefaultFarePackages(cab)
}));

function driverLanguages(city) {
  if (city === "Chennai") return ["Tamil", "English", "Hindi"];
  if (city === "Bengaluru") return ["Kannada", "English", "Hindi"];
  if (city === "Hyderabad") return ["Telugu", "English", "Hindi"];
  return ["Tamil", "English"];
}

/** One acting driver per cab city — vehicle name, same rates & packages as paired cab */
const driverServices = rawCabs.map((cab, i) => {
  const driverSeo = buildDriverSeo(cab);
  return {
    id: i + 1,
    name: cab.vehicleModel,
    serviceTitle: `${cab.vehicleModel} Chauffeur`,
    vendor: cab.vendor,
    type: cab.category === "Van / Bus" ? "van" : "taxi",
    experience: "Verified chauffeur",
    trips: 920 + i * 175,
    rating: (4.75 + (i % 3) * 0.05).toFixed(1),
    discountPercentage: cab.discountPercentage,
    pricing: {
      hourly: cab.hourlyRate,
      day: cab.dayRate,
      extraHour: cab.extraHourRate
    },
    farePackages: buildDefaultFarePackages({
      price: cab.price,
      hourlyRate: cab.hourlyRate,
      dayRate: cab.dayRate,
      extraHourRate: cab.extraHourRate,
      discountPercentage: cab.discountPercentage
    }),
    image: cab.image,
    city: cab.city,
    location: cab.location,
    features: [
      ...(cab.features || []),
      `Chauffeur for ${cab.vehicleModel}`,
      `Your ${cab.type} — driver only`
    ],
    languages: driverLanguages(cab.city),
    supportedVehicles: [cab.vehicleModel, cab.type],
    ...driverSeo
  };
});
const packages = [];

const blogs = [
  {
    id: 7,
    slug: "cab-booking-in-chennai-complete-guide-2026",
    title: "Cab Booking in Chennai — Complete Guide 2026",
    excerpt:
      "Cab booking in Chennai, acting driver hire, taxi near me, travels near me & Tirupati taxi — fares, vehicle tips and how to book online on Cabzii.",
    body: require("./blogBodies/chennaiCabGuide2026"),
    author: "Cabzii Chennai Desk",
    date: "May 31, 2026",
    seo:
      "cab booking in chennai, acting driver in chennai, call driver in chennai, taxi booking near me, travels near me, tirupati taxi chennai, chennai taxi, travels in chennai, cabzii",
    seoTitle: "Chennai Cabs Guide | Packages, Hours & Cab Booking 2026 | Cabzii",
    seoDescription:
      "Chennai cabs guide — hourly packages (4 hours, 8 hours), outstation trips, acting driver hire and taxi near me. Book cab packages online on Cabzii.in."
  },
  {
    id: 1,
    title: "Tirupati Darshan: Best Time, Queue Tips & Cab Packages",
    excerpt: "Plan darshan slots, accommodation and the right cab type for your group size before you travel.",
    author: "Cabzii Pilgrim Desk",
    date: "May 28, 2026",
    seo: "Tirupati darshan tips, Tirupati cab package, Balaji travel guide",
    seoTitle: "Tirupati Darshan Guide | Cabzii Blog",
    seoDescription: "Practical Tirupati pilgrimage advice plus how to book sedan, Innova or tempo on cabzii.in."
  },
  {
    id: 3,
    title: "Chennai to Pondicherry: One-Way vs Round Trip Fares Explained",
    excerpt: "Compare one-way drops, round trips and driver allowance before you confirm on Cabzii.",
    author: "Route Planning Desk",
    date: "May 22, 2026",
    seo: "Chennai Pondicherry cab, one way cab fare, ECR road trip",
    seoTitle: "Chennai–Pondicherry Cab Fares | Cabzii Blog",
    seoDescription: "Understand outstation fare components for the popular Chennai–Pondy weekend route."
  },
  {
    id: 4,
    title: "Acting Driver vs Cab: When Each Option Saves You Money",
    excerpt: "Use your own vehicle with a chauffeur for multi-stop days; book a cab when you need a car too.",
    author: "Driver Services Team",
    date: "May 20, 2026",
    seo: "acting driver Chennai, chauffeur vs cab, driver on hire",
    seoTitle: "Acting Driver vs Cab | Cabzii Blog",
    seoDescription: "Decide between acting driver packages and full cab rental for city and outstation plans."
  },
  {
    id: 6,
    title: "Airport Taxi Chennai: Terminal Pickup Checklist",
    excerpt: "Share flight number, terminal and buffer time — avoid confusion at arrivals.",
    author: "Cabzii Airport Desk",
    date: "May 15, 2026",
    seo: "Chennai airport taxi, MAA cab booking, airport pickup tips",
    seoTitle: "Chennai Airport Taxi Checklist | Cabzii Blog",
    seoDescription: "Stress-free Chennai airport transfers with the right terminal and fare transparency."
  }
];

const testimonials = [
  {
    id: 1,
    name: "Lakshmi Venkat",
    location: "Chennai",
    message:
      "Booked a Chennai to Tirupati Innova cab. Driver knew temple timings and the total matched the quote.",
    rating: 5
  },
  {
    id: 2,
    name: "Rahul Jain",
    location: "Mumbai",
    message: "Outstation SUV booking on cabzii.in was smooth — cab type selector made it easy to pick a vehicle for our family of five.",
    rating: 5
  },
  {
    id: 3,
    name: "Anita Rao",
    location: "Bengaluru",
    message: "Airport SUV to Kempegowda was on time. OTP login and clear package slabs are why I stick with Cabzii.",
    rating: 5
  },
  {
    id: 4,
    name: "Karthik Menon",
    location: "Madurai",
    message: "Rameswaram–Madurai temple circuit tempo was comfortable for 10 of us. Support helped with cab type choice.",
    rating: 5
  },
  {
    id: 5,
    name: "Sneha Patel",
    location: "Ahmedabad",
    message: "Airport sedan pickup was on time and the fare matched the quote. Would book Cabzii again.",
    rating: 5
  },
  {
    id: 6,
    name: "Arjun Mehta",
    location: "Pune",
    message: "Compared vendors for Chennai sedan in one search. Cab booking took under five minutes.",
    rating: 5
  }
];

module.exports = { cabs, packages, driverServices, blogs, testimonials };
