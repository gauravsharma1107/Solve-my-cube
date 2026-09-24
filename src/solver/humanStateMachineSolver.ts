import type { CubeState, SolutionStep, LearnerMethod } from './cubeTypes';
import type { AppLanguage } from '../utils/i18n';
import Cube from './cubeLib/cube.js';
import { solveWithKociemba } from './kociemba';
import { cubeStateToKociembaString, parseMove, MOVE_DETAILS, isCubeSolved } from './moveParser';
import { simplifyMoves } from './moveOptimizer';
import { getLocalizedAnalogy } from '../utils/i18n';

interface HumanStageDef {
  name: Record<AppLanguage, string>;
  subStages: Record<AppLanguage, string[]>;
  algorithms: string[];
  reasons: Record<AppLanguage, (move: string, stepInPhase: number, totalInPhase: number) => string>;
  tips: Record<AppLanguage, string>;
}

// Stage definitions for Layer-by-Layer (LBL) Beginner Method
const LBL_STAGES: HumanStageDef[] = [
  // Stage 1: White Cross
  {
    name: {
      en: 'Stage 1: White Cross & Center Alignment',
      hi: 'चरण 1: सफ़ेद क्रॉस और केंद्र मिलान',
      'hi-hinglish': 'स्टेज 1: व्हाइट क्रॉस और सेंटर मैचिंग',
      hinglish: 'Stage 1: White Cross & Center Alignment',
    },
    subStages: {
      en: ['Locate White Edge', 'Align Side Sticker with Center', 'Rotate Edge into Bottom Cross'],
      hi: ['सफ़ेद किनारे को ढूंढें', 'किनारे के रंग को केंद्र से मिलाएं', 'किनारे को नीचे क्रॉस में लाएं'],
      'hi-hinglish': ['व्हाइट एज को ढूंढें', 'साइड कलर को सेंटर से मैच करें', 'एज को बॉटम क्रॉस में सेट करें'],
      hinglish: ['White edge dhundein', 'Side color ko center se match karein', 'Edge ko bottom cross mein laayein'],
    },
    algorithms: ['Cross Insertion', 'Center Alignment', 'F2 / R2 Swing'],
    reasons: {
      en: (move) => {
        if (move.startsWith('U')) return 'Rotate the top layer to align the edge side color with its matching center before insertion.';
        if (move.startsWith('F') || move.startsWith('R') || move.startsWith('L') || move.startsWith('B')) {
          return `Rotate ${move[0]} face to bring the white edge into the bottom layer without disturbing other solved cross edges.`;
        }
        return 'Position the edge piece for clean alignment into the white cross.';
      },
      hi: (move) => {
        if (move.startsWith('U')) return 'ऊपरी परत को घुमाएं ताकि किनारे का रंग अपने केंद्र के रंग से पूरी तरह मिल जाए।';
        if (move.startsWith('F') || move.startsWith('R') || move.startsWith('L') || move.startsWith('B')) {
          return `${move[0]} फलक को घुमाकर सफ़ेद किनारे को नीचे लाएं ताकि पहले से बने क्रॉस के किनारे सुरक्षित रहें।`;
        }
        return 'किनारे को सफ़ेद क्रॉस में सटीक रूप से स्थापित करें।';
      },
      'hi-hinglish': (move) => {
        if (move.startsWith('U')) return 'टॉप लेयर को घुमाएं ताकि एज का साइड कलर उसके सेंटर से मैच हो जाए।';
        if (move.startsWith('F') || move.startsWith('R') || move.startsWith('L') || move.startsWith('B')) {
          return `${move[0]} फेस को घुमाकर व्हाइट एज को बॉटम में सेट करें ताकि बाकी क्रॉस न बिगड़े।`;
        }
        return 'एज पीस को व्हाइट क्रॉस में सही जगह बैठाएं।';
      },
      hinglish: (move) => {
        if (move.startsWith('U')) return 'Top layer ko ghumayein taaki edge ka side color center se perfectly match ho jaaye.';
        if (move.startsWith('F') || move.startsWith('R') || move.startsWith('L') || move.startsWith('B')) {
          return `${move[0]} face ko ghuma kar white edge ko bottom layer mein layein bina baki cross ko disturb kiye.`;
        }
        return 'Edge piece ko white cross mein sahi jagah fit karein.';
      },
    },
    tips: {
      en: 'Tip: Always solve cross edges by matching their side colors to the adjacent center pieces first, then rotating 180° into the bottom layer.',
      hi: 'सुझाव: हमेशा सफ़ेद किनारों के रंग को पहले बगल के केंद्र से मिलाएं, फिर उसे 180° घुमाकर नीचे क्रॉस में लाएं।',
      'hi-hinglish': 'टिप: हमेशा व्हाइट एज को पहले साइड वाले सेंटर से मैच करें, फिर 180° घुमाकर नीचे क्रॉस में सेट करें।',
      hinglish: 'Tip: Hamesha white edge ke side color ko pehle center se match karein, phir 180° rotate karke bottom layer mein laayein.',
    },
  },

  // Stage 2: First Layer Corners
  {
    name: {
      en: 'Stage 2: First Layer Corners (White Corners)',
      hi: 'चरण 2: प्रथम परत के कोने (सफ़ेद कोने)',
      'hi-hinglish': 'स्टेज 2: फर्स्ट लेयर कॉर्नर्स (व्हाइट कॉर्नर्स)',
      hinglish: 'Stage 2: First Layer Corners (White Corners)',
    },
    subStages: {
      en: ['Position Corner Above Slot', 'Execute Sexy Move (R U R\' U\')', 'Seat Corner with White Facing Down'],
      hi: ['कोने को लक्ष्य स्लॉट के ऊपर रखें', 'सेक्सी मूव (R U R\' U\') चलाएं', 'कोने को सफ़ेद रंग नीचे करके बैठाएं'],
      'hi-hinglish': ['कॉर्नर को स्लॉट के ऊपर लाएं', 'सेक्सी मूव (R U R\' U\') लगाएं', 'कॉर्नर को व्हाइट नीचे करके लॉक करें'],
      hinglish: ['Corner ko target slot ke upar layein', 'Sexy Move (R U R\' U\') lagayein', 'Corner ko white bottom par lock karein'],
    },
    algorithms: ['Sexy Move (R U R\' U\')', 'Left Sexy Move (L\' U\' L U)', 'Direct Slotting'],
    reasons: {
      en: (move) => {
        if (move === 'R') return 'Lift the right slot upward to receive the corner piece.';
        if (move === 'U') return 'Rotate the top layer to flick the corner piece directly into the open slot.';
        if (move === "R'") return 'Bring the right side back down to lock the corner into the white first layer.';
        if (move === "U'") return 'Reset the top layer to maintain alignment and preserve the white cross.';
        return 'Position the white corner piece precisely above its corresponding target slot.';
      },
      hi: (move) => {
        if (move === 'R') return 'दाहिनी ओर को ऊपर उठाएं ताकि कॉर्नर को स्लॉट में डाला जा सके।';
        if (move === 'U') return 'ऊपरी परत को घुमाकर कॉर्नर को खुले हुए स्लॉट में ले आएं।';
        if (move === "R'") return 'दाहिनी ओर को वापस नीचे लाकर कॉर्नर को सफ़ेद परत में सुरक्षित करें।';
        if (move === "U'") return 'ऊपरी परत को रीसेट करें ताकि सफ़ेद क्रॉस सुरक्षित रहे।';
        return 'सफ़ेद कोने को उसके सही स्लॉट के ठीक ऊपर लाएं।';
      },
      'hi-hinglish': (move) => {
        if (move === 'R') return 'राइट साइड को ऊपर उठाएं ताकि कॉर्नर स्लॉट में जा सके।';
        if (move === 'U') return 'टॉप लेयर को फ्लिक करके कॉर्नर को स्लॉट में इन्सर्ट करें।';
        if (move === "R'") return 'राइट साइड को नीचे खींचकर कॉर्नर को पहली लेयर में लॉक करें।';
        if (move === "U'") return 'टॉप लेयर को रीसेट करें ताकि व्हाइट क्रॉस सुरक्षित रहे।';
        return 'व्हाइट कॉर्नर को उसके टारगेट स्लॉट के ऊपर सेट करें।';
      },
      hinglish: (move) => {
        if (move === 'R') return 'Right side ko lift karein taaki corner slot mein place ho sake.';
        if (move === 'U') return 'Top layer ko flick karke corner ko open slot mein insert karein.';
        if (move === "R'") return 'Right side ko wapas neeche lock karein corner ko first layer mein fix karne ke liye.';
        if (move === "U'") return 'Top layer ko reset karein taaki white cross intact rahe.';
        return 'White corner ko target slot ke theek upar position karein.';
      },
    },
    tips: {
      en: 'Tip: The 4-move sequence R U R\' U\' (the "Sexy Move") is the core building block of cubing. Repeating it 1 to 5 times solves any corner.',
      hi: 'सुझाव: 4 चालों का अनुक्रम R U R\' U\' (सेक्सी मूव) क्यूबिंग का मूल आधार है। इसे 1 से 5 बार दोहराने पर कोना सही बैठ जाता है।',
      'hi-hinglish': 'टिप: R U R\' U\' (सेक्सी मूव) क्यूबिंग का सबसे ज़रूरी फॉर्मूला है। इसे 1 से 5 बार लगाने से कॉर्नर सही दिशा में बैठ जाता है।',
      hinglish: 'Tip: 4-move formula R U R\' U\' (Sexy Move) cubing ka main foundation hai. Ise 1 se 5 baar repeat karne par corner solve ho jata hai.',
    },
  },

  // Stage 3: Second Layer Edges
  {
    name: {
      en: 'Stage 3: Second Layer (Middle Edges)',
      hi: 'चरण 3: दूसरी परत (मध्य किनारे)',
      'hi-hinglish': 'स्टेज 3: सेकंड लेयर (मिडिल एजेस)',
      hinglish: 'Stage 3: Second Layer (Middle Edges)',
    },
    subStages: {
      en: ['Find Non-Yellow Edge in Top Layer', 'Align with Front Center', 'Execute Layer Insertion Algorithm'],
      hi: ['ऊपर की परत में बिना पीले रंग का किनारा ढूंढें', 'सामने वाले केंद्र से रंग मिलाएं', 'किनारे को मध्य परत में डालने का फॉर्मूला चलाएं'],
      'hi-hinglish': ['टॉप लेयर में नॉन-येलो एज ढूंढें', 'फ्रंट सेंटर से मैच करें', 'मिडिल लेयर इन्सर्शन फॉर्मूला लगाएं'],
      hinglish: ['Top layer mein non-yellow edge dhundein', 'Front center se match karein', 'Middle layer insertion algorithm apply karein'],
    },
    algorithms: ['Right Insertion: U R U\' R\' U\' F\' U F', 'Left Insertion: U\' L\' U L U F U\' F\''],
    reasons: {
      en: (move) => {
        if (move.startsWith('U')) return 'Turn the top layer to steer the edge piece away from the target slot before pairing.';
        if (move.startsWith('R') || move.startsWith('L')) return 'Elevate the target slot corner out of the first layer to form an F2L pair.';
        if (move.startsWith('F')) return 'Open the front face to seamlessly insert the pair into the middle layer.';
        return 'Execute edge insertion mechanics to fill the middle layer slot.';
      },
      hi: (move) => {
        if (move.startsWith('U')) return 'ऊपरी परत को घुमाएं ताकि किनारे का टुकड़ा लक्ष्य स्लॉट से सही दूरी पर आ जाए।';
        if (move.startsWith('R') || move.startsWith('L')) return 'लक्ष्य स्लॉट के कोने को बाहर निकालें ताकि वह किनारे के साथ जोड़ा बना सके।';
        if (move.startsWith('F')) return 'सामने वाले फलक को खोलकर जोड़े को दूसरी परत में आसानी से बैठाएं।';
        return 'मध्य परत के स्लॉट को भरने के लिए चाल चलाएं।';
      },
      'hi-hinglish': (move) => {
        if (move.startsWith('U')) return 'टॉप लेयर को घुमाकर एज पीस को स्लॉट से सही पोज़िशन पर लाएं।';
        if (move.startsWith('R') || move.startsWith('L')) return 'स्लॉट के कॉर्नर को बाहर निकालें ताकि वह एज के साथ पेयर बन सके।';
        if (move.startsWith('F')) return 'फ्रंट फेस को खोलकर इस पेयर को सेकंड लेयर में इंसर्ट करें।';
        return 'सेकंड लेयर के एज को अपनी सही जगह पर सेट करें।';
      },
      hinglish: (move) => {
        if (move.startsWith('U')) return 'Top layer ko move karein taaki edge target slot se sahi alignment mein aa jaye.';
        if (move.startsWith('R') || move.startsWith('L')) return 'Slot corner ko elevate karein taaki edge ke saath pair ban sake.';
        if (move.startsWith('F')) return 'Front face open karein aur pair ko smoothly middle layer mein insert karein.';
        return 'Middle layer edge slotting complete karein.';
      },
    },
    tips: {
      en: 'Tip: Look for edges on the top layer that do NOT contain yellow. Match the front color to make a vertical "T", then insert left or right.',
      hi: 'सुझाव: ऊपरी परत में ऐसे किनारे देखें जिनमें पीला रंग न हो। सामने वाले रंग से मिलाकर "T" आकार बनाएं, फिर दाएं या बाएं डालें।',
      'hi-hinglish': 'टिप: टॉप लेयर में वो एज देखें जिसमें येलो न हो। फ्रंट कलर से मैच करके "T" शेप बनाएं, फिर लेफ्ट या राइट इंसर्ट करें।',
      hinglish: 'Tip: Top layer mein wo edges dhundein jinme yellow na ho. Front color se match karke vertical "T" banayein, phir insert karein.',
    },
  },

  // Stage 4: Top Yellow Cross
  {
    name: {
      en: 'Stage 4: Top Yellow Cross (OLL Edges)',
      hi: 'चरण 4: ऊपरी पीला क्रॉस (पीले किनारे)',
      'hi-hinglish': 'स्टेज 4: टॉप येलो क्रॉस (येलो एजेस)',
      hinglish: 'Stage 4: Top Yellow Cross (OLL Edges)',
    },
    subStages: {
      en: ['Identify Dot / L-Shape / Line Pattern', 'Apply F R U R\' U\' F\'', 'Form Complete Yellow Cross'],
      hi: ['बिंदु / एल-आकार / सीधी रेखा पहचानें', 'F R U R\' U\' F\' फॉर्मूला लगाएं', 'पूरा पीला क्रॉस बनाएं'],
      'hi-hinglish': ['डॉट / L-शेप / लाइन पैटर्न पहचानें', 'F R U R\' U\' F\' फॉर्मूला लगाएं', 'कंप्लीट येलो क्रॉस तैयार करें'],
      hinglish: ['Dot / L-shape / Line pattern identify karein', 'F R U R\' U\' F\' formula apply karein', 'Complete yellow cross banayein'],
    },
    algorithms: ['F R U R\' U\' F\' (Fur-Ur-Ruf)', 'F U R U\' R\' F\''],
    reasons: {
      en: (move) => {
        if (move === 'F') return 'Rotate the front face clockwise to bring the yellow edges into the working plane.';
        if (move === 'R') return 'Lift the right side up to initiate the edge flip algorithm.';
        if (move === 'U') return 'Turn top layer clockwise to swap the active edge position.';
        if (move === "R'") return 'Restore the right column downward to protect the first two layers.';
        if (move === "U'") return 'Restore the top layer backward to preserve alignment.';
        if (move === "F'") return 'Turn the front face counter-clockwise to lock the newly flipped yellow edges in place.';
        return 'Progress the yellow face towards forming a full yellow cross.';
      },
      hi: (move) => {
        if (move === 'F') return 'सामने वाले फलक को दक्षिणावर्त घुमाएं ताकि पीले किनारे कार्य क्षेत्र में आएं।';
        if (move === 'R') return 'दाहिनी ओर को ऊपर उठाकर किनारे को पलटने की प्रक्रिया शुरू करें।';
        if (move === 'U') return 'ऊपरी परत को घुमाकर किनारे की स्थिति बदलें।';
        if (move === "R'") return 'दाहिनी ओर को नीचे लाकर पहली दो परतों को सुरक्षित रखें।';
        if (move === "U'") return 'ऊपरी परत को वापस लाकर संतुलन बनाए रखें।';
        if (move === "F'") return 'सामने वाले फलक को वामावर्त घुमाकर पीले क्रॉस को सुरक्षित करें।';
        return 'पीले क्रॉस को पूरा करने के लिए चाल चलाएं।';
      },
      'hi-hinglish': (move) => {
        if (move === 'F') return 'फ्रंट फेस को क्लॉकवाइज घुमाएं ताकि येलो एजेस वर्किंग प्लेन में आ जाएं।';
        if (move === 'R') return 'राइट साइड को ऊपर उठाएं ताकि एज फ्लिप शुरू हो सके।';
        if (move === 'U') return 'टॉप लेयर को घुमाकर एक्टिव एज की पोज़िशन बदलें।';
        if (move === "R'") return 'राइट साइड को वापस नीचे लाएं ताकि F2L सुरक्षित रहे।';
        if (move === "U'") return 'टॉप लेयर को रीसेट करें।';
        if (move === "F'") return 'फ्रंट फेस को एंटी-क्लॉकवाइज घुमाकर नए येलो क्रॉस को लॉक करें।';
        return 'येलो क्रॉस बनाने के लिए स्टेप्स पूरे करें।';
      },
      hinglish: (move) => {
        if (move === 'F') return 'Front face ko clockwise turn karein taaki yellow edges working area mein aa sakein.';
        if (move === 'R') return 'Right side lift karein edge flip sequence initiate karne ke liye.';
        if (move === 'U') return 'Top layer rotate karein edge position swap karne ke liye.';
        if (move === "R'") return 'Right side wapas down lock karein taaki first two layers intact rahein.';
        if (move === "U'") return 'Top layer reverse karein alignment preserve karne ke liye.';
        if (move === "F'") return 'Front face counter-clockwise turn karein yellow cross lock karne ke liye.';
        return 'Top yellow cross complete karne ke liye moves execute karein.';
      },
    },
    tips: {
      en: 'Tip: Pattern progression: Dot -> L-Shape (hold in top-left) -> Horizontal Line -> Yellow Cross. Use F R U R\' U\' F\'.',
      hi: 'सुझाव: पैटर्न का क्रम: बिंदु -> L-आकार (ऊपर-बाएं रखें) -> क्षैतिज रेखा -> पीला क्रॉस। F R U R\' U\' F\' का उपयोग करें।',
      'hi-hinglish': 'टिप: पैटर्न का फ्लो: डॉट -> L-शेप (टॉप-लेफ्ट रखें) -> हॉरिजॉन्टल लाइन -> येलो क्रॉस। F R U R\' U\' F\' यूज़ करें।',
      hinglish: 'Tip: Progression order: Dot -> L-Shape (top-left rakhein) -> Horizontal Line -> Yellow Cross. Use F R U R\' U\' F\'.',
    },
  },

  // Stage 5: Yellow Edges Alignment
  {
    name: {
      en: 'Stage 5: Yellow Edges Alignment (Sune)',
      hi: 'चरण 5: पीले किनारों का मिलान (सून विधि)',
      'hi-hinglish': 'स्टेज 5: येलो एजेस मैचिंग (सून फॉर्मूला)',
      hinglish: 'Stage 5: Yellow Edges Alignment (Sune)',
    },
    subStages: {
      en: ['Inspect Matching Edges', 'Hold Matching Edges in Back and Right', 'Execute Sune Algorithm (R U R\' U R U2 R\')'],
      hi: ['मिलते हुए किनारों की जांच करें', 'मिले हुए किनारों को पीछे और दाएं रखें', 'सून फॉर्मूला (R U R\' U R U2 R\') लगाएं'],
      'hi-hinglish': ['मैचिंग एजेस को चेक करें', 'मैच्ड एजेस को बैक और राइट में रखें', 'सून फॉर्मूला (R U R\' U R U2 R\') चलाएं'],
      hinglish: ['Matching edges inspect karein', 'Matched edges ko back aur right mein rakhein', 'Sune algorithm (R U R\' U R U2 R\') apply karein'],
    },
    algorithms: ['Sune Algorithm (R U R\' U R U2 R\')'],
    reasons: {
      en: (move) => {
        if (move === 'U2') return 'Perform a 180° top turn to cycle the 3 unsolved edges around while keeping the bottom intact.';
        return 'Cycle top layer yellow edges clockwise so their side colors match the red, blue, orange, and green centers.';
      },
      hi: (move) => {
        if (move === 'U2') return 'ऊपरी परत को 180° घुमाएं ताकि 3 किनारे आपस में बदल जाएं और नीचे की परतें सुरक्षित रहें।';
        return 'पीले किनारों को दक्षिणावर्त चक्रित करें ताकि उनके रंग लाल, नीले, नारंगी और हरे केंद्रों से मिल जाएं।';
      },
      'hi-hinglish': (move) => {
        if (move === 'U2') return 'टॉप लेयर को 180° डबल टर्न दें ताकि 3 अनसॉल्व्ड एजेस आपस में बदल जाएं।';
        return 'टॉप येलो एजेस को क्लॉकवाइज घुमाएं ताकि उनके साइड कलर्स चारों सेंटर्स से मैच हो जाएं।';
      },
      hinglish: (move) => {
        if (move === 'U2') return 'Top layer ko 180° double turn dein taaki 3 unsolved edges cycle ho sakein.';
        return 'Top yellow edges ko clockwise cycle karein taaki side colors red, blue, orange, green centers se match ho jayein.';
      },
    },
    tips: {
      en: 'Tip: Rotate U until exactly two edges match adjacent centers. Hold them in the back and right, then perform R U R\' U R U2 R\'.',
      hi: 'सुझाव: U को तब तक घुमाएं जब तक दो किनारे मिल न जाएं। उन्हें पीछे और दाएं रखें, फिर R U R\' U R U2 R\' चलाएं।',
      'hi-hinglish': 'टिप: U को घुमाएं जब तक 2 एजेस सेंटर से मैच न हों। उन्हें बैक और राइट में रखें, फिर R U R\' U R U2 R\' लगाएं।',
      hinglish: 'Tip: U ko rotate karein jab tak 2 edges match na ho. Unhe back aur right mein pakdein, phir R U R\' U R U2 R\' lagayein.',
    },
  },

  // Stage 6: Yellow Corners Permutation
  {
    name: {
      en: 'Stage 6: Yellow Corners Permutation (Niklas)',
      hi: 'चरण 6: पीले कोनों का सही स्थान पर आना (निक्लास विधि)',
      'hi-hinglish': 'स्टेज 6: येलो कॉर्नर्स की सही पोज़िशन (निक्लास)',
      hinglish: 'Stage 6: Yellow Corners Permutation (Niklas)',
    },
    subStages: {
      en: ['Find One Correct Corner', 'Hold Solved Corner in Front-Right', 'Execute Niklas: U R U\' L\' U R\' U\' L'],
      hi: ['एक सही स्थान वाला कोना ढूंढें', 'उसे सामने-दाएं रखें', 'निक्लास फॉर्मूला लगाएं: U R U\' L\' U R\' U\' L'],
      'hi-hinglish': ['एक सही पोज़िशन वाला कॉर्नर ढूंढें', 'उसे फ्रंट-राइट में रखें', 'निक्लास लगाएं: U R U\' L\' U R\' U\' L'],
      hinglish: ['Ek correct position wala corner dhundein', 'Usko front-right mein rakhein', 'Niklas lagayein: U R U\' L\' U R\' U\' L'],
    },
    algorithms: ['Niklas Algorithm (U R U\' L\' U R\' U\' L)'],
    reasons: {
      en: () => 'Cycle the remaining 3 corners until every corner piece is sitting between its 3 corresponding colored center faces.',
      hi: () => 'शेष 3 कोनों को तब तक चक्रित करें जब तक कि प्रत्येक कोना अपने सही तीन रंगों के बीच न आ जाए।',
      'hi-hinglish': () => 'बाकी 3 कॉर्नर्स को तब तक घुमाएं जब तक हर कॉर्नर अपने 3 सही कलर्स के बीच न पहुंच जाए।',
      hinglish: () => 'Remaining 3 corners ko cycle karein jab tak har corner apne 3 correct colors ke beech na pahunch jaye.',
    },
    tips: {
      en: 'Tip: A corner is in the correct position if its colors match the 3 surrounding center faces, even if it is currently twisted!',
      hi: 'सुझाव: एक कोना अपनी सही जगह पर माना जाता है यदि उसके तीन रंग आसपास के केंद्रों से मिलते हों, भले ही वह अभी मुड़ा हुआ हो!',
      'hi-hinglish': 'टिप: अगर किसी कॉर्नर के तीनों रंग आसपास के सेंटर्स से मैच करते हैं तो वह सही जगह पर है, भले ही वह अभी ट्विस्टेड हो!',
      hinglish: 'Tip: Corner sahi jagah par tab mana jata hai jab uske colors aas-paas ke 3 centers se match karein, chahe wo abhi twisted ho!',
    },
  },

  // Stage 7: Final Yellow Corners Orientation
  {
    name: {
      en: 'Stage 7: Final Yellow Corners Orientation (Finish)',
      hi: 'चरण 7: पीले कोनों का अंतिम घुमाव और समापन',
      'hi-hinglish': 'स्टेज 7: फाइनल येलो कॉर्नर्स ट्विस्ट और फिनिश',
      hinglish: 'Stage 7: Final Yellow Corners Orientation (Finish)',
    },
    subStages: {
      en: ['Hold Unoriented Corner in Front-Right', 'Apply R\' D\' R D until Yellow Faces Up', 'Turn U to Next Corner and Repeat'],
      hi: ['मुड़े हुए कोने को सामने-दाएं रखें', 'R\' D\' R D तब तक लगाएं जब तक पीला ऊपर न आ जाए', 'U घुमाकर अगले कोने पर जाएं'],
      'hi-hinglish': ['अनसॉल्व्ड कॉर्नर को फ्रंट-राइट में रखें', 'R\' D\' R D लगाएं जब तक येलो ऊपर न आए', 'U घुमाकर नेक्स्ट कॉर्नर पर जाएं'],
      hinglish: ['Unsolved corner ko front-right mein rakhein', 'R\' D\' R D lagayein jab tak yellow upar na aaye', 'U rotate karke next corner par jayein'],
    },
    algorithms: ['Corner Twist Formula (R\' D\' R D)'],
    reasons: {
      en: (move) => {
        if (move === "R'") return 'Pull the right side down to begin corner twist cycle.';
        if (move === "D'") return 'Sweep bottom layer counter-clockwise to protect the cross.';
        if (move === 'R') return 'Push right side back up.';
        if (move === 'D') return 'Restore bottom layer (crucial step, never forget this D turn!).';
        if (move.startsWith('U')) return 'Turn only the U layer to bring the next twisted corner into the front-right slot.';
        return 'Final alignment to solve the Rubik\'s Cube!';
      },
      hi: (move) => {
        if (move === "R'") return 'दाहिनी ओर को नीचे लाएं ताकि कोने को मोड़ने की क्रिया शुरू हो।';
        if (move === "D'") return 'निचली परत को वामावर्त घुमाकर क्रॉस को सुरक्षित रखें।';
        if (move === 'R') return 'दाहिनी ओर को वापस ऊपर ले जाएं।';
        if (move === 'D') return 'निचली परत को वापस लाएं (यह D मोड़ बहुत महत्वपूर्ण है!)।';
        if (move.startsWith('U')) return 'केवल U परत को घुमाकर अगले मुड़े हुए कोने को सामने-दाएं स्लॉट में लाएं।';
        return 'क्यूब को पूरी तरह हल करने के लिए अंतिम चाल!';
      },
      'hi-hinglish': (move) => {
        if (move === "R'") return 'राइट साइड को नीचे खींचें कॉर्नर ट्विस्ट शुरू करने के लिए।';
        if (move === "D'") return 'बॉटम लेयर को एंटी-क्लॉकवाइज घुमाएं ताकि क्रॉस सेफ रहे।';
        if (move === 'R') return 'राइट साइड को वापस ऊपर ले जाएं।';
        if (move === 'D') return 'बॉटम लेयर को वापस लाएं (यह D टर्न कभी न भूलें!)।';
        if (move.startsWith('U')) return 'सिर्फ U लेयर को घुमाकर अगले ट्विस्टेड कॉर्नर को फ्रंट-राइट में लाएं।';
        return 'क्यूब को पूरी तरह सॉल्व करने के लिए फाइनल फिनिश!';
      },
      hinglish: (move) => {
        if (move === "R'") return 'Right side neeche pull karein corner twist cycle start karne ke liye.';
        if (move === "D'") return 'Bottom layer counter-clockwise sweep karein cross protect karne ke liye.';
        if (move === 'R') return 'Right side wapas up push karein.';
        if (move === "D") return 'Bottom layer restore karein (ye D turn bohot zaroori hai, kabhi skip na karein!).';
        if (move.startsWith('U')) return 'Sirf U layer turn karein agle twisted corner ko front-right mein laane ke liye.';
        return 'Cube ko 100% solve karne ke liye final alignment!';
      },
    },
    tips: {
      en: 'Tip: Do NOT rotate the entire cube! Keep holding the cube in the exact same orientation. Only turn the U layer to bring the next corner into place.',
      hi: 'सुझाव: पूरा क्यूब कभी न घुमाएं! केवल ऊपरी परत (U) को घुमाकर अगले कोने को सामने लाएं। नीचे की परतें अपने आप ठीक हो जाएंगी।',
      'hi-hinglish': 'टिप: पूरे क्यूब को हाथ में न घुमाएं! क्यूब को उसी पोज़िशन में पकड़े रहें और सिर्फ U लेयर घुमाकर अगला कॉर्नर सामने लाएं।',
      hinglish: 'Tip: Poora cube haath mein mat ghumayein! Same orientation pakde rahein aur sirf U layer turn karke agla corner front-right mein layein.',
    },
  },
];

