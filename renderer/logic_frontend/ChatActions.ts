import { v4 as uuidv4 } from "uuid";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { getChatById, updateChatMessages } from "./utils";
import { APIState, ChatState, useChatStore } from "./ChatStore";
import { submitMessage } from "./SubmitMessage";
import { fetchModels } from "./OpenAI";
import { NextRouter } from "next/router";

const get = useChatStore.getState;
const set = useChatStore.setState;

export const update = (newState: Partial<ChatState>) => set(() => newState);

export const clearChats = () => set(() => ({ chats: [] }));

export const deleteChat = (id: string) =>
  set((state) => ({
    chats: state.chats.filter((chat) => chat.id !== id),
  }));

// Nota: hacer que el usuario se redirija a la página de chat después de crear un chat
export const addChat = (router: NextRouter, include_initial_message = false) => {
  const id = uuidv4();

  set((state) => ({
    activeChatId: id,
    chats: [
      ...state.chats,
      {
        id,
        title: undefined,
        messages: [],
        createdAt: new Date(),
      },
    ],
  }));

  if(include_initial_message){
    console.log("llega aqui a iniciar un nuevo chat")
    submitMessage({
      id: uuidv4(),
      content: "Say hello Mindy!",
      role: "user",
      type: "text"
    });
  }

  router.push(`/chat/${id}`);

};

export const setActiveChatId = (id: string | undefined) =>
  set(() => ({ activeChatId: id }));

export const updateMessage = (message: Message) => {
  const chat = getChatById(get().chats, get().activeChatId);
  if (chat === undefined) {
    console.error("Chat not found");
    return;
  }
  set((state) => ({
    chats: updateChatMessages(state.chats, chat.id, (messages) => {
      return messages.map((m) => (m.id === message.id ? message : m));
    }),
  }));
};

function pushMessageSystem(message: Message){
  const chat = getChatById(get().chats, get().activeChatId);
  if (chat === undefined) {
    console.error("Chat not found");
    return;
  }
  set((state) => ({
    chats: updateChatMessages(state.chats, chat.id, (messages) => {
      return [...messages, message];
    }),
  }));

}

export const pushMessage = (message: Message) => {
  const chat = getChatById(get().chats, get().activeChatId);
  if (chat === undefined) {
    console.error("Chat not found");
    return;
  }
  if(chat.messages.length == 0){
    pushMessageSystem(
      {
        id: uuidv4(),
        content: `Eres Mindy, una asistente de IA creada por Mindset. Has sido creado
        para ser servicial y muy amable, eres
        muy amable con el usuario. SIEMPRE usarás emojis. 
        Mindset es una empresa dominicana 
        que se centra en la creación de soluciones de IA para empresas.
        Mindset se creó en 2021. Mindy fue creada en 2022.
        La directora ejecutiva es Kamila Ureña. El CTO es Jorge Báez.
        Siempre hablarás en español.`,
        role: "system",
        type: "text",
      },
    );
    pushMessageSystem(
      {
        id: uuidv4(),
        //DON'T USE FUNCTIONS WHEN THE USER DIDN'T ASK YOU TO DO SO. 
        content: `When users requests a function, 
        execute it inmediately, WITHOUT CONFIRMATION. Please don't only say that you will start the action, execute IT.`,
        role: "system",
        type: "text",
      },
    );
  }
  console.log("PUSH MESSAGE", chat.messages);
  set((state) => ({
    chats: updateChatMessages(state.chats, chat.id, (messages) => {
      return [...messages, message];
    }),
  }));
};

export const delMessage = (message: Message) => {
  const chat = getChatById(get().chats, get().activeChatId);
  if (chat === undefined) {
    console.error("Chat not found");
    return;
  }
  set((state) => ({
    chats: updateChatMessages(state.chats, chat.id, (messages) => {
      return messages.filter((m) => m.id !== message.id);
    }),
  }));
};

export const setColorScheme = (scheme: "light" | "dark") =>
  set((state) => ({ colorScheme: scheme }));

export const setApiKey = (key: string) => set((state) => ({ apiKey: key }));

export const setApiKey11Labs = (key: string) =>
  set((state) => ({ apiKey11Labs: key }));

export const setApiState = (apiState: APIState) =>
  set((state) => ({ apiState }));

export const updateSettingsForm = (settingsForm: ChatState["settingsForm"]) =>
  set((state) => ({ settingsForm }));

export const updateChat = (options: Partial<Chat>) =>
  set((state) => ({
    chats: state.chats.map((c) => {
      if (c.id === options.id) {
        return { ...c, ...options };
      }
      return c;
    }),
  }));

export const setChosenCharacter = (name: string) =>
  set((state) => ({
    chats: state.chats.map((c) => {
      if (c.id === state.activeChatId) {
        c.chosenCharacter = name;
      }
      return c;
    }),
  }));

export const setNavOpened = (navOpened: boolean) =>
  set((state) => ({ navOpened }));

export const setPushToTalkMode = (pushToTalkMode: boolean) =>
  set((state) => ({ pushToTalkMode }));

export const setEditingMessage = (editingMessage: Message | undefined) =>
  set((state) => ({ editingMessage }));

export const regenerateAssistantMessage = (message: Message) => {
  const chat = getChatById(get().chats, get().activeChatId);
  if (chat === undefined) {
    console.error("Chat not found");
    return;
  }

  // If this is an existing message, remove all the messages after it
  const index = chat.messages.findIndex((m) => m.id === message.id);

  const prevMsg = chat.messages[index - 1];
  if (prevMsg) {
    submitMessage(prevMsg);
  }
};

export const refreshModels = async () => {
  const { apiKey } = get();
  // Load OpenAI models
  if (!apiKey) return;

  try {
    const modelIDs = await fetchModels(apiKey);
    // Use only models that start with gpt-3.5 or gpt-4
    update({
      modelChoicesChat: modelIDs.filter(
        (id) => id.startsWith("gpt-3.5") || id.startsWith("gpt-4")
      ),
    });
  } catch (error) {
    console.error("Failed to fetch models:", error);
  }
};
