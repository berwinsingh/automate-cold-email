import dotenv from "dotenv";
dotenv.config();

import { Client } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import extractEmailAndLinkedIn from "../functions/extractemail_and_linkedin";

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

  const emailAndLinkedIn = extractEmailAndLinkedIn(filteredBlocks);
  return emailAndLinkedIn;
};

export const getOfficialEmails = async (pageId: string) => {
  try {
    // First, get all child blocks to find the database block
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    
    // Find the database block
    const databaseBlock = blocks.results.find(block => 
      'type' in block && 
      block.type === 'child_database'
    );
    
    if (!databaseBlock || !('id' in databaseBlock)) {
      console.log('No database found in page:', pageId);
      return [];
    }

    // Query the child database
    const database = await notion.databases.query({
      database_id: databaseBlock.id,
      filter: {
        and: [
          {
            property: 'Email',
            email: {
              is_not_empty: true
            }
          }
        ]
      }
    });

    // Map and filter the results
    const contacts = database.results
      .filter((entry): entry is PageObjectResponse => 
        'properties' in entry
      )
      .map((entry) => {
        const properties = entry.properties;
        return {
          name: properties['Name']?.type === 'title' 
            ? properties['Name'].title[0]?.plain_text || '' 
            : '',
          email: properties['Email']?.type === 'email' 
            ? properties['Email'].email || '' 
            : '',
          linkedinStatus: properties['LinkedIn Status']?.type === 'status' 
            ? properties['LinkedIn Status'].status?.name || '' 
            : '',
          emailStatus: properties['Email Status']?.type === 'status' 
            ? properties['Email Status'].status?.name || '' 
            : '',
          lastUpdated: properties['Last Updated']?.type === 'date' 
            ? properties['Last Updated'].date?.start 
            : '',
          activeStatus: properties['Active Status']?.type === 'checkbox' 
            ? properties['Active Status'].checkbox 
            : false,
          reverted: properties['Reverted']?.type === 'checkbox' 
            ? properties['Reverted'].checkbox 
            : false,
          linkedinUrl: properties['LinkedIn']?.type === 'url' 
            ? properties['LinkedIn'].url || '' 
            : ''
        };
      });

    return contacts;
  } catch (error) {
    console.error('Error fetching official emails:', error);
    throw error;
  }
};