/**
 * kids-games-data.ts — Word lists, trivia questions, and game data for Kids Hub
 * Age tiers: little (Yr1-3), middle (Yr4-7), older (Yr8+)
 */

// ── WORDLE WORD LISTS (age-tiered) ──────────────────────────────────────────

// Little (Yr1-3): 4-letter words — simple, common, kid-friendly
export const WORDLE_LITTLE = [
  'BIKE','BIRD','BLUE','BOAT','BOOK','CAKE','CAMP','CATS','CLAP','COLD',
  'COOK','COOL','CRAB','DARK','DEER','DICE','DOGS','DOOR','DRAW','DROP',
  'DRUM','DUCK','EACH','EYES','FACE','FARM','FAST','FIND','FIRE','FISH',
  'FLAG','FLAT','FROG','GAME','GIFT','GOAT','GOLD','GOOD','GROW','HALF',
  'HAND','HATS','HELP','HERO','HIDE','HILL','HOME','HOPE','HUGE','JUMP',
  'JUST','KEEP','KICK','KIDS','KITE','LAKE','LAMP','LAST','LEAF','LIKE',
  'LION','LIST','LONG','LOOK','LOVE','LUCK','MADE','MAKE','MAPS','MILK',
  'MOON','MOVE','MUCH','MUST','NAME','NEST','NICE','NOSE','ONLY','OPEN',
  'PACK','PARK','PATH','PETS','PICK','PINK','PLAN','PLAY','POND','PONY',
  'POOL','PULL','PUSH','RAIN','READ','RICH','RIDE','RING','ROAD','ROCK',
  'ROLL','ROOF','ROOM','ROPE','ROSE','RUDE','SAFE','SAIL','SAND','SAVE',
  'SEED','SHIP','SHOW','SING','SIZE','SKIP','SLOW','SNAP','SNOW','SOAR',
  'SOFT','SOME','SONG','SORT','SPIN','SPOT','STAR','STAY','STEP','STOP',
  'SUCH','SWIM','TAIL','TAKE','TALK','TALL','TEAM','TELL','TEST','THAT',
  'THEM','THIN','THIS','TIDE','TIME','TOAD','TOLD','TOPS','TOWN','TRAP',
  'TREE','TRIP','TRUE','TUBE','TURN','TWIN','UPON','VERY','VINE','VOTE',
  'WAIT','WAKE','WALK','WALL','WARM','WASH','WAVE','WEEK','WELL','WENT',
  'WEST','WHAT','WHEN','WIDE','WILD','WILL','WIND','WING','WISE','WISH',
  'WITH','WOLF','WOOD','WORD','WORK','WORM','WRAP','YEAR','YOGA','YOUR',
  'ZERO','ZONE','ZOOM',
];

// Middle (Yr4-7): 5-letter words — standard difficulty
export const WORDLE_MIDDLE = [
  'ABOUT','ABOVE','ALIVE','ANGEL','BEACH','BELOW','BERRY','BIRDS','BLACK','BLAST',
  'BLAZE','BLIND','BLOCK','BLOOM','BOARD','BONES','BOOTS','BRAIN','BRAND','BRAVE',
  'BREAD','BREAK','BRICK','BRING','BRUSH','BUILD','BURNS','BURST','CABIN','CANDY',
  'CARGO','CATCH','CHAIN','CHAIR','CHALK','CHARM','CHASE','CHEAP','CHEER','CHESS',
  'CHIEF','CHILD','CHIRP','CLASS','CLEAN','CLEAR','CLIMB','CLOCK','CLOSE','CLOUD',
  'COACH','COAST','COLOR','COMET','CORAL','COUNT','COURT','COVER','CRAFT','CRANE',
  'CRASH','CREAM','CROSS','CROWD','CROWN','CRUSH','DANCE','DREAM','DRIFT','DRINK',
  'DRIVE','EAGLE','EARTH','ELBOW','EMBER','ENJOY','EQUAL','EVENT','EVERY','EXACT',
  'EXTRA','FAIRY','FEAST','FIELD','FIGHT','FINAL','FLAME','FLASH','FLEET','FLOAT',
  'FLOOD','FLOOR','FLUTE','FOCUS','FORCE','FORGE','FOUND','FRAME','FRESH','FROST',
  'FRUIT','GIANT','GLARE','GLASS','GLOBE','GLOOM','GLOVE','GOALS','GRACE','GRAIN',
  'GRAND','GRAPE','GRASP','GRASS','GRAVE','GREAT','GREEN','GRIND','GROUP','GUARD',
  'GUIDE','HAPPY','HAVEN','HEART','HORSE','HOTEL','HOUSE','HUMAN','HUMOR','IDEAL',
  'IMAGE','JUDGE','JUICE','KAYAK','KNACK','KNIFE','KNOCK','LARGE','LAUGH','LAYER',
  'LEARN','LEVEL','LIGHT','LINEN','LODGE','LUCKY','LUNCH','MAGIC','MAJOR','MANOR',
  'MAPLE','MARCH','MARRY','MATCH','MEDAL','MERCY','MIGHT','MINOR','MONEY','MONTH',
  'MORAL','MOUNT','MOUSE','MOVIE','MUSIC','NIGHT','NOBLE','NOISE','NORTH','NOTED',
  'NOVEL','NURSE','OCEAN','OLIVE','ORBIT','ORDER','OTHER','OUTER','OWNED','PAINT',
  'PANEL','PAPER','PARTY','PEACE','PEACH','PEARL','PHASE','PIANO','PILOT','PIZZA',
  'PLACE','PLAIN','PLANE','PLANT','PLATE','PLEAD','PLUCK','PLUMB','PLUME','POINT',
];

