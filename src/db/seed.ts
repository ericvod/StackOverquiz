import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";
import { db } from "../config/database";
import { env } from "../config/env";
import { categories, users } from "./schema";
import { CATEGORIES_SEED, CATEGORY_SEED_GROUPS, validateCategoriesSeed } from "./seeds/categories.seed";
import { QUIZ_BLUEPRINTS_SEED, validateQuizBlueprintsSeed } from "./seeds/quiz-blueprints.seed";

async function seed() {
  console.log("🌱 Starting seed...\n");
  validateCategoriesSeed();
  validateQuizBlueprintsSeed();

  // 1. Seed optional admin
  if (env.SEED_ADMIN_ENABLED) {
    console.log("👤 Seeding admin user...");

    const existingAdmin = await db.query.users.findFirst({
      where: or(eq(users.email, env.SEED_ADMIN_EMAIL), eq(users.username, env.SEED_ADMIN_USERNAME)),
    });

    if (existingAdmin) {
      console.log("   ↷ Admin seed skipped because the configured username or email already exists.\n");
    } else {
      const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);

      await db.insert(users).values({
        username: env.SEED_ADMIN_USERNAME,
        email: env.SEED_ADMIN_EMAIL,
        passwordHash,
        role: "admin",
      });

      console.log(`   ✅ Admin user created (${env.SEED_ADMIN_EMAIL})\n`);
    }
  } else {
    console.log("👤 Admin seed skipped. Set SEED_ADMIN_ENABLED=true and fill SEED_ADMIN_* to bootstrap an admin.\n");
  }

  // 2. Seed categories
  console.log("📂 Seeding categories...");
  for (const group of CATEGORY_SEED_GROUPS) {
    console.log(`   ↳ ${group.label}: ${group.curationGoal}`);
    console.log(`      beginner: ${group.difficultyCoverage.beginner}`);
    console.log(`      easy: ${group.difficultyCoverage.easy}`);
    console.log(`      medium: ${group.difficultyCoverage.medium}`);
    console.log(`      hard: ${group.difficultyCoverage.hard}`);
    console.log(`      expert: ${group.difficultyCoverage.expert}`);

    for (const category of group.categories) {
      await db.insert(categories).values(category).onConflictDoNothing();
      console.log(`      ✅ ${category.icon} ${category.name} (${category.type})`);
    }
  }

  console.log("\n🧭 Quiz blueprints curatoriais:");
  for (const blueprint of QUIZ_BLUEPRINTS_SEED) {
    console.log(`   ↳ ${blueprint.label} (${blueprint.questionCount} questoes)`);
    console.log(`      publico: ${blueprint.targetAudience}`);
    console.log(`      objetivo: ${blueprint.curationGoal}`);
    console.log(
      `      mix: beginner ${blueprint.recommendedDistribution.beginner}, easy ${blueprint.recommendedDistribution.easy}, medium ${blueprint.recommendedDistribution.medium}, hard ${blueprint.recommendedDistribution.hard}, expert ${blueprint.recommendedDistribution.expert}`,
    );
  }

  console.log(`\n🎉 Seed complete! ${CATEGORIES_SEED.length} categories processed.`);
  console.log("\n💡 Esse seed ainda e de catalogo base: categorias + admin opcional.");
  console.log(
    "💡 Para quizzes de alta qualidade, o proximo passo e seedar banco curado de perguntas por categoria, dificuldade e blueprint editorial.",
  );
  console.log(
    "💡 Para gerar conteudo inicial assistido, use o /ai/generate com token admin e revise a coerencia antes de publicar.",
  );

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
