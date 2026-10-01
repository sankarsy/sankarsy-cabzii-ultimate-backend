const mongoose = require("mongoose");
const { faqItemSchema, seoMetaSchema } = require("../schemas/cmsSchemas");

/** Per-city SEO meta. Live URLs: /{city} (cabs), /{city}/airport-cab-booking, /acting-driver/{city} (Chennai → /call-drivers-chennai). */
const seoCityPageSchema = new mongoose.Schema(
  {
    pageType: {
      type: String,
      required: true,
      enum: ["cab-booking", "acting-driver", "airport-cab-booking"],
      trim: true
    },
    citySlug: { type: String, required: true, trim: true, lowercase: true },
    seoTitle: { type: String, required: true, trim: true },
    seoDescription: { type: String, default: "", trim: true },
    seo: { type: String, default: "" },
    h1: { type: String, default: "", trim: true },
    lead: { type: String, default: "", trim: true },
    aboutCity: { type: String, default: "", trim: true },
    body: { type: String, default: "" },
    faqs: { type: [faqItemSchema], default: [] },
    touristPlaces: {
      type: [
        {
          title: { type: String, trim: true },
          body: { type: String, trim: true },
          href: { type: String, trim: true, default: "" }
        }
      ],
      default: []
    },
    seoMeta: { type: seoMetaSchema, default: () => ({}) },
    schemaJson: { type: String, default: "" },
    image: { type: String, default: "", trim: true },
    banner: { type: String, default: "", trim: true },
    popularLocations: { type: [String], default: [] },
    airportDetails: { type: String, default: "", trim: true },
    popularRoutes: { type: [String], default: [] },
    popularPackages: { type: [String], default: [] },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

seoCityPageSchema.index({ pageType: 1, citySlug: 1 }, { unique: true });

const SeoCityPage = mongoose.model("SeoCityPage", seoCityPageSchema);

module.exports = { SeoCityPage };