// Older (Yr8+): 5-letter words — harder vocabulary
export const WORDLE_OLDER = [
  'ABYSS','ADEPT','AGILE','ALIBI','ALOOF','AMAZE','ANGST','ANTIC','APTLY','ARBOR',
  'AROMA','ASKEW','ATTIC','AVIAN','AXIOM','BADGE','BLISS','BLUFF','BLUNT','BOGUS',
  'BRASH','BRISK','BROAD','BUDGE','CABAL','CAMEL','CARGO','CEDAR','CHASM','CIVIC',
  'CLAMP','CLASP','CLASH','CLEFT','CLING','CLONE','COARSE','COVET','CRAFT','CRANE',
  'CRAVE','CRISP','CRUDE','CUBIC','DEBUT','DECOY','DELVE','DEMUR','DEPOT','DETER',
  'DIARY','DIGIT','DODGE','DOUBT','DOUSE','DOWDY','DRAFT','DRAIN','DRAPE','DRAWL',
  'DREAD','DRIED','DROIT','DRONE','DROOL','DUNCE','DWARF','EAGER','EASEL','EDICT',
  'EERIE','EIGHT','ELATE','ELECT','ELITE','ELUDE','EMBED','EMOTE','ENACT','ENDOW',
  'ENSUE','EPOCH','EQUIP','ERODE','EVADE','EVOKE','EXALT','EXERT','EXILE','EXPEL',
  'FACET','FARCE','FEAST','FEIGN','FEINT','FETCH','FIBRE','FLAIR','FLASK','FLORA',
  'FLOUT','FORAY','FORGE','FORTE','FRAIL','FRANK','FRAUD','FRISK','FROZE','FUNGI',
  'GAUZE','GIDDY','GLAZE','GLEAM','GLINT','GLOAT','GNASH','GORGE','GOUGE','GRACE',
  'GRASP','GRAZE','GRIEF','GRIME','GRIPE','GROPE','GROUT','GROVE','GROWL','GUILE',
  'GUISE','HAVEN','HAZEL','HEIST','HENCE','HOIST','HOVER','HUMID','HYPER','IDYLL',
  'IMPLY','INCUR','INDEX','INEPT','INERT','INFER','INGOT','INLET','IRATE','IRONY',
  'IVORY','JAUNT','JOUST','JULEP','KAYAK','KNACK','KNAVE','KNEEL','KNELT','LADEN',
  'LANCE','LAPSE','LATCH','LEACH','LEASE','LEDGE','LETUP','LEVER','LILAC','LOFTY',
  'LUCID','LUNAR','LUNGE','LYMPH','MACRO','MAIZE','MANOR','MARSH','MAXIM','MELEE',
  'MERGE','MIRTH','MOOSE','MORPH','MOTIF','MOTTO','MOURN','MUDDY','NAIVE','NERVE',
  'NICHE','NOBLE','NOTCH','NOVEL','NUDGE','OASIS','OCCUR','ONSET','OPTIC','ORBIT',
];

// ── WORD SCRAMBLE DATA ──────────────────────────────────────────────────────

