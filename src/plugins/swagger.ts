import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { OPENAPI_EXAMPLES } from "../shared/http/openapi.examples";

export const swaggerPlugin = new Elysia({ name: "swagger" }).use(
  swagger({
    documentation: {
      info: {
        title: "StackOverquiz API",
        version: "1.0.0",
        description: "REST API for a programming quiz platform. The versioned API contract lives under /v1.",
      },
      tags: [
        { name: "Auth", description: "Authentication & OAuth2.0" },
        { name: "Questions", description: "CRUD and management of questions" },
        { name: "Quizzes", description: "CRUD and management of quizzes" },
        { name: "Categories", description: "Question categories" },
        { name: "Ratings", description: "Question rating system" },
        { name: "Users", description: "User profiles and gamification" },
        { name: "Uploads", description: "Image uploads via object storage" },
        { name: "AI", description: "AI-powered question generation" },
        {
          name: "Practice",
          description: "Free practice mode with random question batches and individual answer feedback",
        },
        {
          name: "Admin Content",
          description: "Admin-only content moderation: approve or reject pending questions and quizzes",
        },
        {
          name: "Admin Users",
          description: "Admin-only user account management (password reset, etc.)",
        },
        {
          name: "System",
          description: "Health checks and platform status",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
        examples: OPENAPI_EXAMPLES,
      },
    },
    path: "/swagger",
  }),
);
