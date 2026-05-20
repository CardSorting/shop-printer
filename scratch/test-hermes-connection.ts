import { createHermesChatCompletion } from '../src/infrastructure/services/HermesService';

async function main() {
  console.log("Testing connection to remote Hermes Cloud Run agent...");
  console.log("Base URL:", process.env.HERMES_API_BASE_URL);
  console.log("API Key exists:", !!process.env.HERMES_API_KEY);
  
  try {
    const response = await createHermesChatCompletion(
      [{ role: 'user', content: 'Say "Bee hive operational!"' }],
      'You are a support agent testing connection.',
      'Test context'
    );
    console.log("\nSuccess! Response received from Hermes agent:");
    console.log("==========================================");
    console.log(response);
    console.log("==========================================");
  } catch (error: any) {
    console.error("\nConnection failed!");
    console.error(error);
  }
}

main();
