import { AzureOpenAI } from "openai";

let client: AzureOpenAI | undefined;

export function getOpenAIClient() {
  if (!client) {
    client = new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    });
  }

  return client;
}