export const SCRAMBLE_LITTLE = [
  { word: 'CAT', hint: 'A furry pet that purrs' },
  { word: 'DOG', hint: 'Best friend of humans' },
  { word: 'SUN', hint: 'It shines in the sky' },
  { word: 'HAT', hint: 'You wear it on your head' },
  { word: 'BIG', hint: 'The opposite of small' },
  { word: 'RED', hint: 'The colour of a fire truck' },
  { word: 'RUN', hint: 'Faster than walking' },
  { word: 'BED', hint: 'Where you sleep' },
  { word: 'CUP', hint: 'You drink from this' },
  { word: 'BUS', hint: 'A big vehicle for passengers' },
  { word: 'FISH', hint: 'It swims in water' },
  { word: 'TREE', hint: 'It has leaves and branches' },
  { word: 'FROG', hint: 'A green animal that hops' },
  { word: 'BIRD', hint: 'It can fly in the sky' },
  { word: 'CAKE', hint: 'A sweet treat for birthdays' },
  { word: 'MILK', hint: 'A white drink from cows' },
  { word: 'RAIN', hint: 'Water falling from clouds' },
  { word: 'STAR', hint: 'It twinkles at night' },
  { word: 'BOAT', hint: 'It floats on water' },
  { word: 'BOOK', hint: 'You read stories in this' },
];

export const SCRAMBLE_MIDDLE = [
  { word: 'BEACH', hint: 'Sandy place by the ocean' },
  { word: 'BRAVE', hint: 'Not afraid of anything' },
  { word: 'CLOUD', hint: 'White and fluffy in the sky' },
  { word: 'DREAM', hint: 'What happens when you sleep' },
  { word: 'EAGLE', hint: 'A large bird of prey' },
  { word: 'FLAME', hint: 'The bright part of a fire' },
  { word: 'GIANT', hint: 'Very very big' },
  { word: 'HOUSE', hint: 'Where a family lives' },
  { word: 'JUICE', hint: 'A fruity drink' },
  { word: 'KNIFE', hint: 'A sharp cutting tool' },
  { word: 'LEMON', hint: 'A sour yellow fruit' },
  { word: 'MAGIC', hint: 'Pulling rabbits from hats' },
  { word: 'OCEAN', hint: 'A huge body of salt water' },
  { word: 'PIANO', hint: 'A musical instrument with keys' },
  { word: 'QUEEN', hint: 'A female ruler' },
  { word: 'ROBOT', hint: 'A machine that can move' },
  { word: 'STORM', hint: 'Thunder, lightning, and rain' },
  { word: 'TIGER', hint: 'A big striped cat' },
  { word: 'WORLD', hint: 'Our planet Earth' },
  { word: 'ZEBRA', hint: 'A striped African horse' },
];

export const SCRAMBLE_OLDER = [
  { word: 'ANCHOR', hint: 'Keeps a boat in place' },
  { word: 'BRIDGE', hint: 'Crosses over a river' },
  { word: 'CASTLE', hint: 'A medieval fortress' },
  { word: 'DESERT', hint: 'A dry sandy landscape' },
  { word: 'ENGINE', hint: 'Powers a car or plane' },
  { word: 'FOSSIL', hint: 'Ancient preserved remains' },
  { word: 'GALAXY', hint: 'A system of billions of stars' },
  { word: 'HARBOR', hint: 'Where ships dock safely' },
  { word: 'ISLAND', hint: 'Land surrounded by water' },
  { word: 'JUNGLE', hint: 'A dense tropical forest' },
  { word: 'KNIGHT', hint: 'A medieval warrior in armour' },
  { word: 'LAUNCH', hint: 'To send a rocket up' },
  { word: 'MIRROR', hint: 'You see your reflection in it' },
  { word: 'NATURE', hint: 'The natural world around us' },
  { word: 'OXYGEN', hint: 'The gas we breathe' },
  { word: 'PIRATE', hint: 'A sea robber with an eyepatch' },
  { word: 'RIDDLE', hint: 'A tricky puzzle with words' },
  { word: 'SHADOW', hint: 'A dark shape cast by light' },
  { word: 'THRONE', hint: 'Where a king sits' },
  { word: 'VOYAGE', hint: 'A long journey by sea' },
];

// ── MATHS SPRINT DATA ───────────────────────────────────────────────────────

export type MathsOp = '+' | '-' | 'x';