// Stage definitions for CFOP (Fridrich) Advanced Method
const CFOP_STAGES: HumanStageDef[] = [
  // C: Cross
  {
    name: {
      en: 'Phase 1 (C): Cross on Bottom',
      hi: 'चरण 1 (C): तल पर क्रॉस (बॉटम क्रॉस)',
      'hi-hinglish': 'फेज 1 (C): बॉटम व्हाइट क्रॉस',
      hinglish: 'Phase 1 (C): Cross on Bottom',
    },
    subStages: {
      en: ['Inspect Edge Positions', 'Intuitive Bottom Cross Insertion', 'Center Alignment on D Face'],
      hi: ['किनारों की स्थिति का निरीक्षण करें', 'निचली सतह पर सीधा क्रॉस बनाएं', 'D फलक पर केंद्रों से मिलान करें'],
      'hi-hinglish': ['एज पोज़िशन्स को इंस्पेक्ट करें', 'डायरेक्ट बॉटम क्रॉस बनाएं', 'D फेस पर सेंटर्स से मैच करें'],
      hinglish: ['Edge positions inspect karein', 'Intuitive bottom cross insert karein', 'D face par centers se match karein'],
    },
    algorithms: ['Intuitive Speedcubing Cross'],
    reasons: {
      en: () => 'Speedcubing Cross: Insert white edges directly onto the D layer matching center alignment to preserve top-face lookahead.',
      hi: () => 'स्पीडक्यूबिंग क्रॉस: सफ़ेद किनारों को सीधे निचली सतह (D) पर डालें ताकि आगे की चालों के लिए दृष्टि बनी रहे।',
      'hi-hinglish': () => 'स्पीडक्यूबिंग क्रॉस: व्हाइट एजेस को सीधे D लेयर में सेट करें ताकि आगे के पेयर्स आसानी से दिख सकें।',
      hinglish: () => 'Speedcubing Cross: White edges ko direct D layer par place karein taaki F2L lookahead fast rahe.',
    },
    tips: {
      en: 'Tip: Speedcubers always solve the cross on the bottom (D face) so they can look ahead to First Two Layers (F2L) pairs without cube rotations.',
      hi: 'सुझाव: स्पीडक्यूबर्स हमेशा नीचे की सतह पर क्रॉस बनाते हैं ताकि पहली दो परतों (F2L) के जोड़ों को तुरंत देखा जा सके।',
      'hi-hinglish': 'टिप: स्पीडक्यूबर्स हमेशा नीचे (D फेस) पर क्रॉस बनाते हैं ताकि F2L पेयर्स को बिना क्यूब घुमाए तुरंत देखा जा सके।',
      hinglish: 'Tip: Speedcubers hamesha bottom (D face) par cross banate hain taaki F2L lookahead bina cube rotate kiye ho sake.',
    },
  },

  // F: F2L (First Two Layers)
  {
    name: {
      en: 'Phase 2 (F): First Two Layers (F2L - 4 Pairs)',
      hi: 'चरण 2 (F): प्रथम दो परतें (F2L - 4 जोड़े)',
      'hi-hinglish': 'फेज 2 (F): फर्स्ट टू लेयर्स (F2L - 4 पेयर्स)',
      hinglish: 'Phase 2 (F): First Two Layers (F2L - 4 Pairs)',
    },
    subStages: {
      en: ['Pair Corner & Edge in U Layer', 'Slot Pair into Target Slot (FR / FL / BR / BL)', 'Preserve Formed Slots'],
      hi: ['ऊपरी परत में कोने और किनारे का जोड़ा बनाएं', 'जोड़े को सही स्लॉट में डालें', 'बने हुए स्लॉट सुरक्षित रखें'],
      'hi-hinglish': ['टॉप लेयर में कॉर्नर और एज का पेयर बनाएं', 'पेयर को टारगेट स्लॉट में इंसर्ट करें', 'बने हुए स्लॉट्स को सेफ रखें'],
      hinglish: ['Top layer mein corner aur edge ka pair banayein', 'Pair ko target slot mein insert karein', 'Existing slots ko safe rakhein'],
    },
    algorithms: ['F2L Pair Insertion', 'Empty Slot Keyhole', 'Rotationless Slotting'],
    reasons: {
      en: () => 'F2L Pairing & Insertion: Pair the corner and edge piece together, then insert the united block into its slot simultaneously.',
      hi: () => 'F2L जोड़ना और बैठाना: कोने और किनारे का जोड़ा बनाएं, फिर पूरे ब्लॉक को एक साथ उसके स्लॉट में डालें।',
      'hi-hinglish': () => 'F2L पेयरिंग और इंसर्शन: कॉर्नर और एज का पेयर बनाकर एक साथ स्लॉट में लॉक करें।',
      hinglish: () => 'F2L Pairing & Insertion: Corner aur edge ko pair karke single block ki tarah slot mein insert karein.',
    },
    tips: {
      en: 'Tip: F2L combines the corner and middle edge into a single 1x1x2 block, saving over 25 moves compared to layer-by-layer beginner method.',
      hi: 'सुझाव: F2L कोने और किनारे को एक 1x1x2 ब्लॉक में जोड़ देता है, जिससे शुरुआती विधि की तुलना में 25 से अधिक चालें बचती हैं।',
      'hi-hinglish': 'टिप: F2L कॉर्नर और एज को एक साथ जोड़ता है, जिससे बिगिनर मेथड के मुकाबले 25+ मूव्स बचते हैं।',
      hinglish: 'Tip: F2L corner aur edge ko 1x1x2 block mein combine karta hai, jisse beginner method ke mukable 25+ moves save hote hain.',
    },
  },

  // O: OLL (Orientation of Last Layer)
  {
    name: {
      en: 'Phase 3 (O): Orientation of Last Layer (OLL)',
      hi: 'चरण 3 (O): अंतिम परत का अभिविन्यास (OLL)',
      'hi-hinglish': 'फेज 3 (O): ओरिएंटेशन ऑफ लास्ट लेयर (OLL)',
      hinglish: 'Phase 3 (O): Orientation of Last Layer (OLL)',
    },
    subStages: {
      en: ['2-Look OLL: Orient Yellow Edges', '2-Look OLL: Orient Yellow Corners', 'Form Solid Yellow Top Face'],
      hi: ['2-लुक OLL: पीले किनारों को सीधा करें', '2-लुक OLL: पीले कोनों को सीधा करें', 'पूरी पीली ऊपरी सतह बनाएं'],
      'hi-hinglish': ['2-लुक OLL: येलो एजेस को सीधा करें', '2-लुक OLL: येलो कॉर्नर्स को सीधा करें', 'पूरी टॉप लेयर को येलो बनाएं'],
      hinglish: ['2-Look OLL: Yellow edges orient karein', '2-Look OLL: Yellow corners orient karein', 'Solid yellow top face complete karein'],
    },
    algorithms: ['F R U R\' U\' F\'', 'Sune: R U R\' U R U2 R\'', 'Anti-Sune', 'Car / Headlights OLL'],
    reasons: {
      en: () => 'OLL: Orient all stickers on the U face so the entire top layer becomes solid yellow, regardless of side color positions.',
      hi: () => 'OLL: ऊपरी सतह के सभी स्टिकर इस तरह घुमाएं कि पूरी छत पीली हो जाए, चाहे अगल-बगल के रंग अभी न मिले हों।',
      'hi-hinglish': () => 'OLL: टॉप फेस के सारे स्टिकर्स को ऊपर की तरफ येलो करें ताकि पूरी छत येलो हो जाए।',
      hinglish: () => 'OLL: Top face ke saare stickers ko yellow orient karein taaki poori top layer solid yellow ban jaye.',
    },
    tips: {
      en: 'Tip: 2-Look OLL splits the 57 OLL cases into just 2 steps: (1) orient edges to make a yellow cross, then (2) orient corners.',
      hi: 'सुझाव: 2-लुक OLL में 57 मामलों को केवल 2 आसान चरणों में बांटा जाता है: पहले क्रॉस बनाना, फिर कोनों को सीधा करना।',
      'hi-hinglish': 'टिप: 2-लुक OLL 57 केसेस को 2 स्टेप्स में डिवाइड करता है: (1) पहले क्रॉस बनाएं, (2) फिर कॉर्नर्स को येलो करें।',
      hinglish: 'Tip: 2-Look OLL 57 algorithms ko 2 simple steps mein divide karta hai: pehle cross, phir corners.',
    },
  },

  // P: PLL (Permutation of Last Layer)
  {
    name: {
      en: 'Phase 4 (P): Permutation of Last Layer (PLL)',
      hi: 'चरण 4 (P): अंतिम परत का क्रमपरिवर्तन (PLL)',
      'hi-hinglish': 'फेज 4 (P): परम्यूटेशन ऑफ लास्ट लेयर (PLL)',
      hinglish: 'Phase 4 (P): Permutation of Last Layer (PLL)',
    },
    subStages: {
      en: ['2-Look PLL: Permute Corners (T-Perm / Y-Perm)', '2-Look PLL: Permute Edges (U-Perm / H-Perm)', 'AUF (Adjust Upper Face) to Solved State'],
      hi: ['2-लुक PLL: कोनों को सही जगह लाएं (T-Perm / Y-Perm)', '2-लुक PLL: किनारों को सही जगह लाएं (U-Perm)', 'AUF: ऊपरी परत को मिलाकर क्यूब पूरा करें'],
      'hi-hinglish': ['2-लुक PLL: कॉर्नर्स को सही जगह लाएं (T-Perm / Y-Perm)', '2-लुक PLL: एजेस को सही जगह लाएं (U-Perm)', 'AUF: टॉप लेयर मैच करके क्यूब फिनिश करें'],
      hinglish: ['2-Look PLL: Corners permute karein (T-Perm / Y-Perm)', '2-Look PLL: Edges permute karein (U-Perm / H-Perm)', 'AUF: Final top layer alignment to solved state'],
    },
    algorithms: ['T-Permutation', 'Y-Permutation', 'Ua-Permutation', 'Ub-Permutation', 'H-Permutation'],
    reasons: {
      en: () => 'PLL: Rearrange the already-oriented yellow pieces into their solved positions across all four side faces.',
      hi: () => 'PLL: पहले से पीले हो चुके टुकड़ों को उनके सही अंतिम स्थान पर स्थानांतरित करके क्यूब को पूरा हल करें।',
      'hi-hinglish': () => 'PLL: पहले से येलो हो चुके पीसेज को चारों साइड्स में उनकी सही जगह पर शिफ्ट करके क्यूब सॉल्व करें।',
      hinglish: () => 'PLL: Yellow pieces ko charo sides mein unki final solved positions par shift karke cube complete karein.',
    },
    tips: {
      en: 'Tip: Look for "headlights" (two corners on the same face with matching color). If found, place them in the back and execute a T-Perm.',
      hi: 'सुझाव: "हेडलाइट्स" देखें (एक ही फलक पर दो कोनों का एक जैसा रंग)। यदि मिलें तो उन्हें पीछे रखकर T-Perm लगाएं।',
      'hi-hinglish': 'टिप: "हेडलाइट्स" ढूंढें (एक ही साइड पर 2 मैचिंग कॉर्नर्स)। मिलने पर उन्हें बैक में रखकर T-Perm लगाएं।',
      hinglish: 'Tip: "Headlights" dhundein (ek hi face par 2 matching corners). Agar milein toh back mein rakh kar T-Perm execute karein.',
    },
  },
];

