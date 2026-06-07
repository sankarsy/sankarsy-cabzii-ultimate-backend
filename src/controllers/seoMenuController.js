const { SeoService } = require("../models/SeoService");
const { SeoRoute } = require("../models/SeoRoute");

async function listSeoMenu(req, res) {
  const [services, routes] = await Promise.all([
    SeoService.find({ published: true, showInMenu: true })
      .sort({ menuSortOrder: 1, name: 1 })
      .select("slug name menuLabel menuSortOrder menuCitySlug")
      .lean(),
    SeoRoute.find({ published: true, showInMenu: true })
      .sort({ menuSortOrder: 1, title: 1 })
      .select("slug title menuLabel menuSortOrder")
      .lean()
  ]);

  const items = [
    ...services.map((s) => ({
      label: s.menuLabel || s.name,
      href: `/services/${s.slug}/${s.menuCitySlug || "chennai"}`,
      sortOrder: s.menuSortOrder || 0,
      type: "service"
    })),
    ...routes.map((r) => ({
      label: r.menuLabel || r.title,
      href: `/routes/${r.slug}`,
      sortOrder: r.menuSortOrder || 0,
      type: "route"
    }))
  ].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));

  res.json({ success: true, data: items });
}

module.exports = { listSeoMenu };
