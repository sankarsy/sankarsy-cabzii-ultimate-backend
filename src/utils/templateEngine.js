/** Replace {Token} placeholders in SEO templates. */
function renderTemplate(template, vars = {}) {
  if (!template) return "";
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key] ?? vars[key.toLowerCase()] ?? "";
    return String(val);
  });
}

function buildSeoFromTemplate(template, vars) {
  return {
    title: renderTemplate(template.titleTemplate, vars),
    description: renderTemplate(template.descriptionTemplate, vars),
    keywords: renderTemplate(template.keywordsTemplate, vars)
  };
}

module.exports = { renderTemplate, buildSeoFromTemplate };
