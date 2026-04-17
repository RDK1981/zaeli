/**
 * Zaeli Tutor — Australian Curriculum v9.0 Data
 * app/(tabs)/tutor-curriculum.ts
 *
 * Source: ACARA Australian Curriculum Version 9.0
 * Covers Foundation to Year 12 across Maths, English, Science, HASS.
 *
 * Used by tutor-session.tsx to inject year-level + subject specific
 * curriculum content into the Sonnet system prompt.
 *
 * Three difficulty bands per year:
 *   Foundation = below standard (still age-appropriate)
 *   Core = achievement standard (C grade, default)
 *   Extension = above standard (overlaps next year level)
 */

// ══════════════════════════════════════════════════
// MATHEMATICS — Foundation to Year 12
// ══════════════════════════════════════════════════

export const MATHS_CURRICULUM: Record<string, {
  numberAlgebra: string;
  measurementSpace: string;
  statisticsProbability: string;
  examples: { foundation?: string; core: string; extension?: string };
  naplan?: boolean;
}> = {
  'Foundation': {
    numberAlgebra: 'Count to 20, subitise small collections, compare quantities using more/less, represent numbers using objects and drawings. Simple addition using objects.',
    measurementSpace: 'Compare and order objects by length, mass, capacity using direct comparison. Describe position using everyday language (next to, behind, under).',
    statisticsProbability: 'Sort and classify objects by one attribute. Collect data by asking simple questions. Create picture displays.',
    examples: {
      foundation: 'Show me 7 buttons. Which pile has more — 4 or 6?',
      core: 'There are 3 red apples and 4 green apples. How many altogether?',
      extension: 'I have 10 stickers. I give away 4. How many do I have left?',
    },
  },
  'Year 1': {
    numberAlgebra: 'Numbers to 120, partition into tens and ones. Add and subtract within 20 using part-part-whole. Skip count by 2s, 5s, 10s. Equal sharing and grouping. Simple money transactions.',
    measurementSpace: 'Measure length using informal units. Compare and order by length, mass, capacity, duration. Recognise and classify 2D shapes and 3D objects.',
    statisticsProbability: 'Collect and record categorical data. Create one-to-one displays. Compare data using frequencies.',
    examples: {
      foundation: '8 + 5 = ? (using a number line)',
      core: 'There are 14 birds on a fence. 6 fly away. How many are left?',
      extension: 'Skip count by 5s from 35 to 70. What numbers do you land on?',
    },
  },
  'Year 2': {
    numberAlgebra: 'Numbers to 1000. Add and subtract 2-digit numbers. Multiply using equal groups, arrays. Divide using equal sharing. Recognise fractions 1/2, 1/4, 1/8. Represent money values.',
    measurementSpace: 'Measure and compare lengths in centimetres and metres. Tell time to the quarter hour. Interpret simple maps and grids.',
    statisticsProbability: 'Collect data using tally marks. Create and interpret simple graphs. Describe chance using everyday language.',
    examples: {
      core: 'A bag of 24 grapes is shared equally among 4 friends. How many does each get?',
      extension: 'An item costs $3.75. You pay $5.00. What change do you get?',
    },
  },
  'Year 3': {
    numberAlgebra: 'Numbers to 10,000. Multiplication facts to 10x10. Divide with remainders. Fractions on a number line. Add and subtract 3-digit numbers using formal strategies.',
    measurementSpace: 'Measure perimeter. Tell time to the minute. Use am/pm. Read and interpret scales. Identify symmetry.',
    statisticsProbability: 'Conduct chance experiments. Represent data using tables, column graphs. Describe likelihood.',
    examples: {
      core: 'A school has 248 students. 127 are girls. How many boys?',
      extension: 'What is 2/3 of 24? Explain your method.',
    },
    naplan: true,
  },
  'Year 4': {
    numberAlgebra: 'Numbers to 100,000. Multiply 2-digit x 2-digit. Long division intro. Equivalent fractions. Decimals to tenths. Multiply by 10, 100. Financial contexts.',
    measurementSpace: 'Area of rectangles using cm2 and m2. Convert between units. Angles: right, acute, obtuse. Grid references.',
    statisticsProbability: 'Conduct and record experiments. Use fractions to describe probability. Interpret and compare data sets.',
    examples: {
      core: 'A cinema has 21 screens, each with 297 seats. How many seats altogether?',
      extension: 'Write 3/4 as a decimal. Place it on a number line between 0 and 1.',
    },
  },
  'Year 5': {
    numberAlgebra: 'Numbers to millions. Multiply and divide decimals. Percentages. Prime and composite numbers. Factors and multiples. Fractions: add and subtract with related denominators.',
    measurementSpace: 'Area of triangles and parallelograms. Volume of rectangular prisms. 24-hour time. Coordinates in the first quadrant.',
    statisticsProbability: 'Mean, median, mode intro. Line graphs. Probability 0-1 scale. Conduct and compare experiments.',
    examples: {
      core: 'A jacket costs $85. It is 20% off. What is the sale price?',
      extension: 'Find all factor pairs of 36. Which factors are also prime numbers?',
    },
    naplan: true,
  },
  'Year 6': {
    numberAlgebra: 'Fractions: all operations, including dividing by whole numbers. Ratios and rates. Integers intro. Order of operations. Patterns and rules using variables.',
    measurementSpace: 'Area and perimeter of composite shapes. Volume and capacity. Cartesian plane (all four quadrants). Transformations.',
    statisticsProbability: 'Mean from grouped data. Misleading graphs. Probability of complementary events. Data investigations.',
    examples: {
      core: 'Ella earns $8.40/hour. How much for 3.5 hours? Show working.',
      extension: 'Simplify: 3 + 4 x (8 - 2) / 3. Explain the order of operations used.',
    },
  },
  'Year 7': {
    numberAlgebra: 'Integers and rational numbers. Index notation. Algebraic expressions — formulate and evaluate. Solve simple linear equations. Financial contexts: profit/loss, simple interest.',
    measurementSpace: 'Area and perimeter of circles. Volume of prisms. Scale drawings. Angles in parallel lines.',
    statisticsProbability: 'Census vs sample. Dot plots and stem-and-leaf plots. Experimental vs theoretical probability.',
    examples: {
      core: 'Solve: 3x + 7 = 22. Show each step.',
      extension: 'A $2,000 investment earns 5% simple interest per year. How much after 3 years?',
    },
    naplan: true,
  },
  'Year 8': {
    numberAlgebra: 'Rational and irrational numbers. Index laws. Expand and factorise linear expressions. Linear equations and inequalities. Gradient and y-intercept. Financial: compound interest.',
    measurementSpace: 'Pythagoras theorem. Congruence and similarity. Surface area and volume of prisms and cylinders. Coordinate geometry.',
    statisticsProbability: 'Measures of spread: range, IQR. Box plots. Two-way tables. Combined events probability.',
    examples: {
      core: 'Expand and simplify: 3(2x - 4) + 2(x + 5)',
      extension: 'A right triangle has legs of 9 cm and 12 cm. Find the hypotenuse.',
    },
  },
  'Year 9': {
    numberAlgebra: 'Rational and irrational numbers. Extend index laws to variables. Expand binomials. Factorise monic quadratics. Linear and quadratic functions. Financial modelling.',
    measurementSpace: 'Trigonometry: sin, cos, tan in right triangles. Similarity and scale. Direct proportion problems.',
    statisticsProbability: 'Scatter plots and lines of best fit. Relative frequency. Conditional probability intro.',
    examples: {
      core: 'Solve: 3(2x - 4) = 2(x + 6). Show full working.',
      extension: 'Factorise: x2 + 5x + 6. Then solve x2 + 5x + 6 = 0.',
    },
    naplan: true,
  },
  'Year 10': {
    numberAlgebra: 'Real numbers, surds. Polynomials. Quadratic formula. Exponential functions. Financial maths: annuities, loans. Networks intro.',
    measurementSpace: 'Circle geometry. Trigonometry in non-right triangles (sine rule, cosine rule). 3D problems with trigonometry.',
    statisticsProbability: 'Bivariate data analysis. Regression lines. Hypothesis testing intro. Probability distributions.',
    examples: {
      core: 'Use the quadratic formula to solve: 2x2 - 5x - 3 = 0',
      extension: 'A loan of $15,000 at 6% p.a. compounded monthly. Find the balance after 2 years.',
    },
  },
  'Year 11': {
    numberAlgebra: 'General: Consumer arithmetic, statistics, measurement, networks, financial literacy (tax, super, loans). Methods: Functions, calculus (differentiation + integration), exponential/logarithmic functions, probability distributions. Specialist: Complex numbers, vectors, advanced calculus, mechanics, proof.',
    measurementSpace: 'Methods: Continuous probability distributions, rates of change. Specialist: Vector geometry, kinematics.',
    statisticsProbability: 'Methods: Discrete and continuous distributions, sampling. General: Data analysis and interpretation.',
    examples: {
      core: 'Differentiate f(x) = 3x4 - 2x2 + 5. Find f\'(2).',
    },
  },
  'Year 12': {
    numberAlgebra: 'Methods: Integration, differential equations applications, logarithmic/exponential modelling. Specialist: Complex number operations, vector calculus, mathematical induction. General: Loans, annuities, networks, earth geometry.',
    measurementSpace: 'Specialist: 3D vectors and applications. General: Surveying and navigation.',
    statisticsProbability: 'Methods: Statistical inference, confidence intervals. Specialist: Hypothesis testing.',
    examples: {
      core: 'Find the area under the curve y = x2 + 1 from x = 0 to x = 3.',
    },
  },
};


