import {Groq} from "groq-sdk";
if(!process.env.GROQ_API_KEY){
    throw new Error("Missing groq api key in enviornment variables");
}
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});
export function getGroqClient(){
    return groq;
}
export default groq;