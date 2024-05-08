import { v4 as uuidv4 } from "uuid";
import { Message } from "./Message";
import { streamCompletion, directResponse } from "./OpenAI";
import { getChatById, updateChatMessages } from "./utils";
import { notifications } from "@mantine/notifications";
import { getModelInfo } from "./Model";
import { useChatStore } from "./ChatStore";
import { updateChat } from "./ChatActions";
import axios from "axios";

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

  const activeChatId = get().activeChatId;
  const chat = get().chats.find((c) => c.id === activeChatId!);
  if (chat === undefined) {
    console.error("Chat not found");
    return;
  }else{
  }

  // If this is an existing message, remove all the messages after it
  const index = chat.messages.findIndex((m) => m.id === message.id);
  if (index !== -1) {
    set((state) => ({
      chats: state.chats.map((c) => {
        if (c.id === chat.id) {
          c.messages = c.messages.slice(0, index);
        }
        return c;
      }),
    }));
  }

  // Add the message
  set((state) => ({
    apiState: "loading",
    chats: state.chats.map((c) => {
      if (c.id === chat.id) {
        c.messages.push(message);
      }
      return c;
    }),
  }));

  const assistantMsgId = uuidv4();
  // Add the assistant's response
  set((state) => ({
    chats: state.chats.map((c) => {
      if (c.id === state.activeChatId) {
        c.messages.push({
          id: assistantMsgId,
          content: "",
          role: "assistant",
          loading: true,
          type: "text",
        });
      }
      return c;
    }),
  }));

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
      chats: state.chats.map((c) => {
        if (c.id === chat.id) {
          c.promptTokensUsed = (c.promptTokensUsed || 0) + promptTokensUsed;
          c.completionTokensUsed = (c.completionTokensUsed || 0) + completionTokensUsed;
          c.costIncurred =
            (c.costIncurred || 0) + (promptTokensUsed / 1000) * promptCost + (completionTokensUsed / 1000) * completionCost;
        }
        return c;
      }),
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
        chats: updateChatMessages(state.chats, chat.id, (messages) => {
          const assistantMessage = messages.find(
            (m) => m.id === assistantMsgId
          );
          if (assistantMessage) {
            assistantMessage.content += content;
          }
          return messages;
        }),
      }));
    },
    (promptTokensUsed, completionTokensUsed) => {
      set((state) => ({
        apiState: "idle",
        chats: updateChatMessages(state.chats, chat.id, (messages) => {
          const assistantMessage = messages.find(
            (m) => m.id === assistantMsgId
          );
          if (assistantMessage) {
            assistantMessage.loading = false;
          }
          return messages;
        }),
      }));
      updateTokens(promptTokensUsed, completionTokensUsed);
      if (get().settingsForm.auto_title) {
        findChatTitle();
      }
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
    var chat = getChatById(get().chats, get().activeChatId);
    if (chat === undefined) {
      console.error("Chat not found");
      return;
    }
    // Find a good title for the chat
    const numWords = chat.messages
      .map((m) => m.content.split(" ").length)
      .reduce((a, b) => a + b, 0);
    if (
      chat.messages.length > 3 &&
      chat.title === undefined &&
      numWords >= 4
    ) {
      const msg = {
        id: uuidv4(),
        content: `Write the topic of the following conversation snippet in 3 words or less. 
        ONLY THE TOPIC NAME, not like The topic is ..., only topic name. Don't include the word topic.
              >>>
              ${chat.messages
                .slice(2)
                .map((m) => m.content)
                .join("\n")}
              >>>
                `,
        role: "system",
      } as Message;

      console.log("mesagee", msg);

      await streamCompletion(
        [msg],
        settings,
        apiKey,
        undefined,
        (content) => {
          set((state) => ({
            chats: state.chats.map((c) => {
              if (c.id === chat.id) {
                // Find message with id
                chat.title = (chat.title || "") + content;
                if (chat.title.toLowerCase().startsWith("title:")) {
                  chat.title = chat.title.slice(6).trim();
                }
                // Remove trailing punctuation
                chat.title = chat.title.replace(/[,.;:!?]$/, "");
              }
              return c;
            }),
          }));
        },
        clasificar_chat,
      )

      // const chats = get().chats;

      // for(let i = 0; i < chats.length; i++){
      //   if(chats[i].id === chat.id){
      //     console.log(chats[i])
      //     break;
      //   }
      // }

    }
  };

  const clasificar_chat = async () => {
    const chat = getChatById(get().chats, get().activeChatId);
    const classifiers = get().classifiers;
    if (chat === undefined) {
      console.error("Chat not found");
      return;
    }

    var msgs = [];

    console.log("Classifiers: ",classifiers)

    msgs.push({
      content: `Classify the user topic in one of the following categories, 
                if no one suits create a new category: ${classifiers
                  .map((m) => m.title)
                  .join("\n")}
                Also, provide the keyword in order to search for an unplash image related
                to the category.
                Put the category name followed by a comma and then the keyword.

                Example.

                Input:
                Explain to me some basic OOP principles.

                Your output:
                Programming, computers.
              `,
      role: "system",
    });

    msgs.push({
      content: chat.messages[1].content + " " + chat.title,
      role: "user",
    })

    directResponse(
      msgs,
      apiKey,
    ).then((contenido) => {
      console.log("contenido", contenido);
      var category_name = contenido.split(",")[0];
      var keywords = contenido.split(",")[1];

      if(classifiers.filter((classifier) => {
        console.log(classifier.title + " === " + category_name.trim())
        return classifier.title === category_name.trim();
      }).length == 0){
        console.log("se fue por aqui 282")
        axios.get('https://api.unsplash.com/search/photos', {
          params: {
            query: keywords,
            per_page: 1,
            page: 1,
            orientation: "landscape"
          },
          headers: {
            'Authorization': `Client-ID Pshk--FgfWEn_Kjz8iY-pbb72Ux9P94QFA0auXpfbZo`
          }
        })
        .then(function (response) {
          window.ipc.send('download_request', response.data.results[0].urls.regular);
          console.log("273: ",response.data.results[0].urls.regular)
          window.ipc.on('download_request', (imageName: string) => {
            const id_classifier = uuidv4();
            updateChat({ id: activeChatId, classifier: id_classifier });
            set((state) => ({
              classifiers: [
                ...state.classifiers,
                {
                  id: id_classifier,
                  title: category_name.trim(),
                  createdAt: new Date(),
                  image: imageName,
                  num_chats: 1,
                },
              ]
            }));
            console.log("Aqui el error con el imageName", imageName);
            window.ipc.off('download_request');
          })
        })
        .catch(function (error) {
          console.log(error);
        })
      }else{
        console.log("se fue por aqui 305");
        const id_classifier = classifiers.filter((classifier) => {
          console.log("2: " + classifier.title + " === " + category_name.trim())
          return classifier.title === category_name.trim();
        })[0].id;
        updateChat({ id: activeChatId, classifier: id_classifier });
        set((state) => ({
          classifiers: state.classifiers.map((classifier) => {
            if(classifier.id === id_classifier){
              classifier.num_chats += 1;
            }
            return classifier;
          }),
        }));
      }

    }).catch((e) => {
      console.log("Error fatal", e);
    });
    
  };
};
