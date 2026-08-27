'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
  Sparkles,
  Trophy,
  Music,
  Send,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

// Selective emphasis keywords ordered longest phrase first
const HIGHLIGHT_KEYWORDS = [
  // Tier 1: Names & Special Credits (Pure gleaming cinematic typography - no boxed badges)
  { term: 'EVENING PLANNERS', tier: 1 },
  { term: 'ADITYA', tier: 1 },
  { term: 'SOURAV', tier: 1 },

  // Tier 2: Major Brand Identity
  { term: 'Eleven:', tier: 2 },
  { term: 'Eleven', tier: 2 },
  { term: 'ELEVEN', tier: 2 },

  // Tier 3: Selective Football & Concept Highlights (multi-word first)
  { term: 'late-night planning', tier: 3 },
  { term: 'planificación nocturna', tier: 3 },
  { term: 'impossible decisions', tier: 3 },
  { term: 'decisiones imposibles', tier: 3 },
  { term: 'football debates', tier: 3 },
  { term: 'debates de fútbol', tier: 3 },
  { term: 'ultimate squad', tier: 3 },
  { term: 'plantilla definitiva', tier: 3 },
  { term: 'beautiful game', tier: 3 },
  { term: 'juego hermoso', tier: 3 },
  { term: 'crazy ideas', tier: 3 },
  { term: 'ideas locas', tier: 3 },
  { term: 'conversations', tier: 3 },
  { term: 'conversaciones', tier: 3 },
  { term: 'competition', tier: 3 },
  { term: 'competencia', tier: 3 },
  { term: 'inspiration', tier: 3 },
  { term: 'inspiración', tier: 3 },
  { term: 'motivation', tier: 3 },
  { term: 'motivación', tier: 3 },
  { term: 'strategy', tier: 3 },
  { term: 'estrategia', tier: 3 },
  { term: 'football', tier: 3 },
  { term: 'fútbol', tier: 3 },
  { term: 'rivalry', tier: 3 },
  { term: 'rivalidad', tier: 3 },
] as const;

