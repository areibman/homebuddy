export const ARRANGEMENT_COST = 12;
export const CUSTOM_FURNITURE_COST = 25;
export const WELCOME_CREDITS = 20;

export const PLANS = [
  {
    id: "studio",
    label: "Studio",
    homes: 1,
    monthlyCredits: 0,
    priceMonthly: 0,
    priceYearly: 0,
    yearlyBilled: 0,
    blurb: "Walk a furnished apartment, then upload the floor plan of the one you actually have.",
    points: ["One home", "Furniture you can order", "Upload floor plans and photos", "Walk through in 3D"],
  },
  {
    id: "residence",
    label: "Residence",
    homes: 3,
    monthlyCredits: 250,
    priceMonthly: 29,
    priceYearly: 19,
    yearlyBilled: 228,
    blurb: "A listing, a rental, and the place you actually live.",
    points: ["Three homes", "AI places the furniture in the room", "Add pieces you already own", "Switch styles without redrawing"],
  },
  {
    id: "atelier",
    label: "Atelier",
    homes: 10,
    monthlyCredits: 1000,
    priceMonthly: 79,
    priceYearly: 39,
    yearlyBilled: 468,
    blurb: "For the weeks when you are furnishing more than one room at a time.",
    points: ["Ten homes", "Arrange several rooms at once", "Your furniture next to the catalog", "A catalog you can actually buy"],
    popular: true,
  },
  {
    id: "estate",
    label: "Estate",
    homes: 25,
    monthlyCredits: 4000,
    priceMonthly: 199,
    priceYearly: 99,
    yearlyBilled: 1188,
    blurb: "A full book of homes, each with its own plan, photos, and furniture.",
    points: ["Twenty-five homes", "Arrange a whole book of listings", "Your own furniture library", "Walk every plan in 3D"],
  },
] as const;

export const CREDIT_PACKS = [
  { id: "100", credits: 100, price: 15 },
  { id: "400", credits: 400, price: 48 },
] as const;

export const STYLES = [
  { name: "Modern", note: "Clean lines, quiet colors, furniture that does one job." },
  { name: "Scandinavian", note: "Pale wood, a low sofa, and enough empty floor to walk." },
  { name: "Contemporary", note: "Current, not costume. A few sharp pieces, then stop." },
  { name: "Minimalist", note: "Fewer objects, wider gaps, no decorative clutter." },
  { name: "Japanese", note: "Low furniture, natural materials, a clear path through the room." },
  { name: "Midcentury", note: "Tapered legs, warm wood, a sofa you can sit in for an evening." },
  { name: "Industrial", note: "Metal, darker textiles, and storage that looks unfinished on purpose." },
  { name: "Coastal", note: "Light fabrics, weathered wood, nothing heavy against the window." },
  { name: "Farmhouse", note: "A big table, a practical sofa, pieces that can take a real kitchen." },
  { name: "Bohemian", note: "Layered textiles, a softer rug, still using furniture you can order." },
] as const;

export const SAMPLES = [
  { id: "15", name: "333 Bush Street", detail: "2 bedrooms · 1,250 sq ft · walkable in 3D" },
  { id: "13", name: "Spera Plan E", detail: "1 bedroom · 503 sq ft · walkable in 3D" },
  { id: "flowhouse-wb1", name: "Flow House WB1", detail: "2 bedrooms · 970 sq ft · walkable in 3D" },
] as const;

export const FAQS = [
  {
    q: "What does an arrangement actually do?",
    a: "You pick a style. On a walkable floor plan, the furniture is placed inside the real walls and you walk through it. On a plan you uploaded, you get a buyable list of pieces that fit the room.",
  },
  {
    q: "What furniture can I use?",
    a: "The catalog starts with pieces you can order. Photograph a piece you already own, or add a model, and place it in the same room.",
  },
  {
    q: "How many homes can I have?",
    a: "Studio includes 1 home. Residence includes 3, Atelier 10, and Estate 25. A home is a named place with its own floor plans, photos, and arrangements. Existing homes stay if you downgrade; you just cannot add more until you are back under the limit.",
  },
  {
    q: "Can I upload my own furniture?",
    a: "Yes. Photograph a piece you already own and it becomes a model you can place in the room. You can also drop in a GLB if you already have one. It stays on your account, next to the catalog. Homebuddy is not affiliated with the retailers, and the included models are independent recreations.",
  },
  {
    q: "What happens to my photos?",
    a: "Floor plans and photos are stored on your account so the studio can furnish that home. They are not published in the shared catalog. Delete a home and its files go with it.",
  },
  {
    q: "How do I cancel?",
    a: "Open Account, then Billing. Stripe’s portal is where invoices, payment methods, and cancellation live. Credits already spent on an accepted arrangement are not refunded, because the generation cost has already been paid.",
  },
] as const;
