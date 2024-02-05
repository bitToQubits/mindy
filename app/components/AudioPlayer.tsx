import { useEffect, useRef } from "react";
import { useChatStore } from "../logic/ChatStore";
import { initPlayback } from "../logic/PlayerActions";

const AudioStreamPlayer = () => {
  const playerRef = useChatStore((state) => state.playerRef);

  const ttsID = useChatStore((state) => state.ttsID);

  const initialRender = useRef(true);
  useEffect(() => {
    // Do not play audio on initial render
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    return initPlayback();
  }, [ttsID]);

  return <audio ref={playerRef} playsInline />;
};

export default AudioStreamPlayer;
