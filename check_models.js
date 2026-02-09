import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listAvailableModels() {
  try {
    console.log("📋 Fetching list of available models...\n");
    
    // Use the REST API to list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error("❌ Failed to list models. Status:", response.status);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }
    
    const data = await response.json();
    const models = data.models || [];
    
    console.log(`Found ${models.length} available models:\n`);
    
    models.forEach((model) => {
      console.log(`✅ ${model.name}`);
      if (model.description) {
        console.log(`   ${model.description}`);
      }
      console.log();
    });
    
  } catch (error) {
    console.error("❌ Error listing models:", error.message);
  }
}

async function testModel(modelName) {
  try {
    console.log(`\nTesting model: ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello");
    console.log(`✅ SUCCESS! Model '${modelName}' works.`);
    return true;
  } catch (error) {
    console.log(`❌ Model '${modelName}' FAILED: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🔍 Support Bot API Checker\n");
  
  // First, list all available models
  await listAvailableModels();
  
  // Then try to test the configured model
  const configuredModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Testing configured model: ${configuredModel}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  const success = await testModel(configuredModel);
  
  if (!success) {
    console.log("\n⚠️  Trying fallback models...");
    const fallbacks = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];
    
    for (const model of fallbacks) {
      if (await testModel(model)) {
        console.log(`\n✅ Use this model instead. Update GEMINI_MODEL in .env to: ${model}`);
        break;
      }
    }
  }
}

main();