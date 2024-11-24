import dotenv from "dotenv";
dotenv.config();

import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY! });
const databaseId = process.env.NOTION_DATABASE_ID!;

const getPages = async (pageId: string) => {
  const response = await notion.pages.retrieve({ page_id: pageId });
  console.log(response);
  return response;
};

export default getPages;