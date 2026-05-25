import { t } from "elysia";

export const categorySchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  slug: t.String(),
  type: t.String(),
});

// Responding questions from category has the exact same schema as regular questions list.
// We will import questionSchema from questions module later.