// ══════════════════════════════════════════════════
// ENGLISH — Foundation to Year 12
// ══════════════════════════════════════════════════

export const ENGLISH_CURRICULUM: Record<string, {
  reading: string;
  writing: string;
  speaking: string;
  examples: { core: string; extension?: string };
  naplan?: boolean;
}> = {
  'Foundation': {
    reading: 'Recognise letters and sounds. Phonemic awareness: rhyme, alliteration. Read simple CVC words (cat, dog, run). Understand that print carries meaning.',
    writing: 'Write letters, own name. Copy simple words. Write labels and captions. Use spaces between words.',
    speaking: 'Listen to and retell simple stories. Use complete sentences. Follow 2-step instructions.',
    examples: {
      core: 'What sound does the letter "b" make? Find something in the picture that starts with "b".',
    },
  },
  'Year 1': {
    reading: 'Decode using phonics — consonant blends (bl, cr, st), digraphs (sh, ch, th). Read simple sentences. Identify characters and settings in stories. Sight words to 100.',
    writing: 'Write simple sentences with capital letters and full stops. Use describing words. Recount events in sequence.',
    speaking: 'Retell stories with beginning, middle, end. Speak in full sentences. Ask and answer questions.',
    examples: {
      core: 'Read: "The black dog ran fast." Which word describes the dog? What was the dog doing?',
      extension: 'Why do you think the dog was running? What might happen next in the story?',
    },
  },
  'Year 2': {
    reading: 'Read texts with varied sentence structures. Identify the main idea. Make predictions and inferences. Understand text features (headings, captions, diagrams).',
    writing: 'Write recounts, simple narratives and informative texts. Use adjectives, verb tenses, conjunctions (because, but, so). Edit for punctuation.',
    speaking: 'Present a short prepared speech. Listen and respond to others. Give and follow multi-step instructions.',
    examples: {
      core: 'Read the passage about penguins. What is the main idea? List two facts you learned.',
    },
  },
  'Year 3': {
    reading: 'Read chapter books and non-fiction. Identify point of view. Compare characters across texts. Use context clues for unknown vocabulary. Understand text structure.',
    writing: 'Write narratives with developed characters. Persuasive texts with a clear argument. Use paragraphs. Accurate spelling of common words.',
    speaking: 'Present information clearly. Use eye contact and appropriate pace. Participate in class discussions.',
    examples: {
      core: 'The author wrote this text to [inform / entertain / persuade]. Which one? Use two examples from the text to explain.',
      extension: 'How does the author use words like "finally" and "unfortunately" to guide the reader? What effect does this have?',
    },
    naplan: true,
  },
  'Year 4': {
    reading: 'Analyse how language choices create mood. Identify themes. Compare different types of texts on the same topic. Summarise main ideas.',
    writing: 'Extended narratives and persuasive essays. Use complex sentences, similes, metaphors. Vary sentence structure for effect. Proofread independently.',
    speaking: 'Structured debate. Listen and identify key arguments. Adjust language for different audiences.',
    examples: {
      core: 'The author says the old house was "a sleeping giant." What does this mean? Why is it more effective than just saying "it was big"?',
    },
  },
  'Year 5': {
    reading: 'Identify explicit and implicit meaning. Analyse author purpose. Compare perspectives in informative texts. Evaluate reliability of sources.',
    writing: 'Persuasive essays with evidence and counter-argument. Narrative with developed plot arc. Formal and informal registers. Use of cohesive devices.',
    speaking: 'Multimedia presentations. Evaluate spoken texts. Identify bias and missing perspectives.',
    examples: {
      core: 'The article argues that school uniforms should be compulsory. Identify two arguments the author uses and evaluate how convincing they are.',
      extension: 'Write a counter-argument paragraph for the position that uniforms should NOT be compulsory. Use at least one piece of evidence.',
    },
    naplan: true,
  },
  'Year 6': {
    reading: 'Close reading: analyse how structural choices affect meaning. Evaluate texts for bias. Identify irony and satire. Comparative analysis of two texts.',
    writing: 'Analytical essays responding to literature. Sustained narratives. Varied sentence types for stylistic effect. Consistent voice and register.',
    speaking: 'Formal oral presentations with research. Active listening and constructive feedback.',
    examples: {
      core: 'Compare how two different authors describe the same theme of courage in their stories. What techniques do they use?',
    },
  },
  'Year 7': {
    reading: 'Analyse literary devices: symbolism, foreshadowing, irony. Evaluate how texts construct reality. Identify and critique perspective and bias in media texts.',
    writing: 'Analytical and persuasive essays. Formal writing conventions. Develop a clear thesis. Evidence-based paragraphs using PEEL or similar.',
    speaking: 'Formal debates. Speeches on social issues. Evaluate arguments and identify fallacies.',
    examples: {
      core: 'What is the effect of the author choice to use first-person narration in this story? How would the story change if it were third person?',
      extension: 'The story ends ambiguously. Analyse how the author uses this technique — what does it make the reader feel and why might the author have chosen it?',
    },
    naplan: true,
  },
  'Year 8': {
    reading: 'Analyse text structures and language features for effect. Evaluate ethical positions presented in texts. Close analysis of poetry, film and non-fiction.',
    writing: 'Extended analytical essays. Creative writing demonstrating control of style. Research-based reports. Precise academic vocabulary.',
    speaking: 'Oral arguments with evidence. Analysis of multimodal texts. Evaluate and give constructive feedback to peers.',
    examples: {
      core: 'Analyse how the poet uses rhythm and rhyme in this poem to reinforce its meaning. Give specific examples.',
    },
  },
  'Year 9': {
    reading: 'Critical analysis of complex texts. Evaluate how context influences text production and interpretation. Identify ideologies embedded in texts. Unseen text analysis.',
    writing: 'Extended responses to literature. Sustained persuasive writing. Synthesis across multiple sources. Academic register and conventions.',
    speaking: 'Formal seminars. Scripted and impromptu speeches. Critical listening — deconstruct rhetoric.',
    examples: {
      core: 'Analyse how Orwell uses the character of Boxer in Animal Farm to critique blind loyalty. Use two pieces of textual evidence.',
      extension: 'Compare Orwell critique of totalitarianism in Animal Farm with that in 1984. What different techniques does he use and why?',
    },
    naplan: true,
  },
  'Year 10': {
    reading: 'Literary criticism. Comparative analysis across texts, contexts and cultures. Unseen text analysis under timed conditions. Evaluate stylistic and structural choices.',
    writing: 'Extended analytical essays with sophisticated argument. Creative responses to literature. Multimodal projects. Research essays with citations.',
    speaking: 'Formal extended speeches. Group seminars. Analyse and critique spoken texts including political speeches and media.',
    examples: {
      core: 'In 2-3 sentences, explain how the author of your set text uses setting to reflect the protagonist internal conflict.',
    },
  },
};


