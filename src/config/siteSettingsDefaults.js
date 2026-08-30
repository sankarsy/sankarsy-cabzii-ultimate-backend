/** Default site content — used when DB is empty and as merge base for partial updates. */
const { DEFAULT_CALL_DRIVER_TARIFF, mergeCallDriverTariff } = require("./callDriverTariff");

const DEFAULT_SITE_SETTINGS = {
  siteName: "cabzii.in",
  brandColor: "#0056D2",
  tagline: "Premium cab, taxi, airport transfer, outstation and acting driver booking across South India with transparent fares.",
  contact: {
    email: "support@cabzii.com",
    phone: "+91 99441 97416",
    whatsapp: "9944197416",
    address: "Maduravoyal, Chennai, Tamil Nadu",
    hours: "Phone and WhatsApp support"
  },
  navbar: [
    { label: "Home", href: "/", visible: true, sortOrder: 1 },
    { label: "Cabs", href: "/cabs", visible: true, sortOrder: 2 },
    { label: "Buses", href: "/buses", visible: true, sortOrder: 3 },
    { label: "Call Driver", href: "/call-driver", visible: true, sortOrder: 4 },
    { label: "Holidays", href: "/holidays", visible: true, sortOrder: 5 },
    { label: "Hotels", href: "/hotels", visible: false, sortOrder: 6 },
    { label: "Flights", href: "/flights", visible: false, sortOrder: 7 }
  ],
  footerQuickLinks: [
    { label: "Home", href: "/" },
    { label: "Cabs", href: "/cabs" },
    { label: "Buses", href: "/buses" },
    { label: "Tours", href: "/packages" },
    { label: "Call Driver", href: "/call-driver" },
    { label: "Blog", href: "/blogs" },
    { label: "Reviews", href: "/testimonials" },
    { label: "Locations", href: "/locations" }
  ],
  footerLegalLinks: [
    { label: "Terms and Conditions", href: "/terms-and-conditions" },
    { label: "Travels Legal Declaration", href: "/legal-declaration" },
    { label: "Cancellation Policy", href: "/cancellation-policy" }
  ],
  hero: {
    eyebrow: "Cabzii — cabzii.in | Book online across India",
    title: "Book Cabs, Taxis & Acting Drivers Online",
    titleHighlight: "Acting Drivers",
    subtitle:
      "Cabs, acting drivers and tour packages in Chennai, Bengaluru, Mumbai and across India — transparent fares, instant booking.",
    image: "/images/hero-banner.png",
    promoBadge: "",
    promoTitle: "",
    promoSubtitle: "Transparent fares",
    searchPlaceholder: "Search cabs or tours...",
    tabs: [
      { id: "outstation", label: "Outstation" },
      { id: "local", label: "Local" },
      { id: "airport", label: "Airport" },
      { id: "rental", label: "Rental" },
      { id: "tour", label: "Tours" }
    ],
    cabTypes: ["Sedan", "SUV", "Innova"],
    trustBadges: [
      { label: "Upfront fares", iconKey: "price", icon: "💰" },
      { label: "Partner vehicles", iconKey: "verified", icon: "✅" },
      { label: "WhatsApp updates", iconKey: "support", icon: "🎧" }
    ]
  },
  heroStats: [
    { value: "Upfront", label: "Fares shown", iconKey: "car" },
    { value: "Chennai", label: "Home market", iconKey: "pin" },
    { value: "Partner", label: "Vehicles", iconKey: "driver" },
    { value: "WhatsApp", label: "Trip updates", iconKey: "users" }
  ],
  whySection: {
    eyebrow: "Why Cabzii",
    title: "A premium cab booking experience",
    subtitle:
      "Airport taxi, outstation, local packages and acting driver from Chennai and Tamil Nadu corridors."
  },
  whyStats: [
    { value: "Upfront", label: "Fares shown" },
    { value: "Partner", label: "Vehicles" },
    { value: "Chennai", label: "Home market" },
    { value: "WhatsApp", label: "Trip updates" }
  ],
  whyChooseUs: [
    { title: "Published Chennai tariff", subtitle: "Local, outstation and van packages are listed on the Cabzii tariff page.", iconKey: "price" },
    { title: "Partner vehicles", subtitle: "Cabzii assigns a cab or acting driver after you confirm.", iconKey: "verified" },
    { title: "WhatsApp and phone", subtitle: "Trip updates and booking help on WhatsApp and phone.", iconKey: "support" },
    { title: "Fares shown first", subtitle: "Compare the fare before you confirm.", iconKey: "secure" }
  ],
  homeSections: [
    { key: "cabs", enabled: true, eyebrow: "Premium Fleet", title: "Featured Cabs", subtitle: "Compare fares and book instantly.", limit: 6, sortOrder: 1 },
    { key: "drivers", enabled: true, eyebrow: "Call Driver", title: "Need a Driver for Your Own Car?", subtitle: "Book a trusted Cabzii Call Driver in Chennai and outstation.", limit: 6, sortOrder: 2, viewAllHref: "/call-driver" },
    { key: "tours", enabled: true, eyebrow: "Explore India", title: "Tour Packages", subtitle: "Weekend getaways and group tours.", limit: 6, sortOrder: 3 },
    { key: "testimonials", enabled: true, eyebrow: "Happy Travelers", title: "Customer Testimonials", subtitle: "Real feedback from riders who booked with Cabzii.", limit: 3, sortOrder: 4, viewAllHref: "/testimonials" },
    { key: "blogs", enabled: true, eyebrow: "Latest Insights", title: "Travel Blog", subtitle: "Quick reads to help you book smarter and travel better.", limit: 3, sortOrder: 5, viewAllHref: "/blogs" }
  ],
  whatsappFab: { enabled: true, number: "9944197416" },
  holidayCategories: [
    { id: "pilgrimage", label: "Pilgrimage", image: "", desc: "Tirupati, Rameswaram, Madurai & more temple tours with cab, darshan & stay." },
    { id: "beach", label: "Beach", image: "", desc: "Goa, Pondicherry & coastal getaways — sun, sand and scenic ECR drives." },
    { id: "hill", label: "Hill Station", image: "", desc: "Ooty, Kodaikanal, Munnar & cool mountain escapes with sightseeing cabs." },
    { id: "heritage", label: "Heritage", image: "", desc: "Forts, palaces & UNESCO wonders — Mysore, Hampi, Thanjavur and beyond." },
    { id: "honeymoon", label: "Honeymoon", image: "", desc: "Romantic escapes with private cab, handpicked stays & flexible plans." },
    { id: "adventure", label: "Adventure", image: "", desc: "Safari trails, trekking bases & offbeat drives for thrill seekers." },
    { id: "family", label: "Family", image: "", desc: "Kid-friendly itineraries, spacious cabs & relaxed sightseeing for all ages." }
  ],
  pageSeo: {},
  callDriverTariff: DEFAULT_CALL_DRIVER_TARIFF,
  callDriverSeo: {}
};

function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(patch)) {
    const val = patch[key];
    if (val && typeof val === "object" && !Array.isArray(val) && base[key] && typeof base[key] === "object") {
      out[key] = deepMerge(base[key], val);
    } else if (val !== undefined) {
      out[key] = val;
    }
  }
  return out;
}

function mergeSiteSettings(stored) {
  const merged = deepMerge(DEFAULT_SITE_SETTINGS, stored || {});
  merged.callDriverTariff = mergeCallDriverTariff(merged.callDriverTariff);
  return merged;
}

module.exports = { DEFAULT_SITE_SETTINGS, mergeSiteSettings, deepMerge };
