import dotenv from "dotenv";
dotenv.config();

import { Client } from "@notionhq/client";
import { getBlocks, getOfficialEmails } from "./get_blocks";

const notion = new Client({ auth: process.env.NOTION_API_KEY! });

const getPages = async (pageId: string, pageTitle: string) => {
  const response = await notion.pages.retrieve({ page_id: pageId });
  const blocks = await getBlocks(response.id);
  const officialEmails = await getOfficialEmails(response.id);
  return { 
    title: pageTitle,
    response, 
    emailAndLinkedIn: blocks,
    officialEmails: officialEmails
  };
};

export default getPages;