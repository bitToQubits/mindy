import { useEffect, useState,useRef } from "react";
import {
  ScrollArea,
  Grid,
  Box,
} from "@mantine/core";
import { useChatStore } from "../logic_frontend/ChatStore";

import ChatMessage from "./ChatMessage";
import * as OpusRecorder from '../logic_frontend/RecorderActions';
import { useRouter } from "next/router";
import { setActiveChatId
        } from "../logic_frontend/ChatActions";
import styles from '../css/page.module.css';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass';
import AudioPlayer from "../components/AudioPlayer";
import { toggleAudio } from "../logic_frontend/PlayerActions";

const ChatDisplay = () => {
  const router = useRouter();
  const activeChatId = router.query.chatId as string | undefined;
  var actionRunning = useChatStore((state) => state.actionRunning);
  var isPlaying = useChatStore((state) => state.playerState === "playing");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    setActiveChatId(activeChatId as string | undefined);
  }, [activeChatId]);

  const [text, setText] = useState('Tu amigo, pero mejor.');

  const viewport = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    viewport.current!?.scrollTo({ top: viewport.current!.scrollHeight, behavior: 'smooth' });

  var chats = useChatStore((state) => state.chats);

  var activeChat = chats.find((chat) => chat.id === activeChatId);

  const [color, setColor] = useState('white');

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
    
    const images = viewport.current?.getElementsByTagName('img');

    if (images) {
      Array.from(images).forEach((img) => {
        img.onload = scrollToBottom;
      });
    }
    
  }, [isScrolledToBottom, activeChat, lastMessage?.content]);

  useEffect(() => {

    return () => {
      window.removeEventListener('resize', recalculo_esferico);
      document.removeEventListener('mousemove', movimiento_mouse);
      mesh?.geometry.dispose();
      mesh?.material.dispose();
      scene?.remove(mesh);
      renderer?.dispose();
      renderer = null;
      scene = null;
      camera = null;
      clock = null;
      bloomComposer = null;
      scene = null;
      cancelAnimationFrame(requestID);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledToBottom(scrolledToBottom());
    };

    const handleKeyDown = (event) => {
      if (event.repeat) {
        return;
      }
      if(event.key == "k"){
        if (audioState === "idle") {
          Recorder.startRecording();
          setText('Te escucho.');
          setColor('red');
        } else if (audioState === "transcribing") {
          return;
        }
      }else if (event.key == "l"){
        window.ipc.send('create_event_google_calendar', {});
      }
    };
    
    const handleKeyUp = (event) => {
      if(event.key == "k"){
        Recorder.stopRecording(true);
        setText('Tu amigo, pero mejor.');
        setColor('white');
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener("scroll", handleScroll);

    // Cleanup function to remove the event listener when the component unmounts
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioState]);

  const actionRunningRef = useRef(actionRunning); // Create a ref

  useEffect(() => {
    actionRunningRef.current = actionRunning; // Update the ref value whenever actionRunning changes
  }, [actionRunning]);

  useEffect(() => {
    const detenerAudio = () => {
      if(isPlaying){
        toggleAudio();
      }
    }

    if(document.getElementById('pechurina')){
      document.getElementById('pechurina').style.cursor = (isPlaying) ? "pointer" : "default";
      document.getElementById('pechurina').onclick = detenerAudio;
    }

  
  }, [isPlaying]);

  let mediaElement;
  var camera;
  var uniforms;
  var mouseX;
  var mouseY;
  var scene;
  var clock;
  var analyser;
  var bloomComposer;
  var mesh;
  var bloomPass;
  var tamanoMindyText;

  var largoReal;
  var alturaReal;
  var renderer;
  let sound;
  var requestID;

  function movimiento_mouse(e){
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;
    mouseX = (e.clientX - windowHalfX) / 100;
    mouseY = (e.clientY - windowHalfY) / 100;
  }

  function recalculo_esferico(){
    camera.aspect = largoReal / (alturaReal - tamanoMindyText);
    camera.updateProjectionMatrix();
    renderer.setSize(largoReal, alturaReal - tamanoMindyText);
    bloomComposer.setSize(largoReal, alturaReal - tamanoMindyText);
  }

  useEffect(() => {

    function animate() {
      requestID = requestAnimationFrame(animate);
      camera.position.x += (mouseX - camera.position.x) * .05;
      camera.position.y += (-mouseY - camera.position.y) * 0.5;
      camera.lookAt(scene.position);

      if(actionRunningRef.current){
        mesh.rotation.x+=2/80;
        mesh.rotation.y+=2/130;
      }else{
        mesh.rotation.x+=0.002;
        mesh.rotation.y+=0.002;
      }

      uniforms.u_time.value = clock.getElapsedTime();
      uniforms.u_frequency.value = analyser.getAverageFrequency();
      bloomComposer.render();
    }

    if(false && document.getElementById('pechurina') && document.querySelector('#pechurina').innerHTML == "" && document.querySelector('audio')){ 
      renderer = new THREE.WebGLRenderer({antialias: true});
      tamanoMindyText = document.getElementById('mindyText')?.clientHeight + 20;
      largoReal = document.getElementById('contenedorGrafico')?.clientWidth;
      alturaReal = document.getElementById('contenedorGrafico')?.clientHeight;

      renderer.setSize(largoReal, alturaReal - tamanoMindyText);
      document.getElementById('pechurina').appendChild(renderer.domElement);
      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(
        45,
        largoReal / (alturaReal - tamanoMindyText),
        0.1,
        1000
      );

      const params = {
        red: 1.0,
        green: 0,
        blue: 0,
        threshold: 0,
        strength: 0.11,
        radius: 0
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const renderScene = new RenderPass(scene, camera);

      bloomPass = new UnrealBloomPass( new THREE.Vector2( largoReal, alturaReal ), 1.5, 0.4, 0.85 );
			bloomPass.threshold = params.threshold;
			bloomPass.strength = params.strength;
			bloomPass.radius = params.radius;

      bloomComposer = new EffectComposer(renderer);
      bloomComposer.addPass(renderScene);
      bloomComposer.addPass(bloomPass);

      const outputPass = new OutputPass();
      bloomComposer.addPass(outputPass);

      camera.position.set(0, -2, 14);
      camera.lookAt(0, 0, 0);

      uniforms = {
        u_time: {type: 'f', value: 0.0},
        u_frequency: {type: 'f', value: 0.0},
        u_red: {type: 'f', value: 1.0},
        u_green: {type: 'f', value: 0},
        u_blue: {type: 'f', value: 0},
      }

      const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
        uniform float u_time;

        vec3 mod289(vec3 x)
        {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 mod289(vec4 x)
        {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 permute(vec4 x)
        {
          return mod289(((x*34.0)+10.0)*x);
        }
        
        vec4 taylorInvSqrt(vec4 r)
        {
          return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        vec3 fade(vec3 t) {
          return t*t*t*(t*(t*6.0-15.0)+10.0);
        }

        // Classic Perlin noise, periodic variant
        float pnoise(vec3 P, vec3 rep)
        {
          vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
          vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
          Pi0 = mod289(Pi0);
          Pi1 = mod289(Pi1);
          vec3 Pf0 = fract(P); // Fractional part for interpolation
          vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
          vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;

          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);

          vec4 gx0 = ixy0 * (1.0 / 7.0);
          vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5);
          gy0 -= sz0 * (step(0.0, gy0) - 0.5);

          vec4 gx1 = ixy1 * (1.0 / 7.0);
          vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5);
          gy1 -= sz1 * (step(0.0, gy1) - 0.5);

          vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
          vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
          vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
          vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
          vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
          vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x;
          g010 *= norm0.y;
          g100 *= norm0.z;
          g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x;
          g011 *= norm1.y;
          g101 *= norm1.z;
          g111 *= norm1.w;

          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);

          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
          return 2.2 * n_xyz;
        }

        uniform float u_frequency;

        void main() {
            float noise = 3.0 * pnoise(position + u_time, vec3(10.0));
            float displacement = (u_frequency / 30.) * (noise / 10.);
            vec3 newPosition = position + normal * displacement;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
        fragmentShader: `
          uniform float u_red;
          uniform float u_blue;
          uniform float u_green;
          void main() {
              gl_FragColor = vec4(vec3(u_red, u_green, u_blue), 1. );
          }
        `
      });

      const geo = new THREE.IcosahedronGeometry(4.8, 20 );
      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      mesh.material.wireframe = true;

      const listener = new THREE.AudioListener();
      camera.add(listener); 
      
      sound = new THREE.Audio(listener);
      
      const audioElement = document.querySelector('audio');

      mediaElement = mediaElement || sound.setMediaElementSource(audioElement);

      analyser = new THREE.AudioAnalyser(sound, 32);

      uniforms.u_red.value = 1;
      uniforms.u_green.value = 0;
      uniforms.u_blue.value = 0;

      mouseX = 0;
      mouseY = 0;

      document.addEventListener('mousemove', movimiento_mouse);

      clock = new THREE.Clock();
      animate();

      window.addEventListener('resize', recalculo_esferico);
    }

    window?.ipc.on('go_to_your_mind_palace', (event) => {
      router.push('/bankKnowledge');
      window?.ipc.off('go_to_your_mind_palace');
    });

  }, [isHydrated]);

  return (
    <>
      <main className={styles.center_vertically} style={{width: "99%"}}>
        <Grid>
          <Grid.Col span={8} id="contenedorGrafico">
            <div id="pechurina" className={styles.center_horizontally}>

            </div>
            <div className={styles.text_center} id="mindyText">
              <h1 className={styles.texto_principal}>Mindy</h1>
              <p style={{color: color}}>{text}</p>
            </div>
          </Grid.Col>
          <Grid.Col span={4}>
            <ScrollArea viewportRef={viewport} w="100%" h={580} type="auto" offsetScrollbars scrollbarSize={8}>
              <Box>
                {activeChat?.messages.slice(2).map((message) => (
                <ChatMessage key={message.id} message={message} />
                ))}
              </Box>
            </ScrollArea>
          </Grid.Col>
        </Grid>
      </main>
      {<AudioPlayer />}
    </>
  );
};

export default ChatDisplay;
