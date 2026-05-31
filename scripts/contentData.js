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
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=80",
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
const packages = [
  {
    id: 1,
    name: "Tirupati Balaji Darshan",
    vendor: "Sacred Trails India",
    price: 4999,
    originalPrice: 6499,
    discountPercentage: 23,
    category: "pilgrimage",
    city: "Tirupati",
    location: "Tirumala Hills",
    image: "https://images.unsplash.com/photo-1582510003294-1b66a9c2a2b0?auto=format&fit=crop&w=1200&q=60",
    cabTypes: CAB_TYPES_STANDARD,
    tags: ["Tirupati", "Darshan", "AP"],
    seo: "Tirupati package, Balaji darshan, pilgrimage tour Tirupati, cab with darshan slots",
    seoTitle: "Tirupati Balaji Darshan — Sacred Trails | cabzii.in",
    seoDescription: "Guided Tirupati pilgrimage with darshan planning, hotel stay options and sedan to tempo cab choice."
  },
  {
    id: 2,
    name: "Rameswaram & Madurai Temple Circuit",
    vendor: "Tamil Nadu Pilgrim Co.",
    price: 6999,
    originalPrice: 8999,
    discountPercentage: 22,
    category: "pilgrimage",
    city: "Rameswaram",
    location: "Ramanathaswamy Temple",
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=60",
    cabTypes: CAB_TYPES_STANDARD,
    tags: ["Rameswaram", "Madurai", "Temple"],
    seo: "Rameswaram Madurai tour, South India pilgrimage, temple circuit package",
    seoTitle: "Rameswaram Madurai Temple Circuit — cabzii.in",
    seoDescription: "Classic Tamil Nadu temple yatra covering Rameswaram, Madurai and en-route darshan with flexible cab type."
  },
  {
    id: 3,
    name: "Shirdi Sai Baba Pilgrimage",
    vendor: "Maharashtra Darshan",
    price: 5999,
    originalPrice: 7499,
    discountPercentage: 20,
    category: "pilgrimage",
    city: "Shirdi",
    location: "Sai Baba Temple",
    image: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1200&q=60",
    cabTypes: CAB_TYPES_STANDARD,
    tags: ["Shirdi", "Sai Baba", "Maharashtra"],
    seo: "Shirdi package, Sai Baba pilgrimage, Shirdi tour from Mumbai Pune",
    seoTitle: "Shirdi Sai Baba Pilgrimage — cabzii.in holidays",
    seoDescription: "Comfortable Shirdi darshan package with queue assistance tips and cab upgrade to Innova or tempo."
  },
  {
    id: 4,
    name: "Varanasi Ganga Aarti Experience",
    vendor: "Kashi Yatra",
    price: 8999,
    originalPrice: 10999,
    discountPercentage: 18,
    category: "pilgrimage",
    city: "Varanasi",
    location: "Dashashwamedh Ghat",
    image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=60",
    cabTypes: CAB_TYPES_STANDARD,
    tags: ["Varanasi", "Ganga", "Ghat"],
    seo: "Varanasi package, Ganga aarti tour, Kashi pilgrimage holiday",
    seoTitle: "Varanasi Ganga Aarti Package — Kashi Yatra | cabzii.in",
    seoDescription: "Spiritual Varanasi stay with evening Ganga aarti, Kashi Vishwanath visit and private cab transfers."
  },
  {
    id: 5,
    name: "Goa Beach & Nightlife Escape",
    vendor: "Sunset Holidays",
    price: 8999,
    originalPrice: 11499,
    discountPercentage: 22,
    category: "beach",
    city: "Goa",
    location: "Baga Beach",
    image: "https://images.unsplash.com/photo-1587922546307-776227941871?auto=format&fit=crop&w=1200&q=60",
    cabTypes: CAB_TYPES_STANDARD,
    tags: ["Goa", "Beach", "Couple"],
    seo: "Goa holiday package, beach tour Goa, North Goa cab package",
    seoTitle: "Goa Beach Escape — cabzii.in",
    seoDescription: "North Goa beaches, water sports add-ons and SUV or sedan cab for airport–hotel–beach hops."
  },
  {
    id: 6,
    name: "Kerala Backwater & Munnar",
    vendor: "Green Kerala Trails",
    price: 12999,
    originalPrice: 16499,
    discountPercentage: 21,
    category: "hill",
    city: "Kochi",
    location: "Alleppey Houseboat",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=60",
    cabTypes: CAB_TYPES_STANDARD,
    tags: ["Kerala", "Munnar", "Houseboat"],
    seo: "Kerala package, backwater holiday, Munnar tour Kerala",
    seoTitle: "Kerala Backwater & Munnar — cabzii.in",
    seoDescription: "Houseboat night, Munnar tea gardens and Innova-friendly hill roads. Toll, permit & driver bata extra."
  },
  {
    id: 7,
    name: "Rajasthan Forts & Palaces",
    vendor: "Royal Desert Routes",
    price: 15999,
    originalPrice: 19999,
    discountPercentage: 20,
    category: "heritage",
    city: "Jaipur",
    location: "Amer Fort",
    image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=60",
    cabTypes: CAB_TYPES_STANDARD,
    tags: ["Jaipur", "Udaipur", "Heritage"],
    seo: "Rajasthan tour package, Jaipur Udaipur holiday, heritage India trip",
    seoTitle: "Rajasthan Forts & Palaces — cabzii.in",
    seoDescription: "Jaipur, Udaipur and Jodhpur heritage circuit with tempo traveller option for larger families."
  },
  {
    id: 8,
    name: "Manali & Solang Adventure",
    vendor: "Himalaya Getaways",
    price: 11999,
    originalPrice: 14999,
    discountPercentage: 20,
    category: "adventure",
    city: "Manali",
    location: "Solang Valley",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=60",
    cabTypes: CAB_TYPES_STANDARD,
    tags: ["Manali", "Ski", "Himachal"],
    seo: "Manali package, Solang Valley tour, Himachal adventure holiday",
    seoTitle: "Manali Solang Adventure — cabzii.in",
    seoDescription: "Snow activities, Rohtang permit guidance and SUV recommended for mountain roads."
  },
  {
    id: 9,
    name: "Andaman Honeymoon Bliss",
    vendor: "Island Romance",
    price: 24999,
    originalPrice: 30999,
    discountPercentage: 19,
    category: "honeymoon",
    city: "Port Blair",
    location: "Havelock Island",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=60",
    cabTypes: [
      { id: "sedan", label: "Sedan", seats: 4, multiplier: 1 },
      { id: "suv", label: "SUV", seats: 6, multiplier: 1.1 }
    ],
    tags: ["Andaman", "Honeymoon", "Beach"],
    seo: "Andaman honeymoon package, Havelock holiday, couple trip Andaman",
    seoTitle: "Andaman Honeymoon Bliss — cabzii.in",
    seoDescription: "Romantic Andaman itinerary with ferry coordination, beach resorts and private island transfers."
  },
  {
    id: 10,
    name: "Ooty & Kodaikanal Family Hills",
    vendor: "Nilgiri Family Tours",
    price: 7999,
    originalPrice: 9999,
    discountPercentage: 20,
    category: "family",
    city: "Ooty",
    location: "Botanical Garden",
    image: "https://images.unsplash.com/photo-1596435208209-6e4c4d2d0f0a?auto=format&fit=crop&w=1200&q=60",
    cabTypes: CAB_TYPES_STANDARD,
    tags: ["Ooty", "Kodaikanal", "Kids"],
    seo: "Ooty Kodaikanal family package, Tamil Nadu hill holiday, Nilgiri tour",
    seoTitle: "Ooty Kodaikanal Family Package — cabzii.in",
    seoDescription: "Kid-friendly hill stations with toy train, lake boating and tempo traveller for extended family."
  }
];

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
    seoTitle: "Cab Booking in Chennai — Complete Guide 2026 | Acting Driver & Taxi Near Me",
    seoDescription:
      "Complete 2026 guide: cab booking in Chennai, acting driver in Chennai, call driver, taxi booking near me, travels near me & Tirupati taxi from Chennai. Book online on cabzii.in."
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
    id: 2,
    title: "How to Pick the Right Cab Type for Holiday Packages",
    excerpt: "Sedan for couples, Innova for families, tempo for groups — match seats to your itinerary.",
    author: "Cabzii Editorial",
    date: "May 25, 2026",
    seo: "holiday cab type, sedan vs Innova tour, tempo traveller pilgrimage",
    seoTitle: "Cab Type for Holiday Packages | Cabzii Blog",
    seoDescription: "Choose sedan, SUV, Innova or tempo when booking holiday packages. Toll, permit & driver bata extra."
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
    id: 5,
    title: "Top 5 Pilgrimage Circuits You Can Book on cabzii.in",
    excerpt: "Tirupati, Rameswaram, Shirdi, Varanasi and more — with cab type selection on every package.",
    author: "Sacred Trails Desk",
    date: "May 18, 2026",
    seo: "pilgrimage packages India, temple tour booking, cabzii holidays",
    seoTitle: "Top Pilgrimage Circuits on Cabzii | Blog",
    seoDescription: "Explore curated pilgrimage holiday packages with flat package fare and flexible vehicle upgrades."
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
      "Booked Tirupati pilgrimage package with Innova upgrade. Driver knew temple timings and total matched the quote.",
    rating: 5
  },
  {
    id: 2,
    name: "Rahul Jain",
    location: "Mumbai",
    message: "Shirdi holiday on cabzii.in was smooth — cab type selector made it easy to pick SUV for our family of five.",
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
    message: "Goa beach package — picked sedan for couple trip, price updated instantly. Would book Kerala next.",
    rating: 5
  },
  {
    id: 6,
    name: "Arjun Mehta",
    location: "Pune",
    message: "Compared vendors for Chennai sedan in one search. Holiday and cab booking both took under five minutes.",
    rating: 5
  }
];

module.exports = { cabs, packages, driverServices, blogs, testimonials };
