const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_API_KEY");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  
  try {
    console.log("Checking v1 models...");
    const modelsV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey.trim()}`).then(r => r.json());
    console.log("V1 Models:", JSON.stringify(modelsV1.models?.map(m => m.name), null, 2));

    console.log("\nChecking v1beta models...");
    const modelsBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`).then(r => r.json());
    console.log("V1Beta Models:", JSON.stringify(modelsBeta.models?.map(m => m.name), null, 2));
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