// ══════════════════════════════════════════════════
// SCIENCE — Foundation to Year 10
// ══════════════════════════════════════════════════

export const SCIENCE_CURRICULUM: Record<string, {
  biological: string;
  chemicalPhysical: string;
  earthSpace: string;
  examples: { core: string; extension?: string };
}> = {
  'Foundation-Year 2': {
    biological: 'Living vs non-living. Basic needs of plants and animals (water, food, sunlight). Observable features of animals. Seasonal changes in plants and animals.',
    chemicalPhysical: 'Properties of materials: hard/soft, rough/smooth, transparent/opaque. Objects can be made of different materials. Push and pull forces.',
    earthSpace: 'Observable features of the sky: sun, moon, stars. Weather changes. Seasons in Australia.',
    examples: {
      core: 'A rock, a leaf and a pencil are on your desk. Which is living? Which was once living? Which was never living?',
    },
  },
  'Year 3-4': {
    biological: 'Food chains and food webs. Adaptations of Australian animals. Life cycles: insects, frogs, plants. Ecosystems and habitats.',
    chemicalPhysical: 'Heat transfer: conduction, convection, radiation. Properties of solids, liquids, gases. Reversible vs irreversible changes. Electricity and circuits.',
    earthSpace: 'Earth layers. Rocks and minerals. Fossils and geological time. Water cycle.',
    examples: {
      core: 'Draw a food chain with at least 4 organisms from an Australian grassland. Label the producer and consumers.',
      extension: 'If the grasshoppers in this food chain were removed by a disease, predict what would happen to the grass and the eagles. Explain your reasoning.',
    },
  },
  'Year 5-6': {
    biological: 'Body systems: circulatory, respiratory, digestive, skeletal. Reproduction in plants and animals. Microorganisms and disease. Biodiversity and classification.',
    chemicalPhysical: 'Physical and chemical changes. Properties of acids and bases (litmus). Forces: gravity, friction, air resistance. Electrical energy and circuits.',
    earthSpace: 'Solar system. Earth tilt and seasons. Renewable and non-renewable energy sources. Climate and weather patterns in Australia.',
    examples: {
      core: 'Explain how the circulatory and respiratory systems work together to deliver oxygen to your muscles during exercise.',
    },
  },
  'Year 7-8': {
    biological: 'Cells: structure and function (plant vs animal). Genetics intro: chromosomes and DNA. Classification of organisms: kingdoms, domains. Photosynthesis and cellular respiration.',
    chemicalPhysical: 'Atoms and elements. Periodic table basics. Chemical reactions: reactants, products, equations. Particle model of matter. Density. Wave properties: light and sound.',
    earthSpace: 'Plate tectonics. Earthquakes and volcanoes. Rock cycle. Atmosphere layers and composition.',
    examples: {
      core: 'What is the difference between a plant cell and an animal cell? Name two structures found only in plant cells.',
      extension: 'Write the word equation for photosynthesis. Explain what would happen to a plant kept in total darkness for 2 weeks.',
    },
  },
  'Year 9-10': {
    biological: 'Genetics: Mendelian inheritance, Punnett squares, dominant/recessive. Evolution: natural selection, evidence. Ecosystems: energy flow, nutrient cycling.',
    chemicalPhysical: 'Chemical equations (balancing). Acids and bases: pH scale, neutralisation. Motion: speed, velocity, acceleration, Newton laws. Electricity: Ohm law, circuits.',
    earthSpace: 'Cosmology: Big Bang, stellar evolution. Earth science: global climate systems. Geologic time.',
    examples: {
      core: 'A parent with blood type A (heterozygous) and a parent with blood type B (heterozygous) have children. Use a Punnett square to show the possible blood types.',
      extension: 'Balance this equation: H2 + O2 -> H2O. How many molecules of water are produced from 4 molecules of hydrogen?',
    },
  },
};


