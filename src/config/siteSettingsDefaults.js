/** Default site content — used when DB is empty and as merge base for partial updates. */
const { DEFAULT_CALL_DRIVER_TARIFF, mergeCallDriverTariff } = require("./callDriverTariff");
const { DEFAULT_CALL_DRIVER_PAGE, mergeCallDriverPage } = require("./callDriverPage");

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
    { label: "Earn with Cabzii", href: "/earn", visible: true, sortOrder: 5 }
  ],
  footerQuickLinks: [
    { label: "Home", href: "/" },
    { label: "Cabs", href: "/cabs" },
    { label: "Buses", href: "/buses" },
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
      "Compare sedan, SUV and Innova fares. Airport, local, outstation and acting driver booking with fares shown before you confirm.",
    image: "/images/hero-banner.png",
    promoBadge: "",
    promoTitle: "",
    promoSubtitle: "Transparent fares",
    searchPlaceholder: "Search cabs, drivers or routes...",
    tabs: [
      { id: "outstation", label: "Outstation" },
      { id: "local", label: "Local" },
      { id: "airport", label: "Airport" },
      { id: "rental", label: "Rental" }
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
    { key: "testimonials", enabled: true, eyebrow: "Happy Travelers", title: "Customer Testimonials", subtitle: "Real feedback from riders who booked with Cabzii.", limit: 3, sortOrder: 4, viewAllHref: "/testimonials" },
    { key: "blogs", enabled: true, eyebrow: "Latest Insights", title: "Travel Blog", subtitle: "Quick reads to help you book smarter and travel better.", limit: 3, sortOrder: 5, viewAllHref: "/blogs" }
  ],
  whatsappFab: { enabled: true, number: "9944197416" },
  pageSeo: {},
  callDriverTariff: DEFAULT_CALL_DRIVER_TARIFF,
  callDriverSeo: {},
  callDriverPage: DEFAULT_CALL_DRIVER_PAGE
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
  delete merged.holidayCategories;
  if (Array.isArray(merged.homeSections)) {
    merged.homeSections = merged.homeSections.filter((row) => row?.key !== "tours");
  }
  if (merged.hero && Array.isArray(merged.hero.tabs)) {
    merged.hero.tabs = merged.hero.tabs.filter((tab) => tab?.id !== "tour" && tab?.id !== "holidays");
  }
  merged.callDriverTariff = mergeCallDriverTariff(merged.callDriverTariff);
  merged.callDriverPage = mergeCallDriverPage(merged.callDriverPage);
  return merged;
}

module.exports = { DEFAULT_SITE_SETTINGS, mergeSiteSettings, deepMerge };
