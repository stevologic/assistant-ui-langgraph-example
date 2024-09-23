import { LangChainAdapter } from 'ai';
import { SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from "@langchain/openai";
import { END, START } from "@langchain/langgraph";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { StringOutputParser } from '@langchain/core/output_parsers';

//////////////////////// LANGRAPH SETEP ////////////////////////

// This function should add a message to the state
async function nodeFunction1({ messages }: typeof MessagesAnnotation.State) {
  messages.push(new SystemMessage("You are a pirate, act that way!"));
}
// This function should add the user input
async function nodeFunction2({ messages }: typeof MessagesAnnotation.State) {
  // get the last message from the user
  // this is more of a pass-thru as an example of stages
  const userMessages = { messages }.messages.filter((message: any) => message.constructor.name === 'HumanMessage');
}

// This function should leverage an llm to generate a response
async function nodeFunction3({ messages }: typeof MessagesAnnotation.State) {
   // get the last message from the user
   const userMessages = { messages }.messages.filter((message: any) => message.constructor.name === 'HumanMessage');
  // do logic here
  const model = new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 })
  const response = await model.invoke(messages);
  return { messages: [response]};
}
// Building the graph
const graph = new StateGraph(MessagesAnnotation)
  .addNode("node1", nodeFunction1)
  .addNode("node2", nodeFunction2)
  .addNode("node3", nodeFunction3)
  .addEdge(START, "node1")
  .addEdge("node1", "node2")
  .addEdge("node2", "node3")
  .addEdge("node3", END)
  .compile();

/////////////////////////////////////////////////////////////////



//////////////////////// API SETEP /////////////////////////////

export async function POST(request: Request) {
  // Parse the request
  const { messages } = await request.json();
  const lastUserMessage = messages[messages.length - 1].content[0].text;
  console.log("Last user message:", lastUserMessage);

  // ... LangGraph
  // Invoke Graph and get stream in return
  const stream = await graph.invoke({ 
      "messages": [...messages, lastUserMessage]
  });

  // ... prepare answer
  // Filter streamMetrics for AIMessage
  const aiMessages = stream.messages.filter((message: any) => message.constructor.name === 'AIMessage');
  const lastAIMessage = aiMessages[aiMessages.length - 1].content;
  const answer = lastAIMessage;

  // ... text out 
  // Prepare the response and stream it!
  const stringOutputParser = new StringOutputParser();
  const output = await stringOutputParser.stream(answer.toString());
  return LangChainAdapter.toDataStreamResponse(output);

  //////////////////////// API SETUP ////////////////////////


}