// ══════════════════════════════════════════════════
// HASS — Foundation to Year 10
// ══════════════════════════════════════════════════

export const HASS_CURRICULUM: Record<string, {
  history: string;
  geography: string;
  civicsEconomics: string;
  examples: { core: string; extension?: string };
}> = {
  'Foundation-Year 2': {
    history: 'Personal and family history. How life has changed. Significance of places in the local community. Aboriginal and Torres Strait Islander Peoples connection to Country.',
    geography: 'Features of local places: natural and built. Weather and seasons. Maps: symbols and directions. Australia continents and oceans.',
    civicsEconomics: 'Rules and their purposes. Community helpers. Needs vs wants. Simple transactions using Australian money.',
    examples: {
      core: 'What is one way life in Australia is different now compared to when your grandparents were young? Give an example.',
    },
  },
  'Year 3-4': {
    history: 'First Australians: at least 65,000 years of continuous culture. British colonisation and its impact on Aboriginal peoples. Significant events in Australian history (gold rush, federation).',
    geography: 'Australia states and territories. Climate zones in Australia. Human and environmental interdependence. World regions and physical features.',
    civicsEconomics: 'How communities make decisions. Local, state and federal government roles. Producers, consumers, supply and demand basics.',
    examples: {
      core: 'Aboriginal and Torres Strait Islander peoples have lived in Australia for at least 65,000 years. Name one way their culture is still present in Australian life today.',
    },
  },
  'Year 5-6': {
    history: 'Colonial Australia: convicts, free settlers, impact on First Nations peoples. Immigration and the making of modern Australia. Key Australian figures and events.',
    geography: 'Australia biomes and ecosystems. Environmental challenges: deforestation, drought, coral bleaching. Australia place in the Asia-Pacific region.',
    civicsEconomics: 'Australian democracy: three levels of government, separation of powers. Rights and responsibilities. Trade and Australia economy. Work and income.',
    examples: {
      core: 'Describe two ways the arrival of British settlers affected Aboriginal Australians. Use historical terms like "dispossession" and "resistance" in your answer.',
      extension: 'Why is Australia relationship with Asia important for our economy? Give two specific examples of trade relationships.',
    },
  },
  'Year 7-8': {
    history: 'Ancient civilisations: Egypt, Greece, Rome, China. Medieval world. The Vikings. Contact and conflict between civilisations. Australia: 1788 to Federation.',
    geography: 'Urbanisation and population distribution. Geographical inquiry methods: fieldwork, data analysis. Water as a global resource. Place and liveability.',
    civicsEconomics: 'Australian Constitution. How laws are made. Citizens rights and responsibilities. Role of the media in democracy. Government budgets and taxation basics.',
    examples: {
      core: 'Describe two features of Ancient Athenian democracy. How is it similar to and different from Australian democracy today?',
    },
  },
  'Year 9-10': {
    history: 'World War I and II — causes, key events, Australian involvement, impact. The Holocaust. Cold War. Modern Australia: rights movements, reconciliation, globalisation.',
    geography: 'Global environmental challenges. Development and inequality. Geopolitics. Australia role in global issues.',
    civicsEconomics: 'Economics: market systems, role of government, economic indicators (GDP, unemployment, inflation). Financial literacy: tax, superannuation, investing. Civics: judicial system, international law.',
    examples: {
      core: 'Explain two causes of World War I. How did the assassination at Sarajevo trigger a wider conflict involving so many countries?',
      extension: 'What is superannuation and why does the Australian government require employers to contribute to it? What would happen to retirement outcomes without this system?',
    },
  },
};


