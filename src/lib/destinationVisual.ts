/**
 * Picks a backdrop for a destination name. Known places get a real photo
 * already shipped in public/images; anything else (Dubai included) gets a
 * destination-toned gradient instead of silently reusing the Munnar photo.
 * Drop a new file in public/images and add a line below to upgrade any
 * destination to a real photo later.
 */
export interface DestinationVisual {
  photo: string | null;
  gradient: string;
  alt: string;
}

const PHOTOS: Array<{ match: RegExp; photo: string; alt: string }> = [
  {
    match: /munnar/i,
    photo: "/images/munnar.webp",
    alt: "Morning mist over emerald tea plantations in Munnar",
  },
  {
    match: /allepp|alappuzha|backwater|kumarakom|kuttanad/i,
    photo: "/images/kerala-backwaters.webp",
    alt: "Traditional houseboat crossing calm tropical backwaters",
  },
];

const GRADIENTS: Array<{ match: RegExp; gradient: string }> = [
  {
    match: /dubai|u\.?a\.?e\.?|abu dhabi|sharjah/i,
    gradient: "linear-gradient(160deg,#d9b36a 0%,#8a5a2b 55%,#241708 100%)",
  },
  {
    match: /kochi|cochin|ernakulam/i,
    gradient: "linear-gradient(160deg,#6fa0b8 0%,#2f5a73 55%,#0e2129 100%)",
  },
  {
    match: /wayanad/i,
    gradient: "linear-gradient(160deg,#6fac70 0%,#2e5c38 55%,#102014 100%)",
  },
  {
    match: /thekkady|periyar/i,
    gradient: "linear-gradient(160deg,#5ea184 0%,#2a5445 55%,#0f1e18 100%)",
  },
  {
    match: /varkala|kovalam|beach|trivandrum|thiruvananthapuram/i,
    gradient: "linear-gradient(160deg,#5eb0d6 0%,#1f5f7a 55%,#0b1f27 100%)",
  },
];

const FALLBACK_GRADIENT =
  "linear-gradient(160deg,#6a87a0 0%,#2c4a63 55%,#101d28 100%)";

export function destinationVisual(
  destination?: string | null,
): DestinationVisual {
  const name = destination?.trim() || "";
  const photo = PHOTOS.find((p) => p.match.test(name));
  if (photo)
    return { photo: photo.photo, gradient: FALLBACK_GRADIENT, alt: photo.alt };
  const gradient = GRADIENTS.find((g) => g.match.test(name));
  return {
    photo: null,
    gradient: gradient ? gradient.gradient : FALLBACK_GRADIENT,
    alt: name ? `${name} — illustrative backdrop` : "Your journey backdrop",
  };
}
