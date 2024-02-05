'use client';
import { useEffect, useState } from "react";
import styles from './page.module.css';
import * as OpusRecorder from './logic/RecorderActions';
import { useRouter } from 'next/navigation';
import AudioPlayer from "./components/AudioPlayer";
import { useChatStore } from "./logic/ChatStore";
//import { AppProps } from "next/app";
import { toggleAudio } from "./logic/PlayerActions";
import { IconDownload } from "@tabler/icons-react";

export default function Page(){
  const [isHydrated, setIsHydrated] = useState(false);
  const [text, setText] = useState('Your friend, only better.');
  const [color, setColor] = useState('white');
  var ttsText = useChatStore((state) => state.ttsText);
  var images = useChatStore((state) => state.images);
  var playerState = useChatStore((state) => state.playerState);
  var status_images = useChatStore((state) => state.loadingImages);
  var sttText = useChatStore((state) => state.sttText);
  var topic = useChatStore((state) => state.topic);
  var apiState = useChatStore((state) => state.apiState);
  const router = useRouter();

  useEffect(() => {

    //Wait till NextJS rehydration completes
    setIsHydrated(true);
    toggleAudio();

    const handleKeyDown = (event) => {
      if (event.key != "k" || event.repeat) {
        return;
      }
      OpusRecorder.startRecording(router);
      setText('I am hearing you.');
      setColor('red');
    };
    
    const handleKeyUp = (event) => {
      if(event.key == "k"){
        OpusRecorder.stopRecording(true);
        setText('Your friend, only better.');
        setColor('white');
      }
    };

    console.log(images.length);

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    console.log(images.length)
    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []); // Empty dependency array means this effect runs once on mount

  if (!isHydrated) {
    return <div className={styles.main}>Loading...</div>;
  }

  function Download(url) {
    document.location = url;
  }

  return (
    <main className={styles.grid}>
      <section className={styles.visualization}>
        <div className={styles.inline}>
          <h2 className={styles.contenido_titulo}>Visualization</h2>
          <button
            onClick={toggleAudio}
            className={styles.reproduccion}
            id="audioReproduccion"
          >
            Pause / Play
          </button>
        </div>
        {images.map((image) => (
          <div className={styles.contenido}>
            <img src={image} className={styles.images} alt="Image" />
              <button className={styles.download} onClick={() => Download(image)}>
              <IconDownload />
              </button>
          </div>
        ))}
        <div className={styles.contenido}>
          <p>{
          (ttsText || "...")
          }</p>
        </div>
      </section>
      <section className={styles.main}>
        <div className={styles.center}>
          <div className={styles.mindy} style={{animationPlayState: (playerState == "playing" || status_images) ? 'running' : 'paused'}}>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          </div>
        </div>
        <div className={styles.text_center}>
          <h1>Mindy</h1>
          <p style={{color: color}}>{text}</p>
        </div>
      </section>
      <section>
        <div className={styles.mb_1}>
          <h2>Topic:</h2>
          <p>{(topic || "Not yet")}</p>
        </div>
        <div>
          <h2>Status:</h2>
          <p>{(apiState ? apiState[0].toUpperCase() +
        apiState.slice(1) : "...")}</p>
        </div>
        <div style={{display: (sttText) ? 'block' : 'none'}} className={styles.margin_superior}>
          <h2 className={styles.contenido_titulo}>You asked for</h2>
          <div className={styles.contenido_2}>
              <p>{sttText}</p>
          </div>
        </div>
        <div className={styles.contenido_3}>
            <p>Hold K to start talking</p>
        </div>
      </section>
      <AudioPlayer />
    </main>
  );
}