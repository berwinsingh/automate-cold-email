import dotenv from "dotenv";
dotenv.config();

import { Client } from "@notionhq/client";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const notion = new Client({ auth: process.env.NOTION_API_KEY! });

export const getBlocks = async (pageId: string) => {
  const blocks = await notion.blocks.children.list({ block_id: pageId });
  
  const filteredBlocks = blocks.results.map(block => {
    if ('paragraph' in block) {
      return {
        ...block,
        paragraph: {
          ...block.paragraph,
          text: block.paragraph.rich_text.map(text => text.plain_text).join('')
        }
      }
    }
    if ('heading_1' in block) {
      return {
        ...block,
        heading_1: {
          ...block.heading_1,
          text: block.heading_1.rich_text.map(text => text.plain_text).join('')
        }
      }
    }
    if ('heading_2' in block) {
      return {
        ...block,
        heading_2: {
          ...block.heading_2,
          text: block.heading_2.rich_text.map(text => text.plain_text).join('')
        }
      }
    }
    if ('bulleted_list_item' in block) {
      return {
        ...block,
        bulleted_list_item: {
          ...block.bulleted_list_item,
          text: block.bulleted_list_item.rich_text.map(text => text.plain_text).join('')
        }
      }
    }
    return block;
  });

  console.log('Filtered blocks with content:', filteredBlocks);
  return filteredBlocks;
};

export const getOfficialEmails = async (pageId: string) =>{
  const blocks = await notion.blocks.children.list({ block_id: pageId });

}