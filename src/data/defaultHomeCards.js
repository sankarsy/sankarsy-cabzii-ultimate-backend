/** Homepage card seeds — keep in sync with frontend src/lib/homeShowcase.js */

const IMG = {
  outstation: "/images/showcase/outstation.webp",
  airport: "/images/showcase/airport.webp",
  chennai: "/images/showcase/chennai.webp",
  bengaluru: "/images/showcase/bengaluru.webp",
  temple: "/images/showcase/temple.webp",
  driver: "/images/showcase/driver.webp",
  tempo: "/images/showcase/tempo.webp",
  route: "/images/showcase/route.webp"
};

const OFFER_IMG = {
  outstation: "/images/offers/offer-outstation.webp",
  tirupati: "/images/offers/offer-tirupati.webp",
  oneway: "/images/offers/offer-oneway.webp",
  airport: "/images/offers/offer-airport.webp",
  airportChennai: "/images/offers/offer-airport-chennai.webp",
  driver: "/images/offers/offer-driver.webp",
  rameswaram: "/images/offers/offer-rameswaram.webp"
};

const offers = [
  {
    section: "offers",
    tag: "OUTSTATION",
    title: "Outstation cab packages",
    desc: "Book Sedan, SUV, Innova & Tempo Traveller cabs for every outstation trip.",
    iconKey: "car",
    color: "from-[var(--cabzii-brand)] to-blue-500",
    image: OFFER_IMG.outstation,
    href: "/cabs",
    code: "CABOUT20",
    fare: "",
    validTill: "31st Jul, 2026",
    sortOrder: 10,
    published: true
  },
  {
    section: "offers",
    tag: "ONE WAY",
    title: "Chennai → Tirupati one-way",
    desc: "Pay only for one side — transparent upfront fares with no hidden charges.",
    iconKey: "route",
    color: "from-emerald-500 to-teal-400",
    image: OFFER_IMG.oneway,
    href: "/chennai/outstation/chennai-to-tirupati",
    code: "ONEWAY",
    fare: "",
    validTill: "31st Jul, 2026",
    sortOrder: 30,
    published: true
  },
  {
    section: "offers",
    tag: "AIRPORT",
    title: "Chennai airport taxi",
    desc: "Airport pickup and drop with local packages from the published Chennai tariff.",
    iconKey: "airport",
    color: "from-indigo-500 to-violet-400",
    image: OFFER_IMG.airportChennai,
    href: "/chennai/airport-cab-booking",
    code: "CHNAIR",
    fare: "",
    validTill: "31st Jul, 2026",
    sortOrder: 50,
    published: true
  },
  {
    section: "offers",
    tag: "DRIVERS",
    title: "Acting driver from ₹900",
    desc: "Hire verified acting drivers for local, outstation & corporate trips.",
    iconKey: "driver",
    color: "from-slate-700 to-slate-500",
    image: OFFER_IMG.driver,
    href: "/call-driver",
    code: "DRIVER900",
    fare: "",
    validTill: "31st Jul, 2026",
    sortOrder: 60,
    published: true
  },
];

const services = [
  {
    section: "services",
    tag: "CHENNAI",
    title: "Cab services in Chennai",
    desc: "Airport taxi, local hire and outstation cabs with upfront fares.",
    iconKey: "car",
    color: "from-[var(--cabzii-brand)] to-blue-500",
    image: IMG.chennai,
    href: "/cab-booking/chennai",
    code: "",
    fare: "From ₹899",
    validTill: "",
    sortOrder: 10,
    published: true
  },
  {
    section: "services",
    tag: "COIMBATORE",
    title: "Cab services in Coimbatore",
    desc: "Outstation and local taxi hire for Coimbatore and hill stations.",
    iconKey: "car",
    color: "from-amber-500 to-orange-400",
    image: IMG.outstation,
    href: "/cab-booking/coimbatore",
    code: "",
    fare: "From ₹799",
    validTill: "",
    sortOrder: 40,
    published: true
  },
  {
    section: "services",
    tag: "MADURAI",
    title: "Cab services in Madurai",
    desc: "Temple tours, airport taxi and outstation cabs in Madurai.",
    iconKey: "holiday",
    color: "from-rose-500 to-pink-400",
    image: IMG.temple,
    href: "/cab-booking/madurai",
    code: "",
    fare: "From ₹799",
    validTill: "",
    sortOrder: 50,
    published: true
  },
  {
    section: "services",
    tag: "TRICHY",
    title: "Cab services in Trichy",
    desc: "Airport drop, local taxi and one-way cabs from Trichy.",
    iconKey: "route",
    color: "from-slate-700 to-slate-500",
    image: IMG.route,
    href: "/cab-booking/trichy",
    code: "",
    fare: "From ₹749",
    validTill: "",
    sortOrder: 60,
    published: true
  },
  {
    section: "services",
    tag: "TIRUPATI",
    title: "Cab services in Tirupati",
    desc: "Darshan cabs, airport taxi and outstation returns from Tirupati.",
    iconKey: "holiday",
    color: "from-rose-500 to-pink-400",
    image: IMG.temple,
    href: "/cab-booking/tirupati",
    code: "",
    fare: "From ₹899",
    validTill: "",
    sortOrder: 80,
    published: true
  },
  {
    section: "services",
    tag: "VELLORE",
    title: "Cab services in Vellore",
    desc: "Local taxi, hospital drops and outstation cabs from Vellore.",
    iconKey: "driver",
    color: "from-slate-700 to-slate-500",
    image: IMG.driver,
    href: "/cab-booking/vellore",
    code: "",
    fare: "From ₹699",
    validTill: "",
    sortOrder: 90,
    published: true
  }
];

const routes = [
  {
    section: "routes",
    tag: "ONE WAY",
    title: "Chennai → Tirupati",
    desc: "Darshan one-way cab with verified drivers and flexible pickup.",
    iconKey: "holiday",
    color: "from-rose-500 to-pink-400",
    image: IMG.temple,
    href: "/chennai/outstation/chennai-to-tirupati",
    code: "",
    fare: "From ₹3,500",
    validTill: "",
    sortOrder: 10,
    published: true
  },
  {
    section: "routes",
    tag: "AIRPORT",
    title: "Chennai Airport Taxi",
    desc: "Airport pickup and drop — share terminal and flight time.",
    iconKey: "airport",
    color: "from-indigo-500 to-violet-400",
    image: IMG.airport,
    href: "/chennai/airport-cab-booking",
    code: "",
    fare: "From ₹1,200",
    validTill: "",
    sortOrder: 20,
    published: true
  },
  {
    section: "routes",
    tag: "OUTSTATION",
    title: "Madurai outstation cab",
    desc: "Temple city taxi, airport drop and outstation cabs from Madurai.",
    iconKey: "route",
    color: "from-amber-500 to-orange-400",
    image: IMG.temple,
    href: "/services/outstation-cab/madurai",
    code: "",
    fare: "From ₹3,999",
    validTill: "",
    sortOrder: 30,
    published: true
  }
];

const imageRemap = {
  "/images/offers/offer-outstation.png": OFFER_IMG.outstation,
  "/images/offers/offer-tirupati.png": OFFER_IMG.tirupati,
  "/images/offers/offer-oneway.png": OFFER_IMG.oneway,
  "/images/offers/offer-airport.png": OFFER_IMG.airport,
  "/images/offers/offer-airport-chennai.png": OFFER_IMG.airportChennai,
  "/images/offers/offer-driver.png": OFFER_IMG.driver,
  "/images/offers/offer-rameswaram.png": OFFER_IMG.rameswaram
};

module.exports = { offers, services, routes, imageRemap, IMG };