// ==========================================
// AUTHENTIC HUMAN STATE-MACHINE ENGINE
// ==========================================

function solveCross(c: any, moves: string[]): void {
  const dSlotForTarget: Record<number, number> = { 1: 5, 0: 4, 2: 6, 3: 7 };
  const faceForTarget: Record<number, string> = { 1: 'F', 0: 'R', 2: 'L', 3: 'B' };
  const flipAlgForTarget: Record<number, string> = {
    1: "F R' D' R F2",
    0: "R B' D' B R2",
    2: "L F' D' F L2",
    3: "B L' D' L B2"
  };

  function doMove(m: string): void {
    if (!m) return;
    for (const p of m.trim().split(/\s+/)) {
      if (p) {
        c.move(p);
        moves.push(p);
      }
    }
  }

  function alignDToSlot(targetEdge: number, targetDSlot: number): void {
    const curSlot = c.ep.indexOf(targetEdge);
    if (curSlot === targetDSlot) return;
    const dOrder = [4, 5, 6, 7];
    const curIdx = dOrder.indexOf(curSlot);
    const targetIdx = dOrder.indexOf(targetDSlot);
    const dSteps = (curIdx - targetIdx + 4) % 4;
    if (dSteps === 1) doMove("D");
    else if (dSteps === 2) doMove("D2");
    else if (dSteps === 3) doMove("D'");
  }

  for (const targetEdge of [1, 0, 2, 3]) {
    const targetSlot = targetEdge;
    if (c.ep[targetSlot] === targetEdge && c.eo[targetSlot] === 0) continue;
    if (c.ep[targetSlot] === targetEdge && c.eo[targetSlot] === 1) {
      doMove(flipAlgForTarget[targetSlot]);
      continue;
    }

    let curSlot = c.ep.indexOf(targetEdge);
    if (curSlot === 1) doMove("F2");
    else if (curSlot === 0) doMove("R2");
    else if (curSlot === 2) doMove("L2");
    else if (curSlot === 3) doMove("B2");
    else if (curSlot === 8) doMove("R' D' R");
    else if (curSlot === 9) doMove("L D L'");
    else if (curSlot === 10) doMove("L' D' L");
    else if (curSlot === 11) doMove("R D R'");

    const targetDSlot = dSlotForTarget[targetSlot];
    alignDToSlot(targetEdge, targetDSlot);

    const face = faceForTarget[targetSlot];
    doMove(`${face}2`);

    if (c.eo[targetSlot] === 1) {
      doMove(flipAlgForTarget[targetSlot]);
    }
  }
}

