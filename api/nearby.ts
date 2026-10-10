import { handler, query, quota } from "../server/http.js";
import { nearbyInput, searchPlaces } from "../server/places.js";
export default handler(["GET"], async (ctx) => {
  const input = nearbyInput.parse({
    category: query(ctx.req, "category"),
    lat: query(ctx.req, "lat"),
    lng: query(ctx.req, "lng"),
    location: query(ctx.req, "location"),
  });
  await quota(ctx, "places");
  return await searchPlaces(input);
});
