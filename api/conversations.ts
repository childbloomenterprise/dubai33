import { uuid } from "../shared/contracts.js";
import {
  handler,
  query,
  dbCheck,
  ownership,
  ApiError,
} from "../server/http.js";
export default handler(["GET", "DELETE"], async (ctx) => {
  const id = query(ctx.req, "id");
  if (!id) {
    if (ctx.req.method === "DELETE")
      throw new ApiError(
        400,
        "ID_REQUIRED",
        "Choose a conversation to delete.",
      );
    const { data, error } = await ctx.db
      .from("conversations")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("updated_at", { ascending: false })
      .limit(30);
    dbCheck(error);
    return data;
  }
  const validId = uuid.parse(id);
  await ownership(ctx.db, "conversations", validId, ctx.user.id);
  if (ctx.req.method === "DELETE") {
    const { error } = await ctx.db
      .from("conversations")
      .delete()
      .eq("id", validId)
      .eq("user_id", ctx.user.id);
    dbCheck(error);
    return { success: true };
  }
  const { data, error } = await ctx.db
    .from("messages")
    .select("*")
    .eq("conversation_id", validId)
    .eq("user_id", ctx.user.id)
    .order("created_at", { ascending: true })
    .limit(100);
  dbCheck(error);
  return data;
});
