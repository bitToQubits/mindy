import _ from "lodash";
import { IncomingMessage } from "http";
import https from "https";
import { Message, truncateMessages, countTokens } from "./Message";
import { getModelInfo } from "./Model";
import axios from "axios";
import { notifications } from "@mantine/notifications";
import { useChatStore } from "./ChatStore";
import { v4 as uuidv4 } from "uuid";

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
  model: string;
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
        description: "Generate images from text. Example: a cat on a couch. Infer this from the user prompt. ",
        parameters: {
          type: "object",
          properties: {
            "prompt": {
              type: "string",
              description: "From user input. When the user asks you to generate an image, ask first for this argument.",
            },
            "number": {
              type: "integer",
              description: "The numbers of images to generated. Default is 1, maximum is 10.",
            },
          },
          required: ["prompt"],
        },
        required: ["prompt"],
      },
    },
    {
      type: "function",
      function: {
        name: "create_event_google_calendar",
        description: "Create events in google calendar. ",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title of the event. Required.",
            },
            description: {
              type: "string",
              description: "Description of the event. Optional.",
            },
            startTime: {
              type: "string",
              description: "The start time of the event. Required.",
            },
            endTime: {
              type: "string",
              description: "The end time of the event. Required.",
            },
          },
          required: ["title", "startTime", "endTime"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_task_google_calendar",
        description: "Create tasks in google calendar. ",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title for the task. Required",
            },
            description: {
              type: "string",
              description: "Task's description. Optional.",
            },
            dueDate: {
              type: "string",
              description: "The deadline or due time for the task. Required.",
            },
          },
          required: ["title", "dueDate"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_documents",
        description: "Creation of documents. ",
        parameters: {
          type: "object",
          properties: {
            subject: {
              type: "string",
              description: "Subject or topic for the document. Required.",
            },
            template: {
              type: "string",
              description: "The name of the template to use in order to create the document. Optional.",
            },
          },
          required: ["subject"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_note",
        description: "Create notes on Google Calendar from wikipedia articles. ",
        parameters: {
          type: "object",
          properties: {
            term: {
              type: "string",
              description: "The description, keyword or term to search in wikipedia. Do not use 'default' and is required from user input",
            },
            search_for_images: {
              type: "boolean",
              description: "Whether to include or not images in the note. Default is true.",
            },
          },
          required: ["term"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_in_internet",
        description: "Search for information on the internet. ONLY USE THIS FUNCTION WHEN USER ASKS TO DO SO. ",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The query to search for. Required.",
            }
          },
          required: ["query"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "analyze_image",
        description: "Analyze image input and process it using prompt for user. ",
        parameters: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "User question about what's present in the image. Required.",
            },
            image: {
              type: "string",
              description: "The name of the image to describe. Required.",
            },
          },
          required: ["question", "image"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "change_voice",
        description: "Change the voice of the assistant. ",
        parameters: {
          type: "object",
          properties: {
            voice_name: {
              type: "string",
              description: "The name of the voice to change to. Required. Possible values: Default, Omar, Dulce, Brito, Xiomara, Paola, Jose Miguel, Zeneyda, Dyango.",
            },
          },
          required: ["voice_name"],
        },
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
  var functionNames = [];

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
        const cleaned = message.toString().trim().slice(5);

        if (!cleaned || cleaned === " [DONE]") {
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch (e) {
          console.error(e);
          return;
        }

        const content = parsed.choices[0]?.delta?.content;

        const toolCalls = parsed.choices[0]?.delta?.tool_calls;

        if (toolCalls) {
            for (const toolCall of toolCalls) {
              if(toolCall.function.name){
                functionNames.push(toolCall.function.name);
                console.log(toolCall.function.name, "function argument")
              }
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
      const [loadingMessages, loadedMessages] = _.partition(
        submitMessages,
        "loading"
      );
      const promptTokensUsed = countTokens(
        loadedMessages.map((m) => m.content).join("\n")
      );


      try{
        sum = JSON.parse(sum);
      }catch(e){
        sum = "";
      }

      if(sum != ""){

        const get = useChatStore.getState;
        const set = useChatStore.setState;

        switch(functionNames[0]){
          case "generate_image":
            window.ipc.send('generate_image', sum);

            notifications.show({
              title: "Action started",
              message: "Creating images from text",
              color: "red",
            });

            window.ipc.on('generate_image', (respuesta) => {

              if(respuesta['status'] == true){

                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'][0],
                  chats: state.chats.map((c) => {
                    if (c.id === state.activeChatId) {
                      c.messages.pop();
                    }
                    return c;
                  }),
                }));

                for(let i = 0; i < respuesta['content'][1].length; i++){
                  set((state) => ({
                    chats: state.chats.map((c) => {
                      if (c.id === state.activeChatId) {
                        c.messages.push({
                          id: uuidv4(),
                          content: respuesta['content'][1][i],
                          role: "assistant",
                          loading: false,
                          type: "image",
                        });
                      }
                      return c;
                    }),
                  }));
                }

                notifications.show({
                  title: "Action completed",
                  message: respuesta['content'][0],
                  color: "green",
                });

              }else{

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'][0],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = "Error while trying to create some images.";
                        }
                      }
                    }
                    return c;
                  }),
                }));

                notifications.show({
                  title: "Error",
                  message: respuesta['content'],
                  color: "gray",
                });
              }

              window.ipc.off('generate_image');
            });

            break;
          case "create_event_google_calendar":
            window.ipc.send('create_event_google_calendar', sum);

            notifications.show({
              title: "Action started",
              message: "Creating event in Google Calendar",
              color: "red",
            });

            window.ipc.on('create_event_google_calendar', (respuesta) => {

              if(respuesta['status'] == true){
                notifications.show({
                  title: "Action completed",
                  message: respuesta['content'],
                  color: "green",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = respuesta['content'];
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }else{
                notifications.show({
                  title: "Error",
                  message: respuesta['content'],
                  color: "gray",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = "Error while trying to create a Google Event";
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }

              window.ipc.off('create_event_google_calendar');
            });

            break;
          case "create_task_google_calendar":
            window.ipc.send('create_task_google_calendar', sum);

            notifications.show({
              title: "Action started",
              message: "Creating task in Google Calendar",
              color: "red",
            });

            window.ipc.on('create_task_google_calendar', (respuesta) => {

              if(respuesta['status'] == true){
                notifications.show({
                  title: "Action completed",
                  message: respuesta['content'],
                  color: "green",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = respuesta['content'];
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }else{
                notifications.show({
                  title: "Error",
                  message: respuesta['content'],
                  color: "gray",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + "Error while trying to create a Google Task",
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = "Error while trying to create a Google Task";
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }

              window.ipc.off('create_task_google_calendar');
            });

            break;
          case "create_documents":
            window.ipc.send('create_documents', sum);

            notifications.show({
              title: "Action started",
              message: "Creating document from prompt",
              color: "red",
            });

            window.ipc.on('create_documents', (respuesta) => {

              if(respuesta['status'] == true){
                notifications.show({
                  title: "Action completed",
                  message: respuesta['content'],
                  color: "green",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = "Document created successfully";
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }else{
                notifications.show({
                  title: "Error",
                  message: respuesta['content'],
                  color: "gray",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = "Error while trying to create a document";
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }

              window.ipc.off('create_documents');
            });

            break;
          case "create_note":
            window.ipc.send('create_note', sum);

            notifications.show({
              title: "Action started",
              message: "Creating note from source",
              color: "red",
            });
            
            window.ipc.on('create_note', (respuesta) => {

              if(respuesta['status'] == true){
                notifications.show({
                  title: "Action completed",
                  message: respuesta['content'],
                  color: "green",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = "Note created successfully";
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }else{
                notifications.show({
                  title: "Error",
                  message: respuesta['content'],
                  color: "gray",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = "Error while trying to create a note";
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }

              window.ipc.off('create_note');
            });

            break;
          case "search_in_internet":
            window.ipc.send('search_in_internet', sum);

            notifications.show({
              title: "Action started",
              message: "Searching in internet",
              color: "red",
            });

            window.ipc.on('search_in_internet', (respuesta) => {

              if(respuesta['status'] == true){
                notifications.show({
                  title: "Action completed",
                  message: "Internet search completed successfully in "+respuesta['content'][1]+" ms",
                  color: "green",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'][0],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = respuesta['content'][0];
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }else{
                notifications.show({
                  title: "Error",
                  message: respuesta['content'],
                  color: "gray",
                });
              }
              window.ipc.off('search_in_internet');
            });

            break;
          case "analyze_image":
            window.ipc.send('analyze_image', sum);
            window.ipc.on('analyze_image', (respuesta) => {
              if(respuesta['status'] == true){
                notifications.show({
                  title: "Action completed",
                  message: "Image analyzed successfully",
                  color: "green",
                });

                //Obtener el ultimo mensaje del chat y adjuntarle la respuesta
                const activeChatId = get().activeChatId;
                set((state) => ({
                  ttsText: (state.ttsText || "") + respuesta['content'],
                  chats: state.chats.map((c) => {
                    if (c.id === activeChatId) {
                      if(c.messages.length > 0 && c.messages[c.messages.length -1].role == "assistant"){
                        if(c.messages[c.messages.length -1].content == "" || c.messages[c.messages.length -1].content == undefined){
                          c.messages[messages.length -1].content = respuesta['content'];
                        }
                      }
                    }
                    return c;
                  }),
                }));
              }else{
                notifications.show({
                  title: "Error",
                  message: respuesta['content'],
                  color: "gray",
                });
              }
              window.ipc.off('analyze_image');
            });
            break;
          case "change_voice":
            window.ipc.send('change_voice', sum);
            break;
        }

      }

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

export async function directResponse(messages: string[], api_key: string) {
  const response = await axios.post("https://api.openai.com/v1/chat/completions", {
    stream: false,
    model: "gpt-3.5-turbo",
    messages
  }, {
    headers: {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
    }
  });
  return response.data.choices[0].message.content;
}

export const OPENAI_TTS_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
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
  // //4k
  return;
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