// ══════════════════════════════════════════════════
// MONEY & LIFE — Progressive levels
// ══════════════════════════════════════════════════

export const MONEY_LEVELS: Record<number, {
  name: string;
  yearRange: string;
  topics: string;
  examples: string;
}> = {
  1: {
    name: 'Earning & Spending',
    yearRange: 'Years 3-5',
    topics: 'Wages and pocket money. What is GST and why is it 10%? Budgeting basics: needs vs wants. Reading a price tag. Making change with Australian coins and notes. Unit pricing at the supermarket.',
    examples: 'You earn $12 pocket money per week. You want a game that costs $45. How many weeks do you need to save? What if you spent $3 on snacks each week?',
  },
  2: {
    name: 'Saving & Banking',
    yearRange: 'Years 5-8',
    topics: 'How banks work. Savings accounts vs transaction accounts. Interest: how banks pay you to save. Compound interest — money earning money. ANZ, CommBank, Westpac, NAB — real Australian banks. Online banking and security.',
    examples: 'You put $500 in an ANZ savings account earning 4% interest per year. How much do you have after one year? After 5 years with compound interest?',
  },
  3: {
    name: 'Investing & Super',
    yearRange: 'Years 8-12',
    topics: 'The ASX (Australian Securities Exchange). What is a share? Dividends. Risk vs return. Diversification. Superannuation: what it is, how 11.5% works, compound growth over 40 years. ETFs and index funds.',
    examples: 'Your employer pays 11.5% super on your $55,000 salary. How much goes into super each year? If it grows at 7% p.a. for 40 years, estimate the final balance.',
  },
  4: {
    name: 'Big Life Decisions',
    yearRange: 'Years 10-12',
    topics: 'Mortgages: how home loans work in Australia. LVR, interest rates, repayments. Credit cards and debt traps. HECS-HELP: university debt in Australia. Insurance: car, health, home/contents. Tax: income tax brackets, Medicare levy, tax returns.',
    examples: 'A house costs $650,000. You have a 20% deposit. What is the loan amount? At 6% interest over 30 years, estimate your monthly repayment.',
  },
};


