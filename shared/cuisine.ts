export const dishes = [
  {
    id: "appam",
    name: "Appam & vegetable stew",
    subtitle: "Soft, lacy & comforting",
    image: "/images/appam.webp",
    diet: "vegetarian",
    ingredients:
      "Rice, coconut milk, vegetables and mild spices. Some recipes include dairy.",
    note: "Typical ingredients only. Confirm ingredients and preparation with the restaurant.",
  },
  {
    id: "fish",
    name: "Kerala fish curry",
    subtitle: "A taste of the Malabar coast",
    image: "/images/fish-curry.webp",
    diet: "nonvegetarian",
    ingredients:
      "Fish, chili, tamarind or kudampuli and spices. Some versions use coconut.",
    note: "Contains fish. Other ingredients and cross-contact are unverified.",
  },
  {
    id: "puttu",
    name: "Puttu & kadala",
    subtitle: "A classic Kerala morning",
    image: "/images/puttu.webp",
    diet: "vegetarian",
    ingredients: "Rice flour, coconut, black chickpeas and spices.",
    note: "Typical ingredients only. Restaurant recipe and allergy safety are unverified.",
  },
] as const;
