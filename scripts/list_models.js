import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

// Read .env manually since dotenv might not be installed or ESM issues
const envFile = fs.readFileSync('.env', 'utf-8');
const apiKeyLine = envFile.split('\n').find(line => line.startsWith('VITE_API_KEY='));
const apiKey = apiKeyLine ? apiKeyLine.split('=')[1].trim() : null;

if (!apiKey) {
    console.error("No API KEY found in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Fetching models...");
        const response = await ai.models.list();

        console.log("Available Models:");
        for await (const model of response) {
            console.log(`- ${model.name} (${model.displayName})`);
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
