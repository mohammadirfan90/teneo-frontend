// Copy for the public pages. Every statement here describes how the platform actually
// behaves (see docs/context/backend-api.md) — no invented numbers.

export interface Faq {
  q: string
  a: string
}

export const FAQ_RENTERS: Faq[] = [
  {
    q: "How do I know a listing is real?",
    a: "Owners can only publish rooms after an admin approves their identity documents. Listings that break the rules are taken down by the Teneo team, and anything taken down disappears from search immediately.",
  },
  {
    q: "Do I need to verify my identity too?",
    a: "Yes. Before you can apply for a room you submit an ID document from your profile. An admin reviews it; once approved you can apply to as many rooms as you like.",
  },
  {
    q: "What happens after I apply?",
    a: "The owner screens your application, may propose viewing times, shortlists you and then approves or declines. You can follow every step from your dashboard and withdraw at any point before a decision.",
  },
  {
    q: "How is the lease signed?",
    a: "When an owner approves your application, Teneo drafts the lease with the rent, deposit and dates from the listing. You and the owner both sign it in the app, then you confirm your move-in date.",
  },
  {
    q: "How do I pay rent?",
    a: "Each month's invoice appears under Rent & bills. You pay by card through Stripe; the invoice is marked paid as soon as Stripe confirms the payment, and the receipt stays in your payment history.",
  },
  {
    q: "How are shared utility bills split?",
    a: "Owners record meter readings and Teneo calculates each bill from the units used and the meter's rate, then splits it between the tenants on the lease. Your share is added to your monthly invoice.",
  },
  {
    q: "How fast are repairs handled?",
    a: "Every maintenance ticket gets a response target based on priority: 4 hours for urgent, 24 hours for high, 72 hours for medium and 7 days for low. You can comment, dispute an unsatisfactory fix and rate the resolution.",
  },
  {
    q: "How does roommate matching work?",
    a: "Fill in your budget, preferred cities, move-in window, lifestyle (smoking, pets, sleep schedule) and interests. Teneo scores other renters against your preferences and explains each score. You choose who sees your profile.",
  },
]

export const FAQ_OWNERS: Faq[] = [
  {
    q: "What do I need to list a property?",
    a: "An owner account, an approved identity check, and the property details. You add the building, its flats and the rooms you want to let, with rent, deposit, availability and photos for each.",
  },
  {
    q: "Can I list individual rooms in a flat?",
    a: "Yes. Each room is its own listing with its own rent, deposit, occupancy and rules — or list the entire flat as a single unit.",
  },
  {
    q: "How do I choose a tenant?",
    a: "Applications arrive in your inbox with the renter's message. Move them through screening, propose viewing slots, shortlist and approve. Approving one applicant automatically closes the other open applications for that room.",
  },
  {
    q: "How do I get paid?",
    a: "Generate an invoice for any period of an active lease. Tenants pay by card through Stripe and the invoice updates to paid automatically. Your billing page shows what has been collected and what is outstanding.",
  },
]

export const HOW_STEPS_RENTER = [
  {
    title: "Search verified rooms",
    body: "Filter by city, area, rent, move-in date and amenities. Every listing comes from an identity-checked owner.",
  },
  {
    title: "Apply and view",
    body: "Send a short note with your application. The owner screens it and proposes viewing times.",
  },
  {
    title: "Sign the lease",
    body: "Once approved, both of you sign the same digital lease and you confirm your move-in date.",
  },
  {
    title: "Pay and live",
    body: "Pay monthly invoices by card, see your share of utility bills and raise repair tickets with response targets.",
  },
]

export const HOW_STEPS_OWNER = [
  {
    title: "Verify once",
    body: "Submit your ID from your profile. Publishing unlocks as soon as an admin approves it.",
  },
  {
    title: "List rooms",
    body: "Add the building, its flats and each room with rent, deposit, rules and photos — then publish.",
  },
  {
    title: "Choose tenants",
    body: "Screen applications, schedule viewings, shortlist and approve. The lease is drafted for you.",
  },
  {
    title: "Run the tenancy",
    body: "Invoice rent, split metered utilities, track payments and resolve maintenance tickets.",
  },
]
