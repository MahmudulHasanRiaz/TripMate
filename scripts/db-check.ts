import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const result = await sql`select version()`;
  console.log(result[0].version);
  await sql.end();
}

main();
