import dotenv from 'dotenv';
dotenv.config();

import { Client } from '@notionhq/client';
import fastify from 'fastify';

const server = fastify();
const notion = new Client({ auth: process.env.NOTION_API_KEY! });
const databaseId = process.env.NOTION_DATABASE_ID!;

server.get('/', async (request, reply) => {
  const response = await notion.databases.query({ database_id: databaseId });
  const pages = response.results.map(page => {
    if ('properties' in page && 
        'Name' in page.properties && 
        'title' in page.properties.Name &&
        Array.isArray(page.properties.Name.title) &&
        page.properties.Name.title.length > 0) {
      return {
        id: page.id,
        title: page.properties.Name.title[0].plain_text,
      };
    }
    return { id: page.id, title: '' };
  });
  console.log(pages);
  return pages;
});

const start = async () => {
  try {
    await server.listen({ port: 3000 });
    console.log('Server listening on port 3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();