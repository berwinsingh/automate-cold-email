import dotenv from "dotenv";
dotenv.config();

import fastify from "fastify";
import getFromDb from "./notion_functions/get_from_db";
import getPages from "./notion_functions/retreiving_page_data";

const server = fastify();

server.get("/get_pages_data", async () => {
  const db_data = await getFromDb();
  const page_data = await Promise.all(
    db_data.map(async (page) => await getPages(page.id, page.title))
  );
  return page_data;
});

server.get("/health", () => {
  return { status: 200, message: "Server is running" };
});

const start = async () => {
  try {
    await server.listen({ port: 3000 });
    console.log("Server listening on port 3000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
