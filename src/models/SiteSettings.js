const mongoose = require("mongoose");
const { DEFAULT_SITE_SETTINGS } = require("../config/siteSettingsDefaults");

const linkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
    visible: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    siteName: { type: String, default: DEFAULT_SITE_SETTINGS.siteName },
    brandColor: { type: String, default: DEFAULT_SITE_SETTINGS.brandColor },
    tagline: { type: String, default: DEFAULT_SITE_SETTINGS.tagline },
    contact: {
      email: { type: String, default: DEFAULT_SITE_SETTINGS.contact.email },
      phone: { type: String, default: DEFAULT_SITE_SETTINGS.contact.phone },
      whatsapp: { type: String, default: DEFAULT_SITE_SETTINGS.contact.whatsapp },
      address: { type: String, default: DEFAULT_SITE_SETTINGS.contact.address },
      hours: { type: String, default: DEFAULT_SITE_SETTINGS.contact.hours }
    },
    navbar: { type: [linkSchema], default: () => DEFAULT_SITE_SETTINGS.navbar },
    footerQuickLinks: { type: [mongoose.Schema.Types.Mixed], default: () => DEFAULT_SITE_SETTINGS.footerQuickLinks },
    footerLegalLinks: { type: [mongoose.Schema.Types.Mixed], default: () => DEFAULT_SITE_SETTINGS.footerLegalLinks },
    hero: { type: mongoose.Schema.Types.Mixed, default: () => DEFAULT_SITE_SETTINGS.hero },
    heroStats: { type: [mongoose.Schema.Types.Mixed], default: () => DEFAULT_SITE_SETTINGS.heroStats },
    whyChooseUs: { type: [mongoose.Schema.Types.Mixed], default: () => DEFAULT_SITE_SETTINGS.whyChooseUs },
    homeSections: { type: [mongoose.Schema.Types.Mixed], default: () => DEFAULT_SITE_SETTINGS.homeSections },
    whatsappFab: { type: mongoose.Schema.Types.Mixed, default: () => DEFAULT_SITE_SETTINGS.whatsappFab }
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);

module.exports = { SiteSettings };