export function generateMathsQuestion(tier: 'little' | 'middle' | 'older'): { question: string; answer: number } {
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  if (tier === 'little') {
    // Addition and subtraction up to 20
    const op = Math.random() < 0.5 ? '+' : '-';
    if (op === '+') {
      const a = rand(1, 10); const b = rand(1, 10);
      return { question: `${a} + ${b}`, answer: a + b };
    } else {
      const a = rand(5, 20); const b = rand(1, a);
      return { question: `${a} - ${b}`, answer: a - b };
    }
  }

  if (tier === 'middle') {
    // Addition, subtraction, multiplication
    const r = Math.random();
    if (r < 0.33) {
      const a = rand(10, 99); const b = rand(10, 99);
      return { question: `${a} + ${b}`, answer: a + b };
    } else if (r < 0.66) {
      const a = rand(20, 99); const b = rand(10, a);
      return { question: `${a} - ${b}`, answer: a - b };
    } else {
      const a = rand(2, 12); const b = rand(2, 12);
      return { question: `${a} x ${b}`, answer: a * b };
    }
  }

  // Older — harder multiplication, division, mixed
  const r = Math.random();
  if (r < 0.25) {
    const a = rand(50, 999); const b = rand(10, 99);
    return { question: `${a} + ${b}`, answer: a + b };
  } else if (r < 0.5) {
    const a = rand(100, 999); const b = rand(10, a);
    return { question: `${a} - ${b}`, answer: a - b };
  } else if (r < 0.75) {
    const a = rand(5, 25); const b = rand(5, 25);
    return { question: `${a} x ${b}`, answer: a * b };
  } else {
    const b = rand(2, 12); const answer = rand(2, 25); const a = b * answer;
    return { question: `${a} \u00F7 ${b}`, answer };
  }
}

// ── AUSSIE TRIVIA ───────────────────────────────────────────────────────────

export interface TriviaQuestion {
  question: string;
  options: string[];
  correct: number; // index of correct option
}

