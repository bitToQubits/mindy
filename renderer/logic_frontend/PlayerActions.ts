
import { useChatStore } from "./ChatStore";
import { notifications } from "@mantine/notifications";
import { genAudio as genAudioOpenAI } from "./OpenAI";

const DEFAULT_OPENAI_VOICE = "nova";
const DEFAULT_OPENAI_TTS_MODEL = "tts-1";

const get = useChatStore.getState;
const set = useChatStore.setState;

export interface AudioChunk {
  blobURL: string;
  state: "text" | "loading" | "audio";
  text: string;
}

interface VarsShape {
  apiKey: string | undefined;
  apiKeyRegion?: string | undefined;
  voiceId: string | undefined;
  voiceStyle?: string | undefined;
  model?: string | undefined;
  genAudio: typeof genAudioOpenAI;
}

const getVars = (): VarsShape => {
  const state = get();

      return {
        apiKey: state.apiKey,
        voiceId: state.settingsForm.voice_id_openai || DEFAULT_OPENAI_VOICE,
        model: state.settingsForm.tts_model_openai || DEFAULT_OPENAI_TTS_MODEL,
        genAudio: genAudioOpenAI,
      };
};

function splitSentences(text: string | undefined) {
  if (!text) return [];
  const sentences = text.match(/[^.!?]+[.!?]/g) || [text];

  return sentences;
}

const chunkify = (text: string | undefined) => {
  const sentences = splitSentences(text);
  return sentences.map((sentence) => ({
    text: sentence,
    state: "text" as AudioChunk["state"],
    blobURL: "",
  }));
};

export const initPlayback = () => {
  const { apiKey } = getVars();
  if (!apiKey) {
    notifications.show({
      title: "API keys for TTS not set",
      message: "Please set API keys for TTS in the settings.",
      color: "red",
    });
    return;
  }

  const checker = async () => {
    const { apiState, ttsText, playerApiState, playerAudioQueue } = get();
    const chunks = chunkify(ttsText);
    if (apiState === "loading") {
      // Remove the last "unfinished sentence" if we are loading
      chunks.pop();
    }
    if (chunks.length > playerAudioQueue.length) {
      const newElems = chunks.splice(playerAudioQueue.length);
      console.log('New elements:', newElems); // Add logging here
      if(newElems.length > 0)
        set({ playerAudioQueue: [...(playerAudioQueue || []), ...newElems] });
    }
    const firstIdleChunk = get().playerAudioQueue.findIndex(
      (chunk) => chunk.state === "text"
    );

    if (firstIdleChunk !== -1 && playerApiState === "idle") {
      // We need to get more audio
      await fetchAudio(firstIdleChunk);
    }
  };
  const interval = setInterval(checker, 1000);
  // Trigger immediately
  checker();

  const ref = new Audio();

  set({
    playerRef: { current: ref },
    playerIdx: -1,
    playerState: "idle",
    playerApiState: "idle",
    playerAudioQueue: [],
  });

  return () => {
    clearInterval(interval);
  };
};

export const playAudio = (idx: number) => {
  const { playerIdx, playerAudioQueue, playerRef, playerState } = get();
  if (playerState === 'playing') {
    console.log('player is still playing, skipping playing');
    return;
  }
  console.log('playing audio', idx, playerAudioQueue.length, playerIdx);
  if (playerIdx + 1 >= playerAudioQueue.length) {
    console.log('next chunk is not queued, skipping playing');
    set((state) => ({
      apiState: "ok",
    }));
    return;
  }
  if (playerAudioQueue[playerIdx + 1].state !== 'audio') {
    console.log('next chunk does not have audio, skipping playing');
    set((state) => ({
      apiState: "ok",
    }));
    return;
  }
  set({
    playerIdx: playerIdx + 1,
    playerState: "playing",
  });
  if (playerRef.current) {
    playerRef.current.src = playerAudioQueue[playerIdx + 1].blobURL;
    ensureListeners(playerRef.current);

    playerRef.current.play();
  }
};

const fetchAudio = async (idx: number) => {
  const { apiKey, voiceId, genAudio, model } = getVars();
  const { playerAudioQueue } = get();

  const chunk = playerAudioQueue[idx];
  if (!chunk) {
    return;
  }

  if (!apiKey) {
    return;
  }

  set({ playerApiState: "loading" });

  set((state) => ({
    apiState: "generating voice",
  }));
  try {
    const audioURL = await genAudio({
      text: chunk.text,
      key: apiKey,
      voice: 'nova',
      model,
    });
    if (audioURL) {
      set({
        playerAudioQueue: playerAudioQueue.map((chunk, i) =>
          i === idx ? { ...chunk, blobURL: audioURL, state: "audio" } : chunk
        ),
      });
      if (get().playerState === "idle") {
        playAudio(idx);
      }
    }
    set((state) => ({
      apiState: "ok",
    }));
  } catch (error) {
    console.error(error);
    set((state) => ({
      apiState: "error",
    }));
  }

  set({ playerApiState: "idle" });
};

const ensureListeners = (audio: HTMLAudioElement) => {
  if (get().playerRefInit) return;
  set({ playerRefInit: true });

  audio.addEventListener("ended", () => {
    const { playerIdx, playerAudioQueue } = get();
    set({ playerState: "idle" });
    if (playerIdx + 1 < playerAudioQueue.length) {
      playAudio(playerIdx + 1);
    }
    set((state) => ({
      apiState: "ok",
    }));
  });
};

export const toggleAudio = () => {
  const { playerState, playerRef } = get();
  if (playerState === "playing") {
    if (playerRef.current) {
      playerRef.current.pause();
      set((state) => ({
        apiState: "ok",
      }));
      set({ ttsText: "" });
      set({ playerAudioQueue: [] });
    }
    set({ playerState: "paused" });
  } else if (playerState === "paused") {
    if (playerRef.current) {
      playerRef.current.play();
    }
    set({ playerState: "playing" });
  } else if (playerState === "idle") {
    playAudio(0);
  }
};

