export interface VinylSong {
  title: string;
  artist: string;
  url: string; // YouTube Video ID or full link
}

export interface VinylCategory {
  id: string;
  title: string;
  category: string;
  description: string;
  accent: {
    glow: string;
    borderGradient: string;
    labelGradient: string;
    pillBg: string;
    pillText: string;
    badgeBorder: string;
  };
  songs: VinylSong[];
}

export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : trimmed;
}

export const VINYL_CATEGORIES: VinylCategory[] = [
  {
    id: 'fifa-classics',
    title: 'FIFA Classic Anthems',
    category: 'FIFA Soundtrack',
    description: '43 nostalgic bangers from FIFA 14 through FIFA 23',
    accent: {
      glow: 'rgba(234, 179, 8, 0.45)',
      borderGradient: 'from-amber-400 via-[var(--gold)] to-yellow-600',
      labelGradient: 'from-amber-600 via-[var(--gold)] to-amber-300',
      pillBg: 'bg-amber-500/20',
      pillText: 'text-amber-300',
      badgeBorder: 'border-amber-500/40',
    },
    songs: [
      { title: "Found What I've Been Looking For", artist: 'Tom Grennan', url: 'https://www.youtube.com/watch?v=VDvX1hzGZN4' },
      { title: 'Drown', artist: 'Kovic', url: 'https://www.youtube.com/watch?v=dYdkHkbPvak' },
      { title: 'Heat Waves', artist: 'Glass Animals', url: 'https://www.youtube.com/watch?v=mRD0-GxqHVo' },
      { title: "I Don't Wanna Talk (I Just Wanna Dance)", artist: 'Glass Animals', url: 'https://www.youtube.com/watch?v=9nrEaHinGmY' },
      { title: 'Walk', artist: 'Kwabs', url: 'https://www.youtube.com/watch?v=TW9uj83Vq-0' },
      { title: 'The Nights', artist: 'Avicii', url: 'https://www.youtube.com/watch?v=UtF6Jej8yb4' },
      { title: "Busy Earnin'", artist: 'Jungle', url: 'https://www.youtube.com/watch?v=BcsfftwLUf0' },
      { title: 'Speed the Collapse', artist: 'METRIC', url: 'https://www.youtube.com/watch?v=7jiQ1QpNSkA' },
      { title: 'JUNGLE', artist: 'TASH SULTANA', url: 'https://www.youtube.com/watch?v=CZvP7PwUAwM' },
      { title: 'Love Me Again', artist: 'John Newman', url: 'https://www.youtube.com/watch?v=CfihYWRWRTQ' },
      { title: 'Genius (ft. Sia, Diplo, Labrinth)', artist: 'LSD', url: 'https://www.youtube.com/watch?v=6o5ZMiyabj8' },
      { title: 'On Top Of The World', artist: 'Imagine Dragons', url: 'https://www.youtube.com/watch?v=w5tWYmIOWGk' },
      { title: 'Anyway', artist: 'HUNTAR', url: 'https://www.youtube.com/watch?v=NNimUS6uYCM' },
      { title: 'Oliver Twist', artist: 'ArrDee', url: 'https://www.youtube.com/watch?v=HC7p5PjrC1E' },
      { title: 'Let It Roll', artist: 'Flo Rida', url: 'https://www.youtube.com/watch?v=KA9zDfYio6c' },
      { title: 'Spark', artist: 'Fitz And The Tantrums', url: 'https://www.youtube.com/watch?v=gh-pGxZBQ1Y' },
      { title: 'Colors', artist: 'Jason Derulo', url: 'https://www.youtube.com/watch?v=p6E9R9qv1No' },
      { title: 'Quesadilla', artist: 'WALK THE MOON', url: 'https://www.youtube.com/watch?v=98jijv5-xOg' },
      { title: 'We Come Running', artist: 'Youngblood Hawke', url: 'https://www.youtube.com/watch?v=6ECw5DTULQ8' },
      { title: 'Love Natural', artist: 'Crystal Fighters', url: 'https://www.youtube.com/watch?v=IVzyErnSnFI' },
      { title: 'Alive', artist: 'Empire Of The Sun', url: 'https://www.youtube.com/watch?v=IPKAwJKGSDc' },
      { title: 'Erase', artist: 'Cautious Clay', url: 'https://www.youtube.com/watch?v=gdRiKko89Ds' },
      { title: "Don't Turn Around", artist: 'Biig Piig', url: 'https://www.youtube.com/watch?v=qJlforz7BU8' },
      { title: 'Wish I Was Younger', artist: 'Alfie Templeman', url: 'https://www.youtube.com/watch?v=V6AZhc7U2fs' },
      { title: 'Followers', artist: 'AREA21', url: 'https://www.youtube.com/watch?v=xVXWUOv9EIg' },
      { title: 'Ticket To Ride', artist: 'KAWALA', url: 'https://www.youtube.com/watch?v=QnqGxpf5eNg' },
      { title: 'Way Down We Go', artist: 'KALEO', url: 'https://www.youtube.com/watch?v=0-7IHOXkiV8' },
      { title: 'Move', artist: 'SAINT MOTEL', url: 'https://www.youtube.com/watch?v=U9DZkj8Rq6g' },
      { title: 'The Beautiful Game (ft. St. Lucia)', artist: 'RAC', url: 'https://www.youtube.com/watch?v=T4XiakOjQyM' },
      { title: 'My Type', artist: 'SAINT MOTEL', url: 'https://www.youtube.com/watch?v=IyVPyKrx0Xo' },
      { title: 'Live In The Moment', artist: 'Portugal. The Man', url: 'https://www.youtube.com/watch?v=Hha0bwVvGmY' },
      { title: 'Fly Or Die', artist: 'Rock Mafia', url: 'https://www.youtube.com/watch?v=DNnmOf2jRhk' },
      { title: 'Pompeii', artist: 'Bastille', url: 'https://www.youtube.com/watch?v=F90Cw4l-8NY' },
      { title: 'Madan (King)', artist: 'Bakermat', url: 'https://www.youtube.com/watch?v=Ob65bV_Ecsk' },
      { title: "Feet Don't Fail Me Now", artist: 'Joy Crookes', url: 'https://www.youtube.com/watch?v=xLFCcnYSCyE' },
      { title: 'Fils de joie', artist: 'Stromae', url: 'https://www.youtube.com/watch?v=M7Z2tgJo8Hg' },
      { title: 'Finesse (ft. BNXN)', artist: 'Pheelz', url: 'https://www.youtube.com/watch?v=Vcwhe0pY4Bg' },
      { title: 'Mad', artist: 'Hope Tala', url: 'https://www.youtube.com/watch?v=P5p547QOIHU' },
      { title: 'skeletons', artist: 'hard life', url: 'https://www.youtube.com/watch?v=87U_l3AvyX0' },
      { title: 'Shine A Light', artist: 'BANNERS', url: 'https://www.youtube.com/watch?v=uaLblVmnNL4' },
      { title: 'Send Them Off!', artist: 'Bastille', url: 'https://www.youtube.com/watch?v=vn-6fiVkAcA' },
      { title: 'Dreaming', artist: 'Smallpools', url: 'https://www.youtube.com/watch?v=e8xni3EcIbc' },
      { title: 'Yo x Ti, Tu x Mi', artist: 'ROSALIA, Ozuna', url: 'https://www.youtube.com/watch?v=2j3x0VYnehg' },
    ],
  },
  {
    id: 'world-cup-stadium',
    title: 'World Cup & Stadium Anthems',
    category: 'Stadium Bangers',
    description: 'Electric matchday anthems that rock football stadiums worldwide',
    accent: {
      glow: 'rgba(16, 185, 129, 0.45)',
      borderGradient: 'from-emerald-400 via-green-500 to-teal-700',
      labelGradient: 'from-emerald-600 via-green-400 to-emerald-200',
      pillBg: 'bg-emerald-500/20',
      pillText: 'text-emerald-300',
      badgeBorder: 'border-emerald-500/40',
    },
    songs: [
      { title: 'Waka Waka (This Time for Africa)', artist: 'Shakira', url: 'https://www.youtube.com/watch?v=pRpeEdMmmQ0' },
      { title: "Wavin' Flag (Celebration Mix)", artist: "K'NAAN", url: 'https://www.youtube.com/watch?v=WTJSt4wP2ME' },
      { title: 'We Are One (Ole Ola)', artist: 'Pitbull ft. Jennifer Lopez & Claudia Leitte', url: 'https://www.youtube.com/watch?v=TGtWWb9emYI' },
      { title: 'La La La (Brazil 2014)', artist: 'Shakira ft. Carlinhos Brown', url: 'https://www.youtube.com/watch?v=7-7knsP2n5w' },
      { title: 'Live It Up', artist: 'Nicky Jam ft. Will Smith & Era Istrefi', url: 'https://www.youtube.com/watch?v=V15BYnSr0P8' },
      { title: 'Hayya Hayya (Better Together)', artist: 'Trinidad Cardona, Davido, AISHA', url: 'https://www.youtube.com/watch?v=vyDx5ZGL7S8' },
      { title: 'Seven Nation Army', artist: 'The White Stripes', url: 'https://www.youtube.com/watch?v=0J2QdDbelmY' },
      { title: "Three Lions (Football's Coming Home)", artist: 'Baddiel, Skinner & Lightning Seeds', url: 'https://www.youtube.com/watch?v=oyyXhKsfG-Y' },
      { title: "Can't Stop", artist: 'Red Hot Chili Peppers', url: 'https://www.youtube.com/watch?v=8DyziWtk60w' },
      { title: 'Freed From Desire', artist: 'Gala', url: 'https://www.youtube.com/watch?v=p3l7fgvrKGk' },
    ],
  },
  {
    id: 'ucl-hype',
    title: 'Champions League & Matchday',
    category: 'Matchday Energy',
    description: 'High-intensity adrenaline tunes for decisive bidding battles',
    accent: {
      glow: 'rgba(59, 130, 246, 0.45)',
      borderGradient: 'from-sky-400 via-blue-500 to-indigo-700',
      labelGradient: 'from-blue-600 via-sky-400 to-indigo-200',
      pillBg: 'bg-blue-500/20',
      pillText: 'text-blue-300',
      badgeBorder: 'border-blue-500/40',
    },
    songs: [
      { title: 'UEFA Champions League Official Anthem', artist: 'Tony Britten', url: 'https://www.youtube.com/watch?v=0Qqd6T_A9LY' },
      { title: 'Club Foot', artist: 'Kasabian', url: 'https://www.youtube.com/watch?v=lk5iWCE0108' },
      { title: 'Fire', artist: 'Kasabian', url: 'https://www.youtube.com/watch?v=agVpq_XXRmU' },
      { title: 'Song 2', artist: 'Blur', url: 'https://www.youtube.com/watch?v=SSbBvKaM6sk' },
      { title: 'The Rockafeller Skank', artist: 'Fatboy Slim', url: 'https://www.youtube.com/watch?v=FMrIy9zv7QY' },
      { title: 'Right Here, Right Now', artist: 'Fatboy Slim', url: 'https://www.youtube.com/watch?v=ub747pprmJ8' },
      { title: 'Sandstorm', artist: 'Darude', url: 'https://www.youtube.com/watch?v=y6120QOlsfU' },
      { title: 'Levels', artist: 'Avicii', url: 'https://www.youtube.com/watch?v=_ovdm2yX4MA' },
      { title: 'Titanium (ft. Sia)', artist: 'David Guetta', url: 'https://www.youtube.com/watch?v=JRfuAukYTKg' },
    ],
  },
  {
    id: 'samba-latin',
    title: 'Samba & Latin Matchday Fuego',
    category: 'Latin & Samba',
    description: 'Joga Bonito rhythms and Latin football festival energy',
    accent: {
      glow: 'rgba(244, 63, 94, 0.45)',
      borderGradient: 'from-rose-400 via-pink-500 to-red-700',
      labelGradient: 'from-rose-600 via-pink-400 to-rose-200',
      pillBg: 'bg-rose-500/20',
      pillText: 'text-rose-300',
      badgeBorder: 'border-rose-500/40',
    },
    songs: [
      { title: 'Mas Que Nada', artist: 'Sergio Mendes ft. The Black Eyed Peas', url: 'https://www.youtube.com/watch?v=BrZBiqJ0DYg' },
      { title: 'Danza Kuduro', artist: 'Don Omar ft. Lucenzo', url: 'https://www.youtube.com/watch?v=7zp1TbLFpp8' },
      { title: 'Gasolina', artist: 'Daddy Yankee', url: 'https://www.youtube.com/watch?v=CCF1_jI8Prk' },
      { title: 'Bailando', artist: 'Enrique Iglesias ft. Descemer Bueno, Gente De Zona', url: 'https://www.youtube.com/watch?v=NUsoVlDFqZg' },
      { title: 'Vivir Mi Vida', artist: 'Marc Anthony', url: 'https://www.youtube.com/watch?v=YXnjy5YtDwk' },
      { title: 'Tacata', artist: 'Tacabro', url: 'https://www.youtube.com/watch?v=BJ-CmHZrKHU' },
      { title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', url: 'https://www.youtube.com/watch?v=kJQPM7kiw5Fk' },
    ],
  },
];
