import dotenv from "dotenv";
dotenv.config();

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY! });
const databaseId = process.env.NOTION_DATABASE_ID!;

const getFromDb = async () => {
    const response = await notion.databases.query({ database_id: databaseId });
    const pages = response.results.map((page) => {
      if (
        "properties" in page &&
        "Name" in page.properties &&
        "Status" in page.properties &&
        "title" in page.properties.Name &&
        Array.isArray(page.properties.Name.title) &&
        page.properties.Name.title.length > 0 &&
        "type" in page.properties.Status &&
        page.properties.Status.type === "status" &&
        "status" in page.properties.Status &&
        page.properties.Status.status &&
        "name" in page.properties.Status.status
      ) {
        return {
          id: page.id,
          title: page.properties.Name.title[0].plain_text,
          status: page.properties.Status.status.name,
        };
    }
    return { id: page.id, title: "", status: "" };
  }).filter(page => page.status==='Lead') //Only returning the pages that have lead

  return pages;
};

export default getFromDb;
