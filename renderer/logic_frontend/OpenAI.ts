import _ from "lodash";
import { IncomingMessage } from "http";
import https from "https";
import { Message, truncateMessages, countTokens } from "./Message";
import { getModelInfo } from "./Model";
import axios from "axios";
import { useChatStore } from "./ChatStore";

const get = useChatStore.getState;
const set = useChatStore.setState;

export function assertIsError(e: any): asserts e is Error {
  if (!(e instanceof Error)) {
    throw new Error("Not an error");
  }
}

async function fetchFromAPI(endpoint: string, key: string) {
  try {
    const res = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    return res;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      console.error(e.response?.data);
    }
    throw e;
  }
}

export async function testKey(key: string): Promise<boolean> {
  try {
    const res = await fetchFromAPI("https://api.openai.com/v1/models", key);
    return res.status === 200;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (e.response!.status === 401) {
        return false;
      }
    }
  }
  return false;
}

export async function fetchModels(key: string): Promise<string[]> {
  try {
    const res = await fetchFromAPI("https://api.openai.com/v1/models", key);
    return res.data.data.map((model: any) => model.id);
  } catch (e) {
    return [];
  }
}

export async function _streamCompletion(
  payload: string,
  apiKey: string,
  abortController?: AbortController,
  callback?: ((res: IncomingMessage) => void) | undefined,
  errorCallback?: ((res: IncomingMessage, body: string) => void) | undefined
) {
  const req = https.request(
    {
      hostname: "api.openai.com",
      port: 443,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: abortController?.signal,
    },
    (res) => {
      if (res.statusCode !== 200) {
        let errorBody = "";
        res.on("data", (chunk) => {
          errorBody += chunk;
        });
        res.on("end", () => {
          errorCallback?.(res, errorBody);
        });
        return;
      }
      callback?.(res);
    }
  );

  req.write(payload);

  req.end();
}

interface ChatCompletionParams {
  model: string | "gpt-3.5-turbo-0125";
  temperature: number;
  top_p: number;
  n: number;
  stop: string;
  max_tokens: number;
  presence_penalty: number;
  frequency_penalty: number;
  logit_bias: string;
}

const paramKeys = [
  "model",
  "temperature",
  "top_p",
  "n",
  "stop",
  "max_tokens",
  "presence_penalty",
  "frequency_penalty",
  "logit_bias",
];