function renderHighlightedText(text: string) {
  const termsPattern = HIGHLIGHT_KEYWORDS.map((k) =>
    k.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|');
  const regex = new RegExp(`(${termsPattern})`, 'gi');

  const parts = text.split(regex);
  return parts.map((part, i) => {
    const match = HIGHLIGHT_KEYWORDS.find(
      (k) => k.term.toLowerCase() === part.toLowerCase()
    );
    if (!match) return part;

    // Tier 1: Names (ADITYA, SOURAV, EVENING PLANNERS) — Simple underline, no background boxes
    if (match.tier === 1) {
      return (
        <span
          key={i}
          className="text-white font-bold tracking-wide underline underline-offset-4 decoration-2 decoration-[#ffd54c]"
        >
          {part}
        </span>
      );
    }

    // Tier 2: Brand Identity (Eleven)
    if (match.tier === 2) {
      return (
        <span
          key={i}
          className="text-white font-bold tracking-wide"
        >
          {part}
        </span>
      );
    }

    // Tier 3: Important Football Concepts
    return (
      <span
        key={i}
        className="text-white font-semibold"
      >
        {part}
      </span>
    );
  });
}

// Multi-language story data with Eleven origin story
const STORIES = {
  en: {
    langLabel: 'EN',
    nextLang: 'es',
    pre: "SOME IDEAS DON'T BEGIN WITH A PLAN.\nTHEY BEGIN WITH A CONVERSATION.",
    episode: 'EPISODE - 01',
    title: 'ELEVEN:\nTHE GAME BEGINS',
    paragraphs: [
      'What started as a simple idea quickly turned into something much bigger.',
      'Built from a love for football, competition, strategy, and the chaos of debating who deserves to be in the starting eleven.',
      'Somewhere between conversations, crazy ideas, football debates, and late-night planning, the idea for this experience began to take shape.',
      'With inspiration and motivation from the people around me, that idea slowly became something real — a place where football knowledge, strategy, bidding, and competition collide.',
      'Special thanks to ADITYA and SOURAV for the motivation and encouragement along the way.',
      'And to EVENING PLANNERS — the conversations, ideas, football discussions, and chaos somehow helped make this happen.',
      'From there came Eleven: a football universe built for strategy, rivalry, impossible decisions, and the thrill of building the ultimate squad.',
      'Built with curiosity, craft, and a ridiculous amount of love for the beautiful game.',
    ],
    outroHeader: 'THE STAGE IS SET',
    outroSubtitle: 'Your championship squad awaits. What will your first move be?',
    soundtrackCredit: 'Soundtrack: "oh yeah?" by Steve Lacy',
    btnHome: '← Back to Start',
    btnAuction: 'Enter Auction Room',
    btnReplay: 'Replay Story',
  },
  es: {
    langLabel: 'ES',
    nextLang: 'hi',
    pre: 'ALGUNAS IDEAS NO EMPIEZAN CON UN PLAN.\nCOMIENZAN CON UNA CONVERSACIÓN.',
    episode: 'EPISODIO - 01',
    title: 'ELEVEN:\nEL JUEGO COMIENZA',
    paragraphs: [
      'Lo que comenzó como una simple idea rápidamente se convirtió en algo mucho más grande.',
      'Nacido del amor por el fútbol, la competencia, la estrategia y el caos de debatir quién merece estar en el once titular.',
      'Entre conversaciones, ideas locas, debates de fútbol y planificación nocturna, la idea de esta experiencia comenzó a tomar forma.',
      'Con la inspiración y motivación de las personas que me rodean, esa idea se convirtió en algo real: un lugar donde el conocimiento futbolístico, la estrategia, las pujas y la competencia se encuentran.',
      'Agradecimiento especial a ADITYA y SOURAV por la motivación y el aliento a lo largo del camino.',
      'Y a EVENING PLANNERS: las conversaciones, ideas, debates de fútbol y el caos de alguna manera hicieron esto posible.',
      'De allí nació Eleven: un universo futbolístico creado para la estrategia, la rivalidad, las decisiones imposibles y la emoción de construir la plantilla definitiva.',
      'Creado con curiosidad, dedicación y un amor inmenso por el juego hermoso.',
    ],
    outroHeader: 'EL ESCENARIO ESTÁ LISTO',
    outroSubtitle: 'Tu plantilla de campeonato te espera. ¿Cuál será tu primer movimiento?',
    soundtrackCredit: 'Banda Sonora: "oh yeah?" de Steve Lacy',
    btnHome: '← Volver al Inicio',
    btnAuction: 'Entrar a la Subasta',
    btnReplay: 'Repetir Historia',
  },
  hi: {
    langLabel: 'HI',
    nextLang: 'od',
    pre: 'कुछ विचार किसी योजना से शुरू नहीं होते।\nवे एक बातचीत से शुरू होते हैं।',
    episode: 'एपिसोड - 01',
    title: 'इलेवन:\nखेल शुरू होता है',
    paragraphs: [
      'जो एक साधारण विचार के रूप में शुरू हुआ, वह जल्द ही कुछ बहुत बड़े रूप में बदल गया।',
      'फुटबॉल, प्रतिस्पर्धा, रणनीति और शुरुआती ग्यारह में कौन होना चाहिए, इस पर गरमा-गरम बहस के प्रेम से निर्मित।',
      'बातचीतों, अनोखे विचारों, फुटबॉल बहसों और देर रात की प्लानिंग के बीच, इस अनुभव का विचार आकार लेने लगा।',
      'अपने आसपास के लोगों की प्रेरणा और प्रोत्साहन से, वह विचार धीरे-धीरे वास्तविक बन गया — एक ऐसा मंच जहाँ फुटबॉल ज्ञान, रणनीति, बोली और प्रतिस्पर्धा एक साथ आते हैं।',
      'इस यात्रा में निरंतर प्रेरणा और प्रोत्साहन के लिए ADITYA और SOURAV का विशेष धन्यवाद।',
      'और EVENING PLANNERS को — वे बातचीत, विचार, फुटबॉल चर्चाएँ और ऊर्जा किसी न किसी तरह इसे संभव बनाने में मददगार रहीं।',
      'वहीं से जन्म हुआ Eleven का: एक ऐसा फुटबॉल ब्रह्मांड जो रणनीति, प्रतिद्वंद्विता, कठिन फैसलों और अंतिम चैंपियन टीम बनाने के रोमांच के लिए बना है।',
      'जिज्ञासा, कला और इस खूबसूरत खेल के प्रति अपार प्रेम के साथ निर्मित।',
    ],
    outroHeader: 'मंच तैयार है',
    outroSubtitle: 'आपकी चैंपियन टीम आपका इंतजार कर रही है। आपकी पहली चाल क्या होगी?',
    soundtrackCredit: 'साउंडट्रैक: स्टीव लेसी द्वारा "oh yeah?"',
    btnHome: '← वापस मुख्य पृष्ठ',
    btnAuction: 'नीलामी कक्ष में प्रवेश करें',
    btnReplay: 'कहानी पुनः देखें',
  },
  od: {
    langLabel: 'OD',
    nextLang: 'en',
    pre: 'କିଛି ଧାରଣା ଯୋଜନାରୁ ଆରମ୍ଭ ହୁଏ ନାହିଁ।\nସେଗୁଡ଼ିକ ଏକ ଆଲୋଚନାରୁ ଆରମ୍ଭ ହୁଏ।',
    episode: 'ଅଧ୍ୟାୟ - ୦୧',
    title: 'ଇଲେଭେନ୍:\nଖେଳ ଆରମ୍ଭ ହେଲା',
    paragraphs: [
      'ଗୋଟିଏ ସାଧାରଣ ଧାରଣାରୁ ଯାହା ଆରମ୍ଭ ହୋଇଥିଲା, ତାହା ଖୁବ୍ ଶୀଘ୍ର ଏକ ବଡ଼ ସ୍ୱପ୍ନରେ ପରିଣତ ହେଲା।',
      'ଫୁଟବଲ୍, ପ୍ରତିଯୋଗିତା, ରଣନୀତି ଏବଂ ଆରମ୍ଭ ଏକାଦଶରେ କିଏ ରହିବ ସେହି ଚର୍ଚ୍ଚାର ଭଲପାଇବାରୁ ନିର୍ମିତ।',
      'ଆଲୋଚନା, ନୂଆ ଚିନ୍ତାଧାରା, ଫୁଟବଲ୍ ତର୍କ ଏବଂ ରାତିର ଯୋଜନା ମଧ୍ୟରେ ଏହି ଅନୁଭୂତି ରୂପ ନେବା ଆରମ୍ଭ କରିଥିଲା।',
      'ମୋ ଚାରିପାଖର ଲୋକଙ୍କ ପ୍ରେରଣା ଏବଂ ଉତ୍ସାହ ସହିତ, ସେହି ଧାରଣା ଧୀରେ ଧୀରେ ବାସ୍ତବତାରେ ପରିଣତ ହେଲା — ଯେଉଁଠାରେ ଫୁଟବଲ୍ ଜ୍ଞାନ, ରଣନୀତି, ନିଲାମି ଏବଂ ପ୍ରତିଯୋଗିତା ଏକତ୍ରିତ ହୁଏ।',
      'ଏହି ଯାତ୍ରାରେ ପ୍ରେରଣା ଏବଂ ଉତ୍ସାହ ପାଇଁ ADITYA ଏବଂ SOURAV ଙ୍କୁ ବିଶେଷ ଧନ୍ୟବାଦ।',
      'ଏବଂ EVENING PLANNERS କୁ — ଆଲୋଚନା, ଧାରଣା, ଫୁଟବଲ୍ କଥାବାର୍ତ୍ତା ଏବଂ ସେହି ଉତ୍ସାହ ଏହାକୁ ସମ୍ଭବ କରିବାରେ ସାହାଯ୍ୟ କଲା।',
      'ସେଠାରୁ ଆରମ୍ଭ ହେଲା Eleven: ରଣନୀତି, ପ୍ରତିଦ୍ୱନ୍ଦ୍ୱିତା, କଠିନ ନିଷ୍ପତ୍ତି ଏବଂ ସର୍ବୋତ୍ତମ ଦଳ ଗଠନ କରିବାର ରୋମାଞ୍ଚ ପାଇଁ ଗଢ଼ାଯାଇଥିବା ଏକ ଫୁଟବଲ୍ ଜଗତ।',
      'ଜିଜ୍ଞାସା, ନିଷ୍ଠା ଏବଂ ସୁନ୍ଦର ଖେଳ ପ୍ରତି ଅସୀମ ଭଲପାଇବା ସହିତ ନିର୍ମିତ।',
    ],
    outroHeader: 'ମଞ୍ଚ ସମ୍ପୂର୍ଣ୍ଣ ପ୍ରସ୍ତୁତ',
    outroSubtitle: 'ଆପଙ୍କ ବିଜୟୀ ଦଳ ଆପଣଙ୍କୁ ଅପେକ୍ଷା କରିଛି। ଆପଣଙ୍କର ପ୍ରଥମ ପଦକ୍ଷେପ କ’ଣ ହେବ?',
    soundtrackCredit: 'ସାଉଣ୍ଡଟ୍ରାକ୍: ଷ୍ଟିଭ୍ ଲେସିଙ୍କ ଦ୍ୱାରା "oh yeah?"',
    btnHome: '← ପ୍ରାରମ୍ଭକୁ ଫେରନ୍ତୁ',
    btnAuction: 'ନିଲାମି କକ୍ଷକୁ ଯାଆନ୍ତୁ',
    btnReplay: 'କାହାଣୀ ପୁନର୍ବାର ଦେଖନ୍ତୁ',
  },
};

type LangKey = keyof typeof STORIES;
const SPEEDS = [1, 1.5, 2, 3];

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export function StarWarsCrawl() {
  const router = useRouter();
  const [lang, setLang] = useState<LangKey>('en');
  const [speedIndex, setSpeedIndex] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isCrawlFinished, setIsCrawlFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [ytReady, setYtReady] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showReachOut, setShowReachOut] = useState(false);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const crawlRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const wantPlayRef = useRef<boolean>(false);

  const currentStory = STORIES[lang];
  const currentSpeed = SPEEDS[speedIndex];

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText('raunakswain.19402@gmail.com');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(newVol);
        if (newVol > 0 && ytPlayerRef.current.isMuted?.()) {
          ytPlayerRef.current.unMute?.();
        }
      } catch (_) {}
    }
  };

  // 1. YouTube IFrame API initialization
  useEffect(() => {
    let isMounted = true;

    const initYT = () => {
      if (typeof window === 'undefined' || !window.YT || !window.YT.Player) return;
      if (ytPlayerRef.current) return;

      try {
        ytPlayerRef.current = new window.YT.Player('creditsYtIframe', {
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              setYtReady(true);
              try {
                event.target.setVolume(volume);
              } catch (_) {}
              if (wantPlayRef.current) {
                wantPlayRef.current = false;
                try {
                  event.target.playVideo();
                  setIsAudioPlaying(true);
                } catch (_) {}
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsAudioPlaying(true);
              } else if (
                event.data === window.YT.PlayerState.PAUSED ||
                event.data === window.YT.PlayerState.ENDED
              ) {
                setIsAudioPlaying(false);
              }
            },
          },
        });
      } catch (err) {
        console.warn('YouTube Player initialization notice:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      const existingScript = document.getElementById('yt-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.();
        initYT();
      };
    }

    return () => {
      isMounted = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.stopVideo();
        } catch (_) {}
      }
    };
  }, [volume]);

  // 2. Interactive Starfield Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const numStars = 320;
    const stars = Array.from({ length: numStars }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.7 + 0.3,
      twinkleSpeed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      color:
        Math.random() < 0.12
          ? '#ffd54c'
          : Math.random() < 0.22
          ? '#90cdf4'
          : '#ffffff',
    }));

    const render = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      for (const star of stars) {
        star.alpha += star.twinkleSpeed;
        if (star.alpha > 1 || star.alpha < 0.2) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }

        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, star.alpha));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // 3. Web Animations API Speed Controller
  const applySpeed = useCallback(
    (speed: number) => {
      const elements = [crawlRef.current, preRef.current];
      elements.forEach((el) => {
        if (!el) return;
        el.getAnimations().forEach((animation) => {
          animation.playbackRate = speed;
        });
      });
    },
    []
  );

  useEffect(() => {
    applySpeed(currentSpeed);
  }, [currentSpeed, applySpeed, restartKey]);

  // 4. Reliable Play/Pause Soundtrack Handler
  const toggleAudio = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const player = ytPlayerRef.current;

    if (isAudioPlaying) {
      setIsAudioPlaying(false);
      wantPlayRef.current = false;
      if (player?.pauseVideo) {
        try {
          player.pauseVideo();
        } catch (_) {}
      }
      const iframe = document.getElementById('creditsYtIframe') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      }
    } else {
      setIsAudioPlaying(true);
      if (player?.playVideo && ytReady) {
        try {
          player.playVideo();
        } catch (_) {}
      } else {
        wantPlayRef.current = true;
      }
      const iframe = document.getElementById('creditsYtIframe') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      }
    }
  };

  // 5. Speed cycle toggle
  const handleCycleSpeed = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSpeedIndex((prev) => (prev + 1) % SPEEDS.length);
  };

  // 6. Language toggle
  const handleToggleLang = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLang((prev) => STORIES[prev].nextLang as LangKey);
  };

  // 7. Restart Crawl
  const handleRestart = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsCrawlFinished(false);
    setIsPaused(false);
    setRestartKey((k) => k + 1);

    if (ytPlayerRef.current && isAudioPlaying) {
      try {
        ytPlayerRef.current.seekTo(0, true);
      } catch (_) {}
    }
  };

  // 8. Toggle Pause/Play on crawl animation
  const handleTogglePause = () => {
    const el = crawlRef.current;
    if (!el) return;
    el.getAnimations().forEach((a) => {
      if (isPaused) {
        a.play();
      } else {
        a.pause();
      }
    });
    setIsPaused(!isPaused);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReachOut) {
          setShowReachOut(false);
          return;
        }
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.stopVideo();
          } catch (_) {}
        }
        router.push('/');
      } else if (e.key === ' ' && !isCrawlFinished) {
        e.preventDefault();
        handleTogglePause();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        handleCycleSpeed();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPaused, isCrawlFinished, showReachOut, router]);

  const handleNavigateHome = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.stopVideo();
      } catch (_) {}
    }
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black select-none font-sans text-[#ffd54c]">
      {/* Stable background YouTube player iframe with enablejsapi */}
      <div
        className="pointer-events-none absolute -left-[9999px] -top-[9999px] h-1 w-1 opacity-0"
        aria-hidden="true"
      >
        <iframe
          id="creditsYtIframe"
          width="200"
          height="200"
          src="https://www.youtube-nocookie.com/embed/MhzGSgicAoc?enablejsapi=1&autoplay=1&loop=1&playlist=MhzGSgicAoc&playsinline=1&controls=0"
          title="Steve Lacy Soundtrack"
          allow="autoplay; encrypted-media"
        />
      </div>

      {/* 1. Canvas Starfield Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 h-full w-full pointer-events-none"
      />

      {/* 2. Top Control HUD Bar */}
      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 sm:p-6 text-xs select-none">
        {/* Left: Soundtrack & Reach Out */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 relative z-50">
          {/* Audio Toggle Button */}
          <button
            type="button"
            onClick={toggleAudio}
            className="cursor-pointer flex items-center gap-2 rounded-full border border-white/20 bg-black/75 px-3.5 py-2 text-xs font-mono font-bold tracking-wider text-white backdrop-blur-md transition-all duration-300 hover:border-[#ffd54c] hover:bg-black/90 hover:text-[#ffd54c] shadow-lg active:scale-95"
            title={isAudioPlaying ? "Mute Soundtrack" : "Play Steve Lacy - oh yeah?"}
          >
            {isAudioPlaying ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400">MUSIC ON</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-[#ffd54c]" />
                <span>PLAY MUSIC</span>
              </>
            )}
          </button>

          {/* Volume Slider Control */}
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/75 px-3 py-1.5 backdrop-blur-md shadow-lg">
            <button
              type="button"
              onClick={() => handleVolumeChange(volume === 0 ? 80 : 0)}
              className="text-white/80 hover:text-[#ffd54c] transition-colors focus:outline-none"
              title={volume === 0 ? "Unmute" : "Mute"}
            >
              {volume === 0 ? (
                <VolumeX className="h-3.5 w-3.5 text-rose-400" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-16 sm:w-24 h-1.5 rounded-lg appearance-none bg-white/25 accent-[#ffd54c] cursor-pointer"
              aria-label="Soundtrack Volume"
              title={`Volume: ${volume}%`}
            />
            <span className="text-[11px] font-mono font-bold text-[#ffd54c] w-6 text-right tabular-nums">
              {volume}%
            </span>
          </div>

          {/* Reach Out Button */}
          <button
            type="button"
            onClick={() => setShowReachOut(true)}
            className="cursor-pointer flex items-center gap-1.5 rounded-full border border-[#ffd54c]/60 bg-[#ffd54c]/15 hover:bg-[#ffd54c] text-[#ffd54c] hover:text-black px-3.5 py-1.5 text-xs font-heading font-bold uppercase tracking-wider transition-all duration-300 shadow-lg active:scale-95"
            title="Reach Out / Say Hi"
          >
            <Send className="h-3.5 w-3.5" />
            <span>REACH OUT</span>
          </button>

          {/* Steve Lacy Credit Tag */}
          <div className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-md">
            <Music className="h-3 w-3 text-[var(--gold)]" />
            <span>Steve Lacy — &quot;oh yeah?&quot;</span>
          </div>
        </div>

        {/* Right: Speed, Language, Restart, Close */}
        <div className="flex items-center gap-2 sm:gap-3 relative z-50">
          {/* Speed Multiplier Button */}
          <button
            type="button"
            onClick={handleCycleSpeed}
            className="cursor-pointer flex items-center justify-center rounded-full border border-[#ffd54c]/40 bg-black/75 px-3.5 py-2 text-xs font-mono font-bold text-[#ffd54c] transition-all duration-300 hover:border-[#ffd54c] hover:bg-[#ffd54c] hover:text-black shadow-lg active:scale-95"
            title="Toggle Crawl Speed (1x, 1.5x, 2x, 3x)"
          >
            {currentSpeed}× SPEED
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={handleToggleLang}
            className="cursor-pointer flex items-center justify-center rounded-full border border-[#ffd54c]/40 bg-black/75 px-3.5 py-2 text-xs font-heading font-bold uppercase text-[#ffd54c] transition-all duration-300 hover:border-[#ffd54c] hover:bg-[#ffd54c] hover:text-black shadow-lg active:scale-95"
            title={`Switch to ${currentStory.nextLang.toUpperCase()}`}
          >
            {currentStory.langLabel.toUpperCase()}
          </button>

          {/* Restart Button */}
          <button
            type="button"
            onClick={handleRestart}
            className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-full border border-[#ffd54c]/40 bg-black/75 text-[#ffd54c] transition-all duration-300 hover:border-[#ffd54c] hover:bg-[#ffd54c] hover:text-black shadow-lg active:scale-95"
            title="Restart Animation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={handleNavigateHome}
            className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-full border border-[#ffd54c]/40 bg-black/75 text-[#ffd54c] transition-all duration-300 hover:border-[#ffd54c] hover:bg-[#ffd54c] hover:text-black shadow-lg active:scale-95"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 3. Opening "SOME IDEAS DON'T BEGIN WITH A PLAN..." Cinematic Blue Teaser */}
      <div
        key={`pre-${restartKey}-${lang}`}
        ref={preRef}
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-center px-6"
        style={{
          animation: 'star-wars-pre 5.8s ease 0.2s forwards',
        }}
      >
        <p className="text-xl sm:text-3xl lg:text-4xl font-sans font-semibold text-[#4bd5ee] tracking-[0.08em] leading-relaxed whitespace-pre-line drop-shadow-[0_0_24px_rgba(75,213,238,0.7)] uppercase">
          {currentStory.pre}
        </p>
      </div>

      {/* 4. 3D Perspective Plane & Crawl Content */}
      <div
        className="absolute inset-0 z-10 overflow-hidden pointer-events-none"
        style={{
          perspective: '52vh',
          perspectiveOrigin: '50% 22%',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 4%, #000000 34%)',
          maskImage: 'linear-gradient(to bottom, transparent 4%, #000000 34%)',
        }}
      >
        <div
          key={`crawl-${restartKey}-${lang}`}
          ref={crawlRef}
          onAnimationEnd={(e) => {
            if (e.animationName === 'star-wars-crawl') {
              setIsCrawlFinished(true);
            }
          }}
          className="absolute left-1/2 bottom-0 w-[86vw] max-w-[64ch] cursor-pointer pointer-events-auto"
          style={{
            transformOrigin: '50% 100%',
            transform: 'translateX(-50%) rotateX(58deg) translateY(100%)',
            animation: 'star-wars-crawl 115s linear 5.2s forwards',
          }}
          onClick={handleTogglePause}
          title="Click to Pause / Resume"
        >
          {/* Episode Tag */}
          <p className="text-center text-base sm:text-xl font-heading font-black tracking-[0.35em] text-[#ffd54c] mb-4">
            {currentStory.episode}
          </p>

          {/* Main Title */}
          <h1 className="text-center font-heading font-black text-4xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight uppercase text-[#ffd54c] mb-12 drop-shadow-[0_0_30px_rgba(255,213,76,0.5)] whitespace-pre-line">
            {currentStory.title}
          </h1>

          {/* Body Paragraphs with clean, glowing typographic emphasis */}
          <div className="space-y-8 text-justify font-sans text-lg sm:text-2xl font-semibold leading-[1.65] text-[#ffd54c]/95">
            {currentStory.paragraphs.map((p, idx) => (
              <p key={idx} className="tracking-wide">
                {renderHighlightedText(p)}
              </p>
            ))}
          </div>

          <div className="text-center pt-16 pb-32 text-sm font-mono tracking-widest text-[#ffd54c]/60">
            ★ ★ ★
          </div>
        </div>
      </div>

      {/* 5. Outro Conclusion Card */}
      <AnimatePresence>
        {isCrawlFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl"
          >
            <div className="max-w-xl w-full rounded-3xl border border-[#ffd54c]/30 bg-black/90 p-8 sm:p-12 text-center shadow-[0_0_60px_rgba(255,213,76,0.15)]">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-[#ffd54c]/15 border border-[#ffd54c]/30 flex items-center justify-center text-[#ffd54c] mb-6 shadow-gold">
                <Trophy className="h-8 w-8" />
              </div>

              <h2 className="font-heading font-black text-3xl sm:text-5xl text-[#ffd54c] tracking-tight mb-4 drop-shadow-[0_0_35px_rgba(255,213,76,0.85)]">
                {currentStory.outroHeader}
              </h2>
              <p className="text-base sm:text-lg text-white/90 font-medium mb-5 leading-relaxed max-w-md mx-auto">
                {currentStory.outroSubtitle}
              </p>

              {/* Music Credit Tag on Outro */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#ffd54c]/30 bg-[#ffd54c]/10 px-4 py-2 text-xs font-mono font-semibold text-[#ffd54c]">
                <Music className="h-3.5 w-3.5" />
                <span>{currentStory.soundtrackCredit}</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  onClick={() => {
                    handleNavigateHome();
                    router.push('/auction');
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffd54c] px-7 py-3.5 text-sm font-heading font-bold uppercase tracking-wider text-black transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,213,76,0.5)]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{currentStory.btnAuction}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={handleRestart}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-[#ffd54c]/40 bg-black/60 px-6 py-3.5 text-sm font-heading font-bold uppercase tracking-wider text-[#ffd54c] transition-all duration-300 hover:border-[#ffd54c] hover:bg-[#ffd54c]/10"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{currentStory.btnReplay}</span>
                </button>

                <button
                  onClick={handleNavigateHome}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-sans font-medium text-white/80 transition-all duration-300 hover:border-white/40 hover:bg-white/10"
                >
                  <span>{currentStory.btnHome}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Reach Out 3D Paper-Opening Popover Modal */}
      <AnimatePresence>
        {showReachOut && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
            {/* Non-blurred translucent backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReachOut(false)}
              className="absolute inset-0 bg-black/60"
              aria-hidden="true"
            />

            {/* 3D Paper-Opening Window Container */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.55,
                rotateX: -75,
                rotateY: 25,
                rotateZ: -8,
                y: -60,
                transformOrigin: 'top center',
                filter: 'drop-shadow(0 25px 40px rgba(0,0,0,0.9))',
              }}
              animate={{
                opacity: 1,
                scale: 1,
                rotateX: 0,
                rotateY: 0,
                rotateZ: 0,
                y: 0,
                transformOrigin: 'center center',
                filter: 'drop-shadow(0 30px 70px rgba(0,0,0,0.95))',
              }}
              exit={{
                opacity: 0,
                scale: 0.65,
                rotateX: 55,
                rotateY: -20,
                y: 50,
                transition: { duration: 0.25 },
              }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                perspective: 1600,
                transformStyle: 'preserve-3d',
              }}
              className="relative w-full max-w-2xl z-10 select-text font-sans"
            >
              {/* Retro App Window Frame */}
              <div className="relative rounded-2xl border border-white/20 bg-[#0c0c0e] text-white shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden">
                {/* Window Top Bar */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10 bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReachOut(false)}
                      className="w-7 h-7 rounded-full border border-white/25 bg-white/5 hover:bg-[#ffd54c] hover:border-[#ffd54c] hover:text-black flex items-center justify-center text-white/80 transition-all duration-200 active:scale-90"
                      aria-label="Close window"
                    >
                      <svg className="w-3.5 h-3.5 stroke-current stroke-2" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    <span className="font-mono text-xs text-white/70 tracking-wider">
                      call-me.exe
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest bg-[#ffd54c]/15 text-[#ffd54c] border border-[#ffd54c]/30">
                    CONTACT
                  </span>
                </div>

                {/* Window Spread: Two Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-12 p-6 sm:p-8 gap-6 sm:gap-8 items-center">
                  {/* Left Column: Picture Card Frame */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center">
                    <div className="relative aspect-[4/5] w-full max-w-[220px] sm:max-w-none rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black">
                      <Image
                        src="/pixel-art-3.jpg"
                        alt="Raunak Swain"
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 220px, 260px"
                        priority
                      />
                    </div>
                  </div>

                  {/* Right Column: Title & Contact Links */}
                  <div className="sm:col-span-7 flex flex-col justify-between space-y-6">
                    <div>
                      <h2 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight leading-none uppercase">
                        CALL ME
                      </h2>
                      <p className="font-mono text-xs text-white/50 tracking-wider mt-1.5 uppercase">
                        let&apos;s talk
                      </p>
                    </div>

                    {/* Direct Minimalist Links List */}
                    <div className="space-y-3.5 font-mono text-xs sm:text-sm">
                      {/* Email Row */}
                      <div className="flex items-center justify-between py-2 border-b border-white/10 group">
                        <span className="text-white/40 uppercase tracking-wider text-[11px] shrink-0">
                          email
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <a
                            href="mailto:raunakswain.19402@gmail.com"
                            className="text-white group-hover:text-[#ffd54c] transition-colors truncate max-w-[180px] sm:max-w-[220px] text-right font-medium hover:underline"
                          >
                            raunakswain.19402@gmail.com
                          </a>
                          <button
                            type="button"
                            onClick={handleCopyEmail}
                            className="text-white/40 hover:text-white transition-colors shrink-0"
                            title="Copy email address"
                          >
                            {copied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Instagram Row */}
                      <div className="flex items-center justify-between py-2 border-b border-white/10 group">
                        <span className="text-white/40 uppercase tracking-wider text-[11px] shrink-0">
                          instagram
                        </span>
                        <a
                          href="https://www.instagram.com/rawknuk"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-white group-hover:text-[#ffd54c] transition-colors font-medium hover:underline"
                        >
                          <span>@rawknuk</span>
                          <ExternalLink className="h-3.5 w-3.5 text-white/40 group-hover:text-[#ffd54c]" />
                        </a>
                      </div>

                      {/* X / Twitter Row */}
                      <div className="flex items-center justify-between py-2 border-b border-white/10 group">
                        <span className="text-white/40 uppercase tracking-wider text-[11px] shrink-0">
                          x / twitter
                        </span>
                        <a
                          href="https://x.com/RaunakSwain"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-white group-hover:text-[#ffd54c] transition-colors font-medium hover:underline"
                        >
                          <span>@RaunakSwain</span>
                          <ExternalLink className="h-3.5 w-3.5 text-white/40 group-hover:text-[#ffd54c]" />
                        </a>
                      </div>
                    </div>

                    {/* Window Footer hint */}
                    <div className="pt-1 text-right">
                      <span className="text-[10px] font-mono text-white/35 uppercase tracking-widest">
                        press esc or &times; to close
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSS Keyframe animations */}
      <style jsx global>{`
        @keyframes star-wars-pre {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          12% {
            opacity: 1;
            transform: scale(1);
          }
          82% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.04);
          }
        }

        @keyframes star-wars-crawl {
          0% {
            transform: translateX(-50%) rotateX(58deg) translateY(100%);
          }
          100% {
            transform: translateX(-50%) rotateX(58deg) translateY(-220%);
          }
        }
      `}</style>
    </div>
  );
}

export default StarWarsCrawl;