// ══════════════════════════════════════════════════
// DIFFICULTY BAND RULES
// ══════════════════════════════════════════════════

export const DIFFICULTY_RULES = `
ADAPTIVE DIFFICULTY RULES — apply these silently during sessions:

Starting band: Use the child's stored band for this subject. Default is Core if no prior data.

UPGRADE to next band:
- 3 correct answers in a row with no hints used → silently increase difficulty
- Say something like "You're flying through these — let me give you a trickier one"

STAY at current band:
- Wrong once → encourage and let them try again
- Wrong twice on same question → automatically provide Hint 2 (first step of their actual question)
- Say: "Let me show you a technique that might help"

DOWNGRADE to lower band:
- Wrong 3 times on same question → provide full worked example (Hint 3), drop 1 level for next question
- Say: "Let's look at this one together — no stress, this is how you learn"
- 2 consecutive wrong at Foundation band → pause, check understanding, switch topic
- Say: "Let's come back to this one. Can you tell me what you already know about [topic]?"

FLAG for parent:
- 5 correct at Extension → note in session: "working above year level"
- Say: "Really impressive work today. You're handling Year [X+1] level questions"

At session end: Store the final difficulty band for next session's starting point.
`;


// ══════════════════════════════════════════════════
// HINT SYSTEM RULES
// ══════════════════════════════════════════════════

export const HINT_RULES = `
THREE-LEVEL PROGRESSIVE HINT SYSTEM:

Hint 1 — Technique only:
- Show the METHOD on a DIFFERENT equation/example
- NEVER use numbers from the child's actual question
- Example: "Here's how decimal multiplication works: 4.5 x 3 = 4 x 3 + 0.5 x 3 = 12 + 1.5 = 13.5. Now you try with your numbers."

Hint 2 — First step only:
- Show the FIRST STEP of their actual question, then stop
- Do NOT show the answer or any steps beyond step 1
- Example: "Your question is 8.40 x 3.5. First, split the 3.5 into 3 + 0.5. So you need to work out 8.40 x 3, and 8.40 x 0.5 separately. Can you do the first one?"

Hint 3 — Full worked example:
- Complete worked solution with explanation
- Frame as learning together, not giving up
- Example: "Let's look at this one together: 8.40 x 3 = 25.20, then 8.40 x 0.5 = 4.20. Add them: 25.20 + 4.20 = $29.40. See how we split it? Try the next one yourself."

IMPORTANT: Track which hint level was used per question. This data goes to the parent review.
`;


// ══════════════════════════════════════════════════
// HELPER: Get curriculum content for system prompt
// ══════════════════════════════════════════════════

function yearKey(yearLevel: number): string {
  if (yearLevel === 0) return 'Foundation';
  return `Year ${yearLevel}`;
}

function scienceKey(yearLevel: number): string {
  if (yearLevel <= 2) return 'Foundation-Year 2';
  if (yearLevel <= 4) return 'Year 3-4';
  if (yearLevel <= 6) return 'Year 5-6';
  if (yearLevel <= 8) return 'Year 7-8';
  return 'Year 9-10';
}

function hassKey(yearLevel: number): string {
  if (yearLevel <= 2) return 'Foundation-Year 2';
  if (yearLevel <= 4) return 'Year 3-4';
  if (yearLevel <= 6) return 'Year 5-6';
  if (yearLevel <= 8) return 'Year 7-8';
  return 'Year 9-10';
}