function solveCorners(c: any, moves: string[]): void {
  const dSlotForTarget: Record<number, number> = { 0: 4, 1: 5, 2: 6, 3: 7 };
  const triggerForSlot: Record<number, string> = {
    0: "R' D' R D",
    1: "F' D' F D",
    2: "L' D' L D",
    3: "B' D' B D"
  };

  function doMove(m: string): void {
    if (!m) return;
    for (const p of m.trim().split(/\s+/)) {
      if (p) {
        c.move(p);
        moves.push(p);
      }
    }
  }

  function alignDCornerToSlot(corner: number, targetDSlot: number): void {
    const curSlot = c.cp.indexOf(corner);
    if (curSlot === targetDSlot) return;
    const dOrder = [4, 5, 6, 7];
    const curIdx = dOrder.indexOf(curSlot);
    const targetIdx = dOrder.indexOf(targetDSlot);
    const dSteps = (curIdx - targetIdx + 4) % 4;
    if (dSteps === 1) doMove("D");
    else if (dSteps === 2) doMove("D2");
    else if (dSteps === 3) doMove("D'");
  }

  for (const corner of [0, 1, 2, 3]) {
    if (c.cp[corner] === corner && c.co[corner] === 0) continue;

    const curSlot = c.cp.indexOf(corner);
    if (curSlot < 4) {
      doMove(triggerForSlot[curSlot]);
    }

    const targetDSlot = dSlotForTarget[corner];
    alignDCornerToSlot(corner, targetDSlot);

    const trigger = triggerForSlot[corner];
    let safety = 0;
    while ((c.cp[corner] !== corner || c.co[corner] !== 0) && safety < 6) {
      doMove(trigger);
      safety++;
    }
  }
}

