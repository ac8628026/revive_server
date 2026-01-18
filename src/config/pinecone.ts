import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const indexName = process.env.PINECONE_INDEX!;

const existingIndexes = await pc.listIndexes();

const indexExists = existingIndexes.indexes?.some(index => index.name === indexName);

if (!indexExists) {
  console.log(`Creating index "${indexName}"...`);
  await pc.createIndexForModel({
    name: indexName,
    cloud: 'aws',
    region: 'us-east-1',
    embed: {
      model: 'llama-text-embed-v2',
      fieldMap: { text: 'chunk_text' },
    },
    waitUntilReady: true,
  });
} else {
  console.log(`Index "${indexName}" already exists`);
}

export const pcIndex = pc.index(indexName).namespace("revive-namespace");