export function getCurriculumPrompt(yearLevel: number, subject: string, topic?: string): string {
  const yr = yearKey(yearLevel);
  const isNaplan = [3, 5, 7, 9].includes(yearLevel);

  if (subject === 'Maths') {
    const data = MATHS_CURRICULUM[yr];
    if (!data) return `Year ${yearLevel} Mathematics — Australian Curriculum v9.0.`;
    return `AUSTRALIAN CURRICULUM v9.0 — YEAR ${yearLevel} MATHEMATICS
${isNaplan ? '** THIS IS A NAPLAN YEAR — include NAPLAN-style question formats **\n' : ''}
Number & Algebra: ${data.numberAlgebra}

Measurement & Space: ${data.measurementSpace}

Statistics & Probability: ${data.statisticsProbability}

${topic ? `FOCUS TOPIC: ${topic}\n` : ''}
EXAMPLE QUESTIONS AT EACH BAND:
${data.examples.foundation ? `Foundation: "${data.examples.foundation}"` : ''}
Core: "${data.examples.core}"
${data.examples.extension ? `Extension: "${data.examples.extension}"` : ''}

For Maths above Year 3: after questions requiring working, prompt the child to "show your working" via photo upload. Analyse the METHOD, not just the final answer.`;
  }

  if (subject === 'English') {
    const data = ENGLISH_CURRICULUM[yr];
    if (!data) return `Year ${yearLevel} English — Australian Curriculum v9.0.`;
    return `AUSTRALIAN CURRICULUM v9.0 — YEAR ${yearLevel} ENGLISH
${isNaplan ? '** THIS IS A NAPLAN YEAR — include NAPLAN-style question formats **\n' : ''}
Reading & Comprehension: ${data.reading}

Writing & Language: ${data.writing}

Speaking & Listening: ${data.speaking}

${topic ? `FOCUS TOPIC: ${topic}\n` : ''}
EXAMPLE QUESTIONS:
Core: "${data.examples.core}"
${data.examples.extension ? `Extension: "${data.examples.extension}"` : ''}`;
  }

  if (subject === 'Science') {
    const key = scienceKey(yearLevel);
    const data = SCIENCE_CURRICULUM[key];
    if (!data) return `Year ${yearLevel} Science — Australian Curriculum v9.0.`;
    return `AUSTRALIAN CURRICULUM v9.0 — YEAR ${yearLevel} SCIENCE

Biological Sciences: ${data.biological}

Chemical & Physical Sciences: ${data.chemicalPhysical}

Earth & Space Sciences: ${data.earthSpace}

${topic ? `FOCUS TOPIC: ${topic}\n` : ''}
EXAMPLE QUESTIONS:
Core: "${data.examples.core}"
${data.examples.extension ? `Extension: "${data.examples.extension}"` : ''}`;
  }

  if (subject === 'HASS') {
    const key = hassKey(yearLevel);
    const data = HASS_CURRICULUM[key];
    if (!data) return `Year ${yearLevel} HASS — Australian Curriculum v9.0.`;
    return `AUSTRALIAN CURRICULUM v9.0 — YEAR ${yearLevel} HASS (Humanities and Social Sciences)

History: ${data.history}

Geography: ${data.geography}

Civics & Citizenship / Economics: ${data.civicsEconomics}

${topic ? `FOCUS TOPIC: ${topic}\n` : ''}
EXAMPLE QUESTIONS:
Core: "${data.examples.core}"
${data.examples.extension ? `Extension: "${data.examples.extension}"` : ''}

IMPORTANT: All examples and contexts must be Australian — Australian history, Australian geography, Australian civics, AUD currency.`;
  }

  return `Year ${yearLevel} ${subject} — Australian Curriculum v9.0.`;
}

export function getMoneyLevelPrompt(level: number): string {
  const data = MONEY_LEVELS[level];
  if (!data) return 'Australian financial literacy.';
  return `MONEY & LIFE — Level ${level}: ${data.name} (${data.yearRange})

Topics to cover: ${data.topics}

Example question style: "${data.examples}"

IMPORTANT: Use REAL Australian examples — ANZ, CommBank, Woolworths, Coles, ASX, AUD currency. Make it feel real and relevant, not textbook.`;
}


// ══════════════════════════════════════════════════
// TOPIC CHIPS — year-level-aware suggestions
// ══════════════════════════════════════════════════

// Topic chips — lead with Core-level content kids are most likely doing at school.
// Extension topics (Decimals, Long division etc.) served via "Zaeli picks" or when child reaches Extension band.
const MATHS_TOPICS: Record<string, string[]> = {
  'Foundation': ['Counting', 'More or less', 'Shapes', 'Zaeli picks'],
  'Year 1': ['Adding', 'Subtracting', 'Skip counting', 'Zaeli picks'],
  'Year 2': ['Times tables', 'Addition', 'Sharing equally', 'Zaeli picks'],
  'Year 3': ['Multiplication', 'Division', 'Place value', 'Zaeli picks'],
  'Year 4': ['Times tables', 'Multiplication', 'Division', 'Zaeli picks'],
  'Year 5': ['Fractions', 'Decimals', 'Multiplication', 'Zaeli picks'],
  'Year 6': ['Fractions', 'Decimals', 'Order of operations', 'Zaeli picks'],
  'Year 7': ['Algebra', 'Integers', 'Fractions', 'Zaeli picks'],
  'Year 8': ['Linear equations', 'Index laws', 'Pythagoras', 'Zaeli picks'],
  'Year 9': ['Trigonometry', 'Quadratics', 'Linear functions', 'Zaeli picks'],
  'Year 10': ['Quadratic formula', 'Surds', 'Financial maths', 'Zaeli picks'],
  'Year 11': ['Differentiation', 'Functions', 'Probability', 'Zaeli picks'],
  'Year 12': ['Integration', 'Statistics', 'Logarithms', 'Zaeli picks'],
};