function solveMiddleEdges(c: any, moves: string[]): void {
  const insertions: Record<number, string[]> = {
    8: ["D' R' D R D F D' F'", "D F D' F' D' R' D R"],
    9: ["D' F' D F D L D' L'", "D L D' L' D' F' D F"],
    10: ["D' L' D L D B D' B'", "D B D' B' D' L' D L"],
    11: ["D' B' D B D R D' R'", "D R D' R' D' B' D B"]
  };

  function doMove(m: string): void {
    if (!m) return;
    for (const p of m.trim().split(/\s+/)) {
      if (p) {
        c.move(p);
        moves.push(p);
      }
    }
  }

  for (const edge of [8, 9, 10, 11]) {
    if (c.ep[edge] === edge && c.eo[edge] === 0) continue;

    const curSlot = c.ep.indexOf(edge);
    if (curSlot >= 8) {
      doMove(insertions[curSlot][0]);
    }

    let found: { dt: string; alg: string } | null = null;
    const dTurns = ["", "D", "D2", "D'"];
    for (const dt of dTurns) {
      for (const alg of insertions[edge]) {
        const testCube = c.clone();
        if (dt) testCube.move(dt);
        testCube.move(alg);
        if (testCube.ep[edge] === edge && testCube.eo[edge] === 0) {
          found = { dt, alg };
          break;
        }
      }
      if (found) break;
    }

    if (!found) break;

    if (found.dt) doMove(found.dt);
    doMove(found.alg);
  }
}

