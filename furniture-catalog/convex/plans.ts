export const PLAN_IDS = ["studio", "residence", "atelier", "estate"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const ARRANGEMENT_COST = 12;
export const CUSTOM_FURNITURE_COST = 25;
export const WELCOME_CREDITS = 20;

export const PLANS: Record<PlanId, {
  label: string;
  homes: number;
  monthlyCredits: number;
  priceMonthly: number;
  priceYearly: number;
  yearlyBilled: number;
  blurb: string;
}> = {
  studio: {
    label: "Studio",
    homes: 1,
    monthlyCredits: 0,
    priceMonthly: 0,
    priceYearly: 0,
    yearlyBilled: 0,
    blurb: "One home to start. The IKEA catalog is included. Welcome credits cover a first arrangement.",
  },
  residence: {
    label: "Residence",
    homes: 3,
    monthlyCredits: 250,
    priceMonthly: 29,
    priceYearly: 19,
    yearlyBilled: 228,
    blurb: "Three homes, for a listing, a rental, and the place you actually live.",
  },
  atelier: {
    label: "Atelier",
    homes: 10,
    monthlyCredits: 1000,
    priceMonthly: 79,
    priceYearly: 39,
    yearlyBilled: 468,
    blurb: "The working plan for agents and people furnishing more than one room at a time.",
  },
  estate: {
    label: "Estate",
    homes: 25,
    monthlyCredits: 4000,
    priceMonthly: 199,
    priceYearly: 99,
    yearlyBilled: 1188,
    blurb: "A full book of homes, with enough credits to arrange them without rationing.",
  },
};

export const CREDIT_PACKS = [
  { id: "100", credits: 100, price: 15 },
  { id: "400", credits: 400, price: 48 },
] as const;

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value);
}

export function creditGrant(plan: PlanId, interval: "month" | "year") {
  const monthly = PLANS[plan].monthlyCredits;
  return interval === "year" ? monthly * 12 : monthly;
}

export function creditCap(plan: PlanId, interval: "month" | "year" | undefined) {
  const monthly = PLANS[plan].monthlyCredits;
  if (!monthly) return 400;
  return interval === "year" ? monthly * 24 : monthly * 4;
}
