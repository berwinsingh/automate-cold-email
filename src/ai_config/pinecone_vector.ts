import dotenv from "dotenv";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { S3Loader } from "@langchain/community/document_loaders/web/s3";
import { z } from "zod";

dotenv.config();

const TrainingInputSchema = z.object({
  bucket: z.string().min(1).optional(),
  key: z.string().min(1),
});

type TrainingInput = z.infer<typeof TrainingInputSchema>;

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY!,
});

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const pineconeIndex = process.env.PINECONE_INDEX!;

const getIndexes = async (indexName: string): Promise<boolean> => {
  const response = await pc.listIndexes();
  return response.indexes?.some((index) => index.name === indexName) ?? false;
};

const trainVectorEmbeddings = async (data: TrainingInput) => {
  const validated = TrainingInputSchema.parse(data);
  
  if(!validated.bucket || !validated.key) {
    throw new Error("Bucket and key are required to train vector embeddings.");
  }
  
  // Initialize S3 loader
  const loader = new S3Loader({
    bucket: validated.bucket ?? process.env.BUCKET!,
    key: validated.key,
    s3Config: {
      region: process.env.REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID!,
        secretAccessKey: process.env.SECRET_ACCESS_KEY!,
      },
    },
    unstructuredAPIURL: process.env.UNSTRUCTURED_API_URL!,
    unstructuredAPIKey: process.env.UNSTRUCTURED_API_KEY!,
  });

  // Load and process the document
  const docs = await loader.load();
  
  // Split text into chunks using RecursiveCharacterTextSplitter
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ["\n\n", "\n", " ", ""],
    lengthFunction: (text) => text.length,
  });
  const splitDocs = await textSplitter.splitDocuments(docs);

  const indexExists = await getIndexes(pineconeIndex);
  console.log(`Index ${pineconeIndex} exists:`, indexExists);

  if (!indexExists) {
    try {
      await pc.createIndex({
        name: pineconeIndex,
        dimension: 1536,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
      });
      console.log("Successfully created new index");
    } catch (error) {
      console.log("Failed to create a new index", error);
      throw new Error("Failed to create index");
    }
  }

  const index = pc.index(pineconeIndex);
  
  try {
    // Batch process documents
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < splitDocs.length; i += batchSize) {
      const batch = splitDocs.slice(i, i + batchSize);
      const batchVectors = await Promise.all(
        batch.map(async (doc) => {
          const embeddingResponse = await embeddings.embedQuery(doc.pageContent);
          // Clean metadata to ensure compatibility with Pinecone
          const cleanMetadata = {
            bucket: validated.bucket || process.env.BUCKET!,
            key: validated.key,
            pageContent: doc.pageContent,
            // Filter and clean metadata to only include simple types
            ...Object.entries(doc.metadata).reduce((acc, [key, value]) => {
              // Only include string, number, boolean, or array of strings
              if (
                typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean' ||
                (Array.isArray(value) && value.every(item => typeof item === 'string'))
              ) {
                acc[key] = value;
              }
              return acc;
            }, {} as Record<string, any>)
          };

          return {
            id: `doc_${Date.now()}_${Math.random()}`,
            values: embeddingResponse,
            metadata: cleanMetadata
          };
        })
      );

      batches.push(index.upsert(batchVectors));
    }

    await Promise.all(batches);
    
    console.log("Successfully created/updated embeddings");
  } catch (error) {
    console.log("Failed to create/update embeddings", error);
    throw new Error("Failed to create/update embeddings");
  }
};

export const getSimilarData = async (query: string) => {
  try {
    const queryEmbedding = await embeddings.embedQuery(query);

    // Query Pinecone index
    const index = pc.index(pineconeIndex);
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
    });

    // Extract and return relevant information from the matches
    const matches = queryResponse.matches?.map(match => ({
      score: match.score,
      metadata: match.metadata,
    })) || [];

    if (matches.length === 0) {
      return {
        query,
        matches: [{
          score: 0,
          metadata: {
            pageContent: "No matches found. Please upload relevant data and try again."
          }
        }],
      };
    }

    return {
      query,
      matches,
    };
  } catch (error) {
    console.error("Error querying vector database:", error);
    throw new Error("Failed to retrieve similar data from vector database");
  }
};

export default trainVectorEmbeddings;