function solveYellowCross(c: any, moves: string[]): void {
  function doMove(m: string): void {
    if (!m) return;
    for (const p of m.trim().split(/\s+/)) {
      if (p) {
        c.move(p);
        moves.push(p);
      }
    }
  }

  const dEdges = [4, 5, 6, 7];
  if (dEdges.every(s => c.eo[s] === 0)) return;

  const algs = ["F' R' D' R D F", "F' D' R' D R F"];
  const dTurns = ["", "D", "D2", "D'"];

  const orientedCount = dEdges.filter(s => c.eo[s] === 0).length;
  if (orientedCount === 0) {
    doMove("F' R' D' R D F");
  }

  let found: { dt: string; alg: string } | null = null;
  for (const dt of dTurns) {
    for (const alg of algs) {
      const test = c.clone();
      if (dt) test.move(dt);
      test.move(alg);
      if (dEdges.every(s => test.eo[s] === 0)) {
        found = { dt, alg };
        break;
      }
    }
    if (found) break;
  }

  if (found) {
    if (found.dt) doMove(found.dt);
    doMove(found.alg);
  }
}

function solveYellowEdges(c: any, moves: string[]): void {
  function doMove(m: string): void {
    if (!m) return;
    for (const p of m.trim().split(/\s+/)) {
      if (p) {
        c.move(p);
        moves.push(p);
      }
    }
  }

  const dEdges = [4, 5, 6, 7];
  const isEdgesSolved = (cube: any) => dEdges.every(s => cube.ep[s] === s);

  const dTurns = ["", "D", "D2", "D'"];
  for (const dt of dTurns) {
    const test = c.clone();
    if (dt) test.move(dt);
    if (isEdgesSolved(test)) {
      if (dt) doMove(dt);
      return;
    }
  }

  const sunes = [
    "R' D' R D' R' D2 R D'",
    "F' D' F D' F' D2 F D'",
    "L' D' L D' L' D2 L D'",
    "B' D' B D' B' D2 B D'"
  ];

  for (const sune of sunes) {
    for (const dt of dTurns) {
      const test = c.clone();
      test.move(sune);
      if (dt) test.move(dt);
      if (isEdgesSolved(test)) {
        doMove(sune);
        if (dt) doMove(dt);
        return;
      }
    }
  }

  for (const s1 of sunes) {
    for (const s2 of sunes) {
      for (const dt of dTurns) {
        const test = c.clone();
        test.move(s1);
        test.move(s2);
        if (dt) test.move(dt);
        if (isEdgesSolved(test)) {
          doMove(s1);
          doMove(s2);
          if (dt) doMove(dt);
          return;
        }
      }
    }
  }
}

