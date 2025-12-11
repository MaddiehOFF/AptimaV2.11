import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_API_KEY;

if (!apiKey) {
    console.error("No API KEY found in .env");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Fetching models...");
        // Attempts to find the list method. 
        // In @google/genai it might be ai.models.list() or similar.
        const response = await ai.models.list();

        console.log("Available Models:");
        for await (const model of response) {
            console.log(`- ${model.name} (${model.displayName}): ${model.supportedGenerationMethods.join(', ')}`);
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
