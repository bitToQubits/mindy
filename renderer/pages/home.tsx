'use client';
import { useEffect, useState } from "react";
import styles from './css/page.module.css';
import * as OpusRecorder from '../logic_frontend/RecorderActions';
import AudioPlayer from "../components/AudioPlayer";
import { useChatStore } from "../logic_frontend/ChatStore";
//import { AppProps } from "next/app";
import { toggleAudio } from "../logic_frontend/PlayerActions";
import { IconDownload } from "@tabler/icons-react";

export default function Page(){
  const [isHydrated, setIsHydrated] = useState(false);
  const [text, setText] = useState('Your friend, only better.');
  const [color, setColor] = useState('white');
  const [message, setMessage] = useState('No message found')
  var ttsText = useChatStore((state) => state.ttsText);
  var images = useChatStore((state) => state.images);
  var playerState = useChatStore((state) => state.playerState);
  var status_images = useChatStore((state) => state.loadingImages);
  var sttText = useChatStore((state) => state.sttText);
  var topic = useChatStore((state) => state.topic);
  var apiState = useChatStore((state) => state.apiState);

  function pausar(){
    toggleAudio();
  }
  
  useEffect(() => {
    
    //Wait till NextJS rehydration completes
    setIsHydrated(true);
    toggleAudio();
    
    window.ipc.on('message', (message: string) => {
      setMessage(message)
    })

    const handleKeyDown = (event) => {
      if(!["k", "l"].includes(event.key)){
        return;
      }
      if (event.repeat) {
        return;
      }
      if(event.key == "k"){
        OpusRecorder.startRecording();
        setText('I am hearing you.');
        setColor('red');
      }else{
        window.ipc.send('message', 'Hello')
      }
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

  function Download(url : string) {
    document.location = url;
  }

  return (
    <main className={`${styles.fondo_oscuro} ${styles.grid}`}>
      <section className={styles.visualization}>
        <div className={styles.inline}>
          <h2 className={styles.contenido_titulo}>Visualization</h2>
          <button
            onClick={pausar}
            className={styles.reproduccion}
            style={{display: (playerState == "playing" || status_images) ? 'block' : 'none'}}
            id="audioReproduccion"
          >
            Pause
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
        <div className={`${styles.contenido_3} ${styles.magin_superior_rem}`}>
            <p>Hold K to start talking</p>
        </div>
        <div className={`${styles.contenido_3} ${styles.magin_superior_rem_2}`}>
            <p>Press C to change to text mode</p>
        </div>
      </section>
      <AudioPlayer />
    </main>
  );
}