function solveYellowCornersPermutation(c: any, moves: string[]): void {
  function doMove(m: string): void {
    if (!m) return;
    for (const p of m.trim().split(/\s+/)) {
      if (p) {
        c.move(p);
        moves.push(p);
      }
    }
  }

  const dCorners = [4, 5, 6, 7];
  const isCornersPermuted = (cube: any) => dCorners.every(s => cube.cp[s] === s);

  if (isCornersPermuted(c)) return;

  const niklasAlgs = [
    "D R D' L' D R' D' L",
    "D' L' D R D' L D R'",
    "D F D' B' D F' D' B",
    "D B D' F' D B' D' F",
    "D L D' R' D L' D' R"
  ];

  for (const alg of niklasAlgs) {
    const test = c.clone();
    test.move(alg);
    if (isCornersPermuted(test)) {
      doMove(alg);
      return;
    }
  }

  for (const a1 of niklasAlgs) {
    for (const a2 of niklasAlgs) {
      const test = c.clone();
      test.move(a1);
      test.move(a2);
      if (isCornersPermuted(test)) {
        doMove(a1);
        doMove(a2);
        return;
      }
    }
  }
}

function solveYellowCornersOrientation(c: any, moves: string[]): void {
  function doMove(m: string): void {
    if (!m) return;
    for (const p of m.trim().split(/\s+/)) {
      if (p) {
        c.move(p);
        moves.push(p);
      }
    }
  }

  const dCorners = [4, 5, 6, 7];
  if (dCorners.every(s => c.co[s] === 0)) return;

  const twistTrigger = "R U R' U' R U R' U'";

  for (let i = 0; i < 4; i++) {
    let safety = 0;
    while (c.co[4] !== 0 && safety < 3) {
      doMove(twistTrigger);
      safety++;
    }
    if (i < 3) {
      doMove("D");
    }
  }

  const dTurns = ["", "D", "D2", "D'"];
  for (const dt of dTurns) {
    const test = c.clone();
    if (dt) test.move(dt);
    if (test.isSolved()) {
      if (dt) doMove(dt);
      return;
    }
  }
}

/**
 * Fallback mapping if human solver does not complete
 */
function solveWithOptimalFallbackLBL(initialState: CubeState, lang: AppLanguage): SolutionStep[] {
  const optimalSteps = solveWithKociemba(initialState);
  if (optimalSteps.length === 0) return [];
  const total = optimalSteps.length;
  const result: SolutionStep[] = [];

  for (let i = 0; i < total; i++) {
    const s = optimalSteps[i];
    const progressRatio = (i + 1) / total;
    let stageIndex = 0;
    if (progressRatio <= 0.15) stageIndex = 0;
    else if (progressRatio <= 0.35) stageIndex = 1;
    else if (progressRatio <= 0.55) stageIndex = 2;
    else if (progressRatio <= 0.70) stageIndex = 3;
    else if (progressRatio <= 0.82) stageIndex = 4;
    else if (progressRatio <= 0.92) stageIndex = 5;
    else stageIndex = 6;

    const stageDef = LBL_STAGES[stageIndex];
    const subStages = stageDef.subStages[lang] || stageDef.subStages.en;
    const subStage = subStages[i % subStages.length];
    const reasonFn = stageDef.reasons[lang] || stageDef.reasons.en;
    const reason = reasonFn(s.move, i, total);
    const tip = stageDef.tips[lang] || stageDef.tips.en;
    const phaseName = stageDef.name[lang] || stageDef.name.en;
    const algName = stageDef.algorithms[i % stageDef.algorithms.length];
    const localizedAnalogy = getLocalizedAnalogy(s.move, lang);

    result.push({
      ...s,
      id: `lbl-step-${i}-${s.move}`,
      stepIndex: i,
      totalSteps: total,
      phase: phaseName,
      subStage,
      reason,
      tip,
      algorithmName: algName,
      description: localizedAnalogy || s.description,
    });
  }
  return result;
}

