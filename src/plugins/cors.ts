import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { env } from "../config/env";

export const corsPlugin = new Elysia({ name: "cors" }).use(
  cors({
    origin: env.CORS_ORIGINS === "*" ? true : env.CORS_ORIGINS.split(","),
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  }),
);
