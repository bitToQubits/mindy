import { useEffect, useState,useRef } from "react";
import {
  ScrollArea,
  Grid,
  Box,
  Container,
  Center
} from "@mantine/core";
import { useChatStore } from "../logic_frontend/ChatStore";

import ChatMessage from "./ChatMessage";
import { IconChevronsDown } from "@tabler/icons-react";
import * as OpusRecorder from '../logic_frontend/RecorderActions';
import { useRouter } from "next/router";
import { setActiveChatId,
          setPlayerMode
        } from "../logic_frontend/ChatActions";
import AudioPlayer from "../components/AudioPlayer";
import styles from '../css/page.module.css';

const ChatDisplay = () => {
  const router = useRouter();
  const activeChatId = router.query.chatId as string | undefined;
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    setActiveChatId(activeChatId as string | undefined);
  }, [activeChatId]);

  const [text, setText] = useState('Your friend, only better.');

  const viewport = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    viewport.current!?.scrollTo({ top: viewport.current!.scrollHeight, behavior: 'smooth' });

  var status_images = useChatStore((state) => state.loadingImages);
  var images = useChatStore((state) => state.images);

  var playerState = useChatStore((state) => state.playerState);

  var chats = useChatStore((state) => state.chats);

  var activeChat = chats.find((chat) => chat.id === activeChatId);

  const [color, setColor] = useState('white');

  const pushToTalkMode = useChatStore((state) => state.pushToTalkMode);
  const lastMessage = activeChat?.messages[activeChat.messages.length - 1];

  const scrolledToBottom = () => {
    const winScroll =
      document.body.scrollTop || document.documentElement.scrollTop;

    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;

    // allow inaccuracy by adding some
    return height <= winScroll + 1;
  };

  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const Recorder = OpusRecorder;

  var audioState = useChatStore((state) => state.audioState);

  useEffect(() => {
    if (isScrolledToBottom) {
      scrollToBottom();
    }
  }, [isScrolledToBottom, activeChat, lastMessage?.content]);

  useEffect(() => {
    console.log("Ya cargo", audioState)
    const handleScroll = () => {
      setIsScrolledToBottom(scrolledToBottom());
    };

    const handleKeyDown = (event) => {
      if(!["k", "l"].includes(event.key)){
        return;
      }
      if (event.repeat) {
        return;
      }
      if(event.key == "k"){
        setPlayerMode(false);
        console.log("handlekeydown",audioState)
        if (audioState === "idle") {
          Recorder.startRecording();
          setText('I am hearing you.');
          setColor('red');
        } else if (audioState === "transcribing") {
          return;
        }
      }else{
        window.ipc.send('message', 'Hello')
      }
    };
    
    const handleKeyUp = (event) => {
      console.log("handlekeyup",audioState)
      if(event.key == "k"){
        Recorder.stopRecording(true);
        setText('Your friend, only better.');
        setColor('white');
      }
    };

    console.log(images.length);

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener("scroll", handleScroll);

    console.log(images.length)
    // Cleanup function to remove the event listener when the component unmounts
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioState]);

  // useEffect(() => {
  //   if (isScrolledToBottom) {
  //     scrollToBottom();
  //   }
  // }, [isScrolledToBottom, activeChat, lastMessage?.content]);

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <main className={styles.center_vertically} style={{width: "99%"}}>
        <Grid>
          <Grid.Col span={8}>
            <div className={styles.center}>
              <div className={styles.mindy} style={{animationPlayState: (playerState == "playing" || status_images) ? 'running' : 'paused'}}>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              </div>
            </div>
            <div className={styles.text_center}>
              <h1 className={styles.texto_principal}>Mindy</h1>
              <p style={{color: color}}>{text}</p>
            </div>
          </Grid.Col>
          <Grid.Col span={4}>
            <ScrollArea viewportRef={viewport} w="100%" h={580} type="auto" offsetScrollbars scrollbarSize={8}>
              <Box>
                {activeChat?.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
                ))}
              </Box>
            </ScrollArea>
          </Grid.Col>
        </Grid>
      </main>
    </>
  );
};

export default ChatDisplay;
