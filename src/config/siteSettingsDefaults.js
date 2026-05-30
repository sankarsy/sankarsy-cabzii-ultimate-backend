/** Default site content — used when DB is empty and as merge base for partial updates. */
const DEFAULT_SITE_SETTINGS = {
  siteName: "cabzii.in",
  brandColor: "#0056D2",
  tagline: "Premium cab, taxi, airport transfer, outstation and acting driver booking across South India with transparent fares.",
  contact: {
    email: "support@cabzii.com",
    phone: "+91 99441 97416",
    whatsapp: "9944197416",
    address: "Maduravoyal, Chennai, Tamil Nadu",
    hours: "Mon–Sun: 24×7 Support"
  },
  navbar: [
    { label: "Home", href: "/", visible: true, sortOrder: 1 },
    { label: "Cabs", href: "/cabs", visible: true, sortOrder: 2 },
    { label: "Tours", href: "/packages", visible: true, sortOrder: 3 },
    { label: "Drivers", href: "/drivers", visible: true, sortOrder: 4 },
    { label: "Offers", href: "/search?q=offers", visible: true, sortOrder: 5 }
  ],
  footerQuickLinks: [
    { label: "Home", href: "/" },
    { label: "Cabs", href: "/cabs" },
    { label: "Tours", href: "/packages" },
    { label: "Drivers", href: "/drivers" },
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
    promoBadge: "Up To",
    promoTitle: "20% OFF",
    promoSubtitle: "Cabs & Tours",
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
      { label: "Verified Drivers", iconKey: "verified", icon: "✅" },
      { label: "Best Price", iconKey: "price", icon: "💰" },
      { label: "24/7 Support", iconKey: "support", icon: "🎧" },
      { label: "Secure", iconKey: "secure", icon: "🔒" },
      { label: "Free Cancellation", iconKey: "cancel", icon: "🔄" }
    ]
  },
  heroStats: [
    { value: "50K+", label: "Happy Customers", iconKey: "users" },
    { value: "10K+", label: "Trips Completed", iconKey: "car" },
    { value: "500+", label: "Verified Drivers", iconKey: "driver" },
    { value: "150+", label: "Cities Covered", iconKey: "pin" },
    { value: "4.9/5", label: "Customer Rating", iconKey: "star" }
  ],
  whyChooseUs: [
    { title: "Sanitized Cabs", subtitle: "Clean & hygienic vehicles", iconKey: "shield" },
    { title: "Live Tracking", subtitle: "Real-time trip tracking", iconKey: "tracking" },
    { title: "Transparent Pricing", subtitle: "No hidden charges", iconKey: "tag" },
    { title: "24/7 Customer Support", subtitle: "We are here to help", iconKey: "headset" },
    { title: "Doorstep Pickup", subtitle: "On-time pickup", iconKey: "pickup" },
    { title: "Safe & Secure", subtitle: "Your safety is our priority", iconKey: "lock" }
  ],
  homeSections: [
    { key: "cabs", enabled: true, eyebrow: "Premium Fleet", title: "Featured Cabs", subtitle: "Compare fares and book instantly.", limit: 6, sortOrder: 1 },
    { key: "drivers", enabled: true, eyebrow: "Professional Chauffeurs", title: "Acting Drivers", subtitle: "Hire verified drivers for your car.", limit: 3, sortOrder: 2 },
    { key: "tours", enabled: true, eyebrow: "Explore India", title: "Tour Packages", subtitle: "Weekend getaways and group tours.", limit: 6, sortOrder: 3 },
    { key: "testimonials", enabled: true, eyebrow: "Happy Travelers", title: "Customer Testimonials", subtitle: "Real feedback from riders who booked with Cabzii.", limit: 3, sortOrder: 4, viewAllHref: "/testimonials" },
    { key: "blogs", enabled: true, eyebrow: "Latest Insights", title: "Travel Blog", subtitle: "Quick reads to help you book smarter and travel better.", limit: 3, sortOrder: 5, viewAllHref: "/blogs" }
  ],
  whatsappFab: { enabled: true, number: "9944197416" }
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
  return deepMerge(DEFAULT_SITE_SETTINGS, stored || {});
}

module.exports = { DEFAULT_SITE_SETTINGS, mergeSiteSettings, deepMerge };