const ENGLISH_TOPICS: Record<string, string[]> = {
  'Foundation': ['Letter sounds', 'Sight words', 'Story retelling', 'Zaeli picks'],
  'Year 1': ['Phonics', 'Sight words', 'Reading sentences', 'Zaeli picks'],
  'Year 2': ['Reading comprehension', 'Writing sentences', 'Spelling', 'Zaeli picks'],
  'Year 3': ['Comprehension', 'Paragraphs', 'Vocabulary', 'Zaeli picks'],
  'Year 4': ['Reading comprehension', 'Writing paragraphs', 'Spelling', 'Zaeli picks'],
  'Year 5': ['Author purpose', 'Persuasive writing', 'Vocabulary', 'Zaeli picks'],
  'Year 6': ['Comprehension', 'Analytical writing', 'Text comparison', 'Zaeli picks'],
  'Year 7': ['Literary devices', 'PEEL paragraphs', 'Persuasive writing', 'Zaeli picks'],
  'Year 8': ['Poetry analysis', 'Creative writing', 'Essay structure', 'Zaeli picks'],
  'Year 9': ['Critical analysis', 'Rhetoric', 'Unseen text', 'Zaeli picks'],
  'Year 10': ['Literary criticism', 'Comparative essays', 'Research writing', 'Zaeli picks'],
};

const SCIENCE_TOPICS: Record<string, string[]> = {
  'Foundation': ['Living things', 'Materials', 'Weather', 'Zaeli picks'],
  'Year 1': ['Plants and animals', 'Push and pull', 'Seasons', 'Zaeli picks'],
  'Year 2': ['Life cycles', 'Materials', 'Water', 'Zaeli picks'],
  'Year 3': ['Food chains', 'Solids liquids gases', 'Rocks', 'Zaeli picks'],
  'Year 4': ['Habitats', 'Electricity', 'Water cycle', 'Zaeli picks'],
  'Year 5': ['Body systems', 'Forces', 'Solar system', 'Zaeli picks'],
  'Year 6': ['Classification', 'Chemical changes', 'Renewable energy', 'Zaeli picks'],
  'Year 7': ['Cells', 'Elements and atoms', 'Plate tectonics', 'Zaeli picks'],
  'Year 8': ['Genetics intro', 'Chemical reactions', 'Waves', 'Zaeli picks'],
  'Year 9': ['Evolution', 'Acids and bases', 'Motion and forces', 'Zaeli picks'],
  'Year 10': ['Inheritance', 'Newton\'s laws', 'Chemical equations', 'Zaeli picks'],
};

const HASS_TOPICS: Record<string, string[]> = {
  'Foundation': ['My family', 'My community', 'Rules', 'Zaeli picks'],
  'Year 1': ['Then and now', 'Local places', 'Needs and wants', 'Zaeli picks'],
  'Year 2': ['Community changes', 'Maps', 'Money basics', 'Zaeli picks'],
  'Year 3': ['First Australians', 'Gold rush', 'Community rules', 'Zaeli picks'],
  'Year 4': ['First Nations history', 'Australian states', 'Community decisions', 'Zaeli picks'],
  'Year 5': ['Immigration', 'Australian environment', 'Democracy', 'Zaeli picks'],
  'Year 6': ['Colonial Australia', 'Asia-Pacific', 'Rights', 'Zaeli picks'],
  'Year 7': ['Ancient civilisations', 'Urbanisation', 'Constitution', 'Zaeli picks'],
  'Year 8': ['Medieval world', 'Water resources', 'How laws are made', 'Zaeli picks'],
  'Year 9': ['World War I', 'Global challenges', 'Economics', 'Zaeli picks'],
  'Year 10': ['World War II', 'Reconciliation', 'Financial literacy', 'Zaeli picks'],
};

export function getTopicChips(yearLevel: number, subject: string): string[] {
  const yr = yearLevel === 0 ? 'Foundation' : `Year ${yearLevel}`;

  if (subject === 'Maths') return MATHS_TOPICS[yr] ?? ['Zaeli picks'];
  if (subject === 'English') return ENGLISH_TOPICS[yr] ?? ['Zaeli picks'];
  if (subject === 'Science') return SCIENCE_TOPICS[yr] ?? ['Zaeli picks'];
  if (subject === 'HASS') return HASS_TOPICS[yr] ?? ['Zaeli picks'];

  return ['Zaeli picks'];
}
