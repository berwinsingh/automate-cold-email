import dotenv from "dotenv";
dotenv.config();

import { Client } from "@notionhq/client";
import { getBlocks } from "./get_blocks";

const notion = new Client({ auth: process.env.NOTION_API_KEY! });

const getPages = async (pageId: string) => {
  const response = await notion.pages.retrieve({ page_id: pageId });
  const blocks = await getBlocks(response.id);
  return { response, blocks };
};

export default getPages;