export const TRIVIA_LITTLE: TriviaQuestion[] = [
  { question: 'What is the capital city of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], correct: 2 },
  { question: 'What animal is on the Australian coat of arms with the emu?', options: ['Koala', 'Kangaroo', 'Wombat', 'Platypus'], correct: 1 },
  { question: 'What colour is the background of the Australian flag?', options: ['Red', 'Blue', 'Green', 'White'], correct: 1 },
  { question: 'What is a baby kangaroo called?', options: ['Cub', 'Joey', 'Pup', 'Kit'], correct: 1 },
  { question: 'Which ocean is on the east coast of Australia?', options: ['Indian', 'Arctic', 'Pacific', 'Atlantic'], correct: 2 },
  { question: 'What Australian animal has a bill like a duck?', options: ['Echidna', 'Platypus', 'Wombat', 'Quokka'], correct: 1 },
  { question: 'What is Vegemite spread on?', options: ['Pasta', 'Rice', 'Toast', 'Cereal'], correct: 2 },
  { question: 'What sport do the Wallabies play?', options: ['Cricket', 'Soccer', 'Rugby', 'Tennis'], correct: 2 },
  { question: 'What is the biggest reef in Australia?', options: ['Ningaloo', 'Great Barrier Reef', 'Gold Coast Reef', 'Sydney Reef'], correct: 1 },
  { question: 'Which Australian animal sleeps up to 22 hours a day?', options: ['Kangaroo', 'Koala', 'Emu', 'Dingo'], correct: 1 },
];

export const TRIVIA_MIDDLE: TriviaQuestion[] = [
  { question: 'What is the largest state by area in Australia?', options: ['Queensland', 'New South Wales', 'Western Australia', 'South Australia'], correct: 2 },
  { question: 'Which Australian city hosted the 2000 Olympics?', options: ['Melbourne', 'Brisbane', 'Sydney', 'Perth'], correct: 2 },
  { question: 'What is the name of the famous rock in central Australia?', options: ['The Rock', 'Uluru', 'Mount Kosciuszko', 'Devils Marbles'], correct: 1 },
  { question: 'How many stars are on the Australian flag?', options: ['5', '6', '7', '8'], correct: 1 },
  { question: 'What Aboriginal instrument makes a deep droning sound?', options: ['Clapsticks', 'Bullroarer', 'Didgeridoo', 'Boomerang'], correct: 2 },
  { question: 'Which Australian cricketer is known as "The Don"?', options: ['Shane Warne', 'Steve Waugh', 'Don Bradman', 'Ricky Ponting'], correct: 2 },
  { question: 'What is the Great Australian Bight?', options: ['A desert', 'A mountain range', 'A section of coastline', 'A river'], correct: 2 },
  { question: 'Which marsupial is known for being the happiest animal?', options: ['Koala', 'Quokka', 'Wallaby', 'Wombat'], correct: 1 },
  { question: 'What year did Australia become a federation?', options: ['1788', '1851', '1901', '1945'], correct: 2 },
  { question: 'Which Australian swimmer won 5 Olympic gold medals?', options: ['Grant Hackett', 'Ian Thorpe', 'Ariarne Titmus', 'Dawn Fraser'], correct: 1 },
];

export const TRIVIA_OLDER: TriviaQuestion[] = [
  { question: 'What percentage of the world\'s species are found only in Australia?', options: ['About 30%', 'About 50%', 'About 70%', 'About 80%'], correct: 3 },
  { question: 'What is the longest river system in Australia?', options: ['Murray-Darling', 'Yarra', 'Swan', 'Brisbane'], correct: 0 },
  { question: 'Which treaty was NOT signed by Australia?', options: ['Paris Agreement', 'Kyoto Protocol', 'Treaty of Waitangi', 'ANZUS Treaty'], correct: 2 },
  { question: 'What is the approximate population of Australia (2025)?', options: ['18 million', '22 million', '27 million', '35 million'], correct: 2 },
  { question: 'Which Australian prime minister disappeared while swimming?', options: ['Robert Menzies', 'Harold Holt', 'Gough Whitlam', 'Bob Hawke'], correct: 1 },
  { question: 'What is the name of the Aboriginal concept of creation?', options: ['Walkabout', 'Corroboree', 'Dreamtime', 'Songline'], correct: 2 },
  { question: 'Which mineral is Australia the world\'s largest exporter of?', options: ['Gold', 'Iron ore', 'Coal', 'Diamonds'], correct: 1 },
  { question: 'What is the name of the wind pattern that brings rain to northern Australia?', options: ['El Nino', 'Trade winds', 'Monsoon', 'Westerlies'], correct: 2 },
  { question: 'Which Australian author wrote "The Magic Pudding"?', options: ['May Gibbs', 'Norman Lindsay', 'Banjo Paterson', 'Henry Lawson'], correct: 1 },
  { question: 'What does ANZAC stand for?', options: ['Australian New Zealand Army Command', 'Australian New Zealand Army Corps', 'Allied Nations Zone Army Corps', 'Australian Naval Zone Army Corps'], correct: 1 },
];

// ── MINI CROSSWORD DATA ─────────────────────────────────────────────────────

export interface CrosswordPuzzle {
  grid: string[][]; // 5x5 grid, '#' for black cells
  acrossClues: { num: number; clue: string; row: number; col: number; length: number }[];
  downClues: { num: number; clue: string; row: number; col: number; length: number }[];
}

export const CROSSWORDS: CrosswordPuzzle[] = [
  {
    grid: [
      ['B','E','A','C','H'],
      ['R','#','N','#','O'],
      ['A','U','T','O','P'],
      ['V','#','S','#','E'],
      ['E','D','G','E','S'],
    ],
    acrossClues: [
      { num: 1, clue: 'Sandy shore', row: 0, col: 0, length: 5 },
      { num: 3, clue: 'A car', row: 2, col: 0, length: 4 },
      { num: 5, clue: 'Borders or sides', row: 4, col: 0, length: 5 },
    ],
    downClues: [
      { num: 1, clue: 'Courageous', row: 0, col: 0, length: 5 },
      { num: 2, clue: 'Insects', row: 0, col: 2, length: 5 },
      { num: 4, clue: 'Desire or wish', row: 0, col: 4, length: 5 },
    ],
  },
  {
    grid: [
      ['S','T','A','R','T'],
      ['H','#','I','#','R'],
      ['A','L','L','O','W'],
      ['R','#','E','#','E'],
      ['K','N','D','L','E'],
    ],
    acrossClues: [
      { num: 1, clue: 'Begin', row: 0, col: 0, length: 5 },
      { num: 3, clue: 'Permit', row: 2, col: 0, length: 5 },
      { num: 5, clue: 'Light a fire', row: 4, col: 0, length: 5 },
    ],
    downClues: [
      { num: 1, clue: 'A type of fish', row: 0, col: 0, length: 5 },
      { num: 2, clue: 'Ventilated', row: 0, col: 2, length: 5 },
      { num: 4, clue: 'A large tree', row: 0, col: 4, length: 5 },
    ],
  },
];

// Helper: get crossword for this week (rotates through available puzzles)
export function getWeeklyCrossword(): CrosswordPuzzle {
  const now = new Date();
  const weekNum = Math.floor((now.getTime() - new Date('2026-01-01').getTime()) / (7 * 86400000));
  return CROSSWORDS[weekNum % CROSSWORDS.length];
}

// Helper: scramble a word
export function scrambleWord(word: string): string {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Ensure it's actually different from the original
  if (arr.join('') === word) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr.join('');
}
