/** Editable /call-driver landing copy stored in SiteSettings.callDriverPage */

const DEFAULT_CALL_DRIVER_PAGE = {
  title: "Book Call Driver",
  subtitle: "Need a professional driver for your own car? Choose the service you need.",
  intro:
    "You book a Cabzii Call Driver service. A professional driver is assigned after booking — you do not pick an individual driver.",
  sections: [
    {
      heading: "Call driver in Chennai for your own car",
      body: "<p>Cabzii’s call driver and acting driver service in Chennai is for customers who already have a car and need a professional driver. Book a local city driver, an outstation driver, or an airport call driver without browsing a public driver list. Cabzii assigns a professional driver after you confirm the booking.</p>"
    },
    {
      heading: "How to book",
      body: "<ol><li>Choose the Call Driver service you need</li><li>Enter date, time, pickup and vehicle details</li><li>Review the estimated fare (or request a quote for monthly and corporate work)</li><li>Confirm the booking — Cabzii assigns an available driver</li></ol>"
    },
    {
      heading: "Outstation, airport, monthly and corporate",
      body: "<p>Outstation driver Chennai packages cover full-day highway trips in your vehicle. Airport call driver Chennai is driver-only pickup or drop — not an airport taxi. Monthly driver Chennai and school pickup requests are quoted by Cabzii. Corporate driver service Chennai is available for offices, events and regular staff transport. Valet parking drivers can be booked for functions with automatic supervisor planning.</p>"
    },
    {
      heading: "Safety and professional drivers",
      body: "<p>Drivers are operational resources managed by Cabzii. We can replace a driver if needed, cover availability gaps, and keep personal driver records in the admin panel rather than on the public website. Cabzii does not publish a public list of named drivers.</p>"
    },
    {
      heading: "Related Chennai bookings",
      body: "<p>Need a Cabzii vehicle as well? Use <a href=\"/car-rental/chennai-city-cabs\">cab booking Chennai</a> or <a href=\"/services/airport-taxi/chennai\">Chennai airport taxi</a>. City guide: <a href=\"/call-drivers-chennai\">acting driver in Chennai</a>. Published cab rates: <a href=\"/tariff\">tariff</a>.</p>"
    }
  ],
  services: {}
};

function mergeCallDriverPage(stored) {
  const src = stored && typeof stored === "object" ? stored : {};
  const sections = Array.isArray(src.sections) && src.sections.length ? src.sections : DEFAULT_CALL_DRIVER_PAGE.sections;
  return {
    title: String(src.title || "").trim() || DEFAULT_CALL_DRIVER_PAGE.title,
    subtitle: String(src.subtitle || "").trim() || DEFAULT_CALL_DRIVER_PAGE.subtitle,
    intro: String(src.intro || "").trim() || DEFAULT_CALL_DRIVER_PAGE.intro,
    sections: sections.map((row) => ({
      heading: String(row?.heading || "").trim(),
      body: String(row?.body || "").trim()
    })),
    services: src.services && typeof src.services === "object" ? src.services : {}
  };
}

module.exports = { DEFAULT_CALL_DRIVER_PAGE, mergeCallDriverPage };