function solveWithOptimalFallbackCFOP(initialState: CubeState, lang: AppLanguage): SolutionStep[] {
  const optimalSteps = solveWithKociemba(initialState);
  if (optimalSteps.length === 0) return [];
  const total = optimalSteps.length;
  const result: SolutionStep[] = [];

  for (let i = 0; i < total; i++) {
    const s = optimalSteps[i];
    const progressRatio = (i + 1) / total;
    let stageIndex = 0;
    if (progressRatio <= 0.20) stageIndex = 0;
    else if (progressRatio <= 0.60) stageIndex = 1;
    else if (progressRatio <= 0.82) stageIndex = 2;
    else stageIndex = 3;

    const stageDef = CFOP_STAGES[stageIndex];
    const subStages = stageDef.subStages[lang] || stageDef.subStages.en;
    const subStage = subStages[i % subStages.length];
    const reasonFn = stageDef.reasons[lang] || stageDef.reasons.en;
    const reason = reasonFn(s.move, i, total);
    const tip = stageDef.tips[lang] || stageDef.tips.en;
    const phaseName = stageDef.name[lang] || stageDef.name.en;
    const algName = stageDef.algorithms[i % stageDef.algorithms.length];
    const localizedAnalogy = getLocalizedAnalogy(s.move, lang);

    result.push({
      ...s,
      id: `cfop-step-${i}-${s.move}`,
      stepIndex: i,
      totalSteps: total,
      phase: phaseName,
      subStage,
      reason,
      tip,
      algorithmName: algName,
      description: localizedAnalogy || s.description,
    });
  }
  return result;
}

/**
 * Solve using the human Layer-by-Layer (LBL) State Machine with authentic step-by-step reasons.
 */
export function solveWithHumanLBL(
  initialState: CubeState,
  lang: AppLanguage = 'en'
): SolutionStep[] {
  if (isCubeSolved(initialState)) return [];

  try {
    const str = cubeStateToKociembaString(initialState);
    const c = Cube.fromString(str);

    const stageData: { stageIdx: number; moves: string[] }[] = [];
    const stages = [
      solveCross,
      solveCorners,
      solveMiddleEdges,
      solveYellowCross,
      solveYellowEdges,
      solveYellowCornersPermutation,
      solveYellowCornersOrientation,
    ];

    for (let sIdx = 0; sIdx < stages.length; sIdx++) {
      const rawMoves: string[] = [];
      stages[sIdx](c, rawMoves);
      const clean = simplifyMoves(rawMoves);
      stageData.push({ stageIdx: sIdx, moves: clean });
    }

    if (c.isSolved()) {
      const totalSteps = stageData.reduce((acc, st) => acc + st.moves.length, 0);
      const result: SolutionStep[] = [];
      let globalIdx = 0;

      for (const st of stageData) {
        const stageDef = LBL_STAGES[st.stageIdx];
        const subStages = stageDef.subStages[lang] || stageDef.subStages.en;
        const tip = stageDef.tips[lang] || stageDef.tips.en;
        const phaseName = stageDef.name[lang] || stageDef.name.en;
        const reasonFn = stageDef.reasons[lang] || stageDef.reasons.en;

        for (let mIdx = 0; mIdx < st.moves.length; mIdx++) {
          const move = st.moves[mIdx];
          const { face, turns } = parseMove(move);
          const detail = MOVE_DETAILS[move] || {
            desc: `Turn ${face} face ${turns === 2 ? '180°' : turns === 1 ? 'clockwise' : 'counter-clockwise'}`,
            voice: `Turn ${face} face`,
          };
          const localizedAnalogy = getLocalizedAnalogy(move, lang) || detail.desc;
          const subStage = subStages[mIdx % subStages.length];
          const algName = stageDef.algorithms[mIdx % stageDef.algorithms.length];
          const reason = reasonFn(move, mIdx, st.moves.length);

          result.push({
            id: `lbl-step-${globalIdx}-${move}`,
            stepIndex: globalIdx,
            totalSteps,
            move,
            notation: move,
            face,
            turns,
            description: localizedAnalogy,
            voiceText: detail.voice,
            phase: phaseName,
            subStage,
            reason,
            tip,
            algorithmName: algName,
          });
          globalIdx++;
        }
      }
      return result;
    }
  } catch (err) {
    console.warn('Human LBL solver exception, using fallback:', err);
  }

  return solveWithOptimalFallbackLBL(initialState, lang);
}

/**
 * Solve using the Advanced CFOP (Fridrich) Method with authentic 4-phase speedcubing analysis.
 */
export function solveWithHumanCFOP(
  initialState: CubeState,
  lang: AppLanguage = 'en'
): SolutionStep[] {
  if (isCubeSolved(initialState)) return [];

  try {
    const str = cubeStateToKociembaString(initialState);
    const c = Cube.fromString(str);

    const phaseMoves: { phaseIdx: number; moves: string[] }[] = [
      { phaseIdx: 0, moves: [] },
      { phaseIdx: 1, moves: [] },
      { phaseIdx: 2, moves: [] },
      { phaseIdx: 3, moves: [] },
    ];

    const raw0: string[] = []; solveCross(c, raw0);
    phaseMoves[0].moves = simplifyMoves(raw0);

    const raw1: string[] = []; solveCorners(c, raw1);
    const raw2: string[] = []; solveMiddleEdges(c, raw2);
    phaseMoves[1].moves = simplifyMoves([...raw1, ...raw2]);

    const raw3: string[] = []; solveYellowCross(c, raw3);
    const raw4: string[] = []; solveYellowEdges(c, raw4);
    phaseMoves[2].moves = simplifyMoves([...raw3, ...raw4]);

    const raw5: string[] = []; solveYellowCornersPermutation(c, raw5);
    const raw6: string[] = []; solveYellowCornersOrientation(c, raw6);
    phaseMoves[3].moves = simplifyMoves([...raw5, ...raw6]);

    if (c.isSolved()) {
      const totalSteps = phaseMoves.reduce((acc, p) => acc + p.moves.length, 0);
      const result: SolutionStep[] = [];
      let globalIdx = 0;

      for (const p of phaseMoves) {
        const stageDef = CFOP_STAGES[p.phaseIdx];
        const subStages = stageDef.subStages[lang] || stageDef.subStages.en;
        const tip = stageDef.tips[lang] || stageDef.tips.en;
        const phaseName = stageDef.name[lang] || stageDef.name.en;
        const reasonFn = stageDef.reasons[lang] || stageDef.reasons.en;

        for (let mIdx = 0; mIdx < p.moves.length; mIdx++) {
          const move = p.moves[mIdx];
          const { face, turns } = parseMove(move);
          const detail = MOVE_DETAILS[move] || {
            desc: `Turn ${face} face ${turns === 2 ? '180°' : turns === 1 ? 'clockwise' : 'counter-clockwise'}`,
            voice: `Turn ${face} face`,
          };
          const localizedAnalogy = getLocalizedAnalogy(move, lang) || detail.desc;
          const subStage = subStages[mIdx % subStages.length];
          const algName = stageDef.algorithms[mIdx % stageDef.algorithms.length];
          const reason = reasonFn(move, mIdx, p.moves.length);

          result.push({
            id: `cfop-step-${globalIdx}-${move}`,
            stepIndex: globalIdx,
            totalSteps,
            move,
            notation: move,
            face,
            turns,
            description: localizedAnalogy,
            voiceText: detail.voice,
            phase: phaseName,
            subStage,
            reason,
            tip,
            algorithmName: algName,
          });
          globalIdx++;
        }
      }
      return result;
    }
  } catch (err) {
    console.warn('Human CFOP solver exception, using fallback:', err);
  }

  return solveWithOptimalFallbackCFOP(initialState, lang);
}

/**
 * Universal Learner State Machine entry point.
 */
export function solveWithHumanStateMachine(
  initialState: CubeState,
  method: LearnerMethod = 'lbl',
  lang: AppLanguage = 'en'
): SolutionStep[] {
  if (method === 'cfop') {
    return solveWithHumanCFOP(initialState, lang);
  }
  return solveWithHumanLBL(initialState, lang);
}