function generate_image(prompt: string){
  const payload = JSON.stringify({
    prompt: prompt,
    model: "dall-e-3",
    n: 1,
    quality: "hd",
    size: "1024x1024",
  });

  const req = https.request(
    {
      hostname: "api.openai.com",
      port: 443,
      path: "/v1/images/generations",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${get().apiKey}`,
      },
    },
    (res) => {
      if (res.statusCode !== 200) {
        let errorBody = "";
        res.on("end", () => {
          console.log(res,errorBody)
        });
        set((state) => ({
          topic: "Invalid Image Request",
        }));
        set((state) => ({
          loadingImages: false
        }));
        return;
      }
      res.on("data", (res) => {
        set((state) => ({
          topic: "Image Generation of " + prompt,
        }));
        res = JSON.parse(res);
        if(get().images.length >= 2){
          set((state) => ({
            images: []
          }));
        }
        //Push into images array
        set((state) => ({
          images: [...state.images, res['data'][0]['url']]
        }));
        console.log(get().images)

          set((state) => ({
            loadingImages: false
          }));
      });
      res.on("end", () => {
        set((state) => ({
          apiState: "idle",
        }));
      });
    }
  );

  req.write(payload);

  req.end();
}

export async function streamCompletion(
  messages: Message[],
  params: ChatCompletionParams,
  apiKey: string,
  abortController?: AbortController,
  callback?: ((res: IncomingMessage) => void) | undefined,
  endCallback?:
    | ((promptTokensUsed: number, completionTokensUsed: number) => void)
    | undefined,
  errorCallback?: ((res: IncomingMessage, body: string) => void) | undefined
) {
  const modelInfo = getModelInfo(params.model);

  // Truncate messages to fit within maxTokens parameter
  const submitMessages = truncateMessages(
    messages,
    modelInfo.maxTokens,
    params.max_tokens
  );

  const submitParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => paramKeys.includes(key))
  );

  const tools = [
    {
      type: "function",
      function: {
        name: "generate_image",
        description: "The image description to generate. Example: a cat on a couch. Infer this from the user prompt.",
        parameters: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The description or prompt to generate the image from. Do not use 'default' and is required from user input",
            },
          },
        },
        required: [""],
      },
    },
  ];

  const payload = JSON.stringify({
    messages: submitMessages.map(({ role, content }) => ({ role, content })),
    stream: true,
    ...{
      ...submitParams,
      logit_bias: JSON.parse(params.logit_bias || "{}"),
      // 0 == unlimited
      max_tokens: params.max_tokens || undefined,
    },
    tools : tools,
    tool_choice: "auto",
  });

  let buffer = "";
  let sum = "";
  var functionName: string;

  const successCallback = (res: IncomingMessage) => {
    res.on("data", (chunk) => {
      if (abortController?.signal.aborted) {
        res.destroy();
        endCallback?.(0, 0);
        return;
      }
      // Split response into individual messages
      const allMessages = chunk.toString().split("\n\n");
      for (const message of allMessages) {
        // Remove first 5 characters ("data:") of response
        var cleaned = message.toString().slice(5);

        if (!cleaned || cleaned === " [DONE]") {
          return;
        }

        let parsed;
        //Replace  “ and ” for " and ' for JSON.parse to work
        //cleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
        try {
          parsed = JSON.parse(cleaned);
        } catch (e) {
          console.error(cleaned);
          return;
        }

        const content = parsed.choices[0]?.delta?.content;
        const toolCalls = parsed.choices[0]?.delta?.tool_calls;
        if (toolCalls) {
            for (const toolCall of toolCalls) {
              functionName = (toolCall.function.name) ? toolCall.function.name : functionName;
              sum+=toolCall.function.arguments;
            }
        }

        if (content === undefined || content === null) {
          continue;
        }
        buffer += content;
        
        callback?.(content);
      }
    });

    res.on("end", () => {

      if(sum != ""){

      const functionArgs = JSON.parse(sum);
      switch(functionName){
        case "generate_image":
          generate_image(functionArgs.prompt);
          set((state) => ({
            apiState: "Thinking of a image",
          }));
          set((state) => ({
            loadingImages: true
          }));
          break;
      }

      }
        const [loadingMessages, loadedMessages] = _.partition(
          submitMessages,
          "loading"
        );
        const promptTokensUsed = countTokens(
          loadedMessages.map((m) => m.content).join("\n")
        );
  
        const completionTokensUsed = countTokens(
          loadingMessages.map((m) => m.content).join("\n") + buffer
        );

        endCallback?.(promptTokensUsed, completionTokensUsed);

    });
  };

  return _streamCompletion(
    payload,
    apiKey,
    abortController,
    successCallback,
    errorCallback
  );
}

export const OPENAI_TTS_VOICES = [
  "nova",
  "alloy",
  "echo",
  "fable",
  "onyx",
  "shimmer"
] as const;

export const validateVoice = (voice: any): voice is typeof OPENAI_TTS_VOICES[number] => {
  if (!OPENAI_TTS_VOICES.includes(voice)) {
    return false;
  }
  return true;
}

export async function genAudio({
  text,
  key,
  voice,
  model
}: {
  text: string;
  key: string;
  voice?: string;
  model?: string;
}): Promise<string | null> {
  if (!voice || !model) {
    throw new Error("Missing voice or model");
  }
  const body = JSON.stringify({
    model,
    input: text,
    voice,
    response_format: 'mp3',
  });
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body
  });

  return URL.createObjectURL(await res.blob());
}
