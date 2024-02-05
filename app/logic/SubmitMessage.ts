import { v4 as uuidv4 } from "uuid";
import { Message } from "./Message";
import { streamCompletion } from "./OpenAI";
import { notifications } from "@mantine/notifications";
import { getModelInfo } from "./Model";
import { useChatStore } from "./ChatStore";

const get = useChatStore.getState;
const set = useChatStore.setState;

export const abortCurrentRequest = () => {
  const currentAbortController = get().currentAbortController;
  if (currentAbortController?.abort) currentAbortController?.abort();
  set((state) => ({
    apiState: "idle",
    currentAbortController: undefined,
  }));
};

export const submitMessage = async (message: Message) => {
  // If message is empty, do nothing
  if (message.content.trim() === "") {
    console.error("Message is empty");
    return;
  }
  let chat = {
    id: "0",
    title: undefined,
    messages: [] as Message[],
  };

  const assistantMsgId = uuidv4();

  chat.messages.push({
    id: assistantMsgId,
    content: ` 
              You are Mindy, an AI assistant created by Mindset. You are created
              to be helpful and very friendly, you are
              very kind to the user. You ALWAYS will use emojis. 
              Mindset is a dominican company 
              that focuses on creating AI solutions for businesses.
              Mindset was created on 2021. Mindy was created on 2022.
              The CEO is Kamila Ureña. The CTO is Jorge Baez. 
              Don't make assumptions about what values to plug into functions. Ask for clarification if a user request is ambiguous.
              When user requests an image, you generate a description and then generate the image.    
            `,
    role: "system",
    loading: true,
  });
  
  // Add the message
  set((state) => ({
    apiState: "loading"
  }));
  chat.messages.push(message);

  const apiKey = get().apiKey;
  if (apiKey === undefined) {
    console.error("API key not set");
    return;
  }

  const updateTokens = (promptTokensUsed: number, completionTokensUsed: number) => {
    const activeModel = get().settingsForm.model;
    const {prompt: promptCost, completion: completionCost} = getModelInfo(activeModel).costPer1kTokens;
    set((state) => ({
      apiState: "idle",
    }));
  };
  const settings = get().settingsForm;

  const abortController = new AbortController();
  set((state) => ({
    currentAbortController: abortController,
    ttsID: assistantMsgId,
    ttsText: "",
  }));

  // ASSISTANT REQUEST
  await streamCompletion(
    chat.messages,
    settings,
    apiKey,
    abortController,
    (content) => {
      set((state) => ({
        ttsText: (state.ttsText || "") + content,
      }));
    },
    (promptTokensUsed, completionTokensUsed) => {
      set((state) => ({
        images: []
      }));
      findChatTitle();
    },
    (errorRes, errorBody) => {
      let message = errorBody;
      try {
        message = JSON.parse(errorBody).error.message;
      } catch (e) {}

      notifications.show({
        message: message,
        color: "red",
      });
      // Run abortCurrentRequest to remove the loading indicator
      abortCurrentRequest();
    }
  );

  const findChatTitle = async () => {
    // Find a good title for the chat
    const numWords = chat.messages
      .map((m: Message) => m.content.split(" ").length)
      .reduce((a: number, b: number) => a + b, 0);
    if (
      chat.messages.length >= 2 &&
      chat.title === undefined &&
      numWords >= 4
    ) {
      const msg = {
        id: uuidv4(),
        content: `Describe the following conversation snippet in 3 words or less.
              >>>
              Hello
              ${chat.messages
                .slice(1)
                .map((m: Message) => m.content)
                .join("\n")}
              >>>
                `,
        role: "system",
      } as Message;

      set((state) => ({
        topic: "",
      }));

      set((state) => ({
        apiState: "creating topic name",
      }));

      await streamCompletion(
        [msg, ...chat.messages.slice(1)],
        settings,
        apiKey,
        undefined,
        (content) => {
          set((state) => ({
            topic: (state.topic || "") + content,
          }));
        },
        updateTokens
      );
    }
  };
};
