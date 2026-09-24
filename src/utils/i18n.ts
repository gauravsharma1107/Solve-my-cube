export type AppLanguage = 'en' | 'hi' | 'hi-hinglish' | 'hinglish';

export interface LanguageOption {
  id: AppLanguage;
  label: string;
  subLabel: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    id: 'en',
    label: 'English',
    subLabel: 'Standard English',
    nativeName: 'English',
  },
  {
    id: 'hi',
    label: 'हिन्दी (Hindi)',
    subLabel: 'शुद्ध हिन्दी भाषा',
    nativeName: 'हिन्दी',
  },
  {
    id: 'hi-hinglish',
    label: 'हिंग्लिश (देवनागरी)',
    subLabel: 'हिन्दी लिपि में आसान हिंग्लिश',
    nativeName: 'हिंग्लिश',
  },
  {
    id: 'hinglish',
    label: 'Hinglish (Latin)',
    subLabel: 'Conversational Roman Hinglish',
    nativeName: 'Hinglish',
  },
];

const LANGUAGE_STORAGE_KEY = 'rubiks_language_preference';

export function getStoredLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'hi' || saved === 'hi-hinglish' || saved === 'hinglish') {
      return saved;
    }
  } catch {
    // Storage access issue fallback
  }
  return 'en';
}

export function setStoredLanguage(lang: AppLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Storage access issue fallback
  }
}

// Complete localized translations dictionary
export const TRANSLATIONS: Record<AppLanguage, Record<string, string>> = {
  en: {
    // Navigation
    nav_solver: '3D Solver',
    nav_scan: 'Camera Scan',
    nav_input: 'Cube Input',
    nav_timer: 'Timer',
    nav_settings: 'Settings',
    nav_theme: 'Theme',
    nav_install: 'Install',
    nav_ready: 'Ready',
    nav_offline: 'Offline',

    // Modes
    mode_optimal: 'Optimal (~20)',
    mode_beginner: 'Beginner (LBL)',
    mode_learner: 'Learner Mode',
    submethod_lbl: 'Beginner (LBL)',
    submethod_cfop: 'Advanced (CFOP)',

    // Controls
    btn_prev: 'Prev',
    btn_next: 'Next',
    btn_play: 'Play',
    btn_pause: 'Pause',
    btn_reset: 'Reset',
    btn_replay: 'Replay',
    btn_adjust_input: 'Adjust in Cube Input',
    btn_apply_close: 'Apply & Close',

    // Orientation
    orient_title: 'Cube Orientation',
    orient_white_top: 'White Top',
    orient_green_front: 'Green Front',

    // HUD / Move Status
    step_counter: 'STEP',
    step_of: 'OF',
    done: 'done',
    next_move: 'Next',
    active_move: 'Active',
    prev_move: 'Prev',
    why_this_move: 'Why this move?',
    key_concept: 'Key Principle',
    follow_arrow: 'Follow 3D visual arrow',

    // Solver Outcomes
    solved_title: 'CUBE SOLVED!',
    solved_desc: 'All moves were performed cleanly. Every face has returned to its solved configuration!',
    replay_solution: 'Replay Solution From Beginning',
    incomplete_title: 'Sequence Finished • Cube Incomplete',
    incomplete_desc: 'All moves were executed, but some stickers still differ. Keep White on Top and Green in Front.',
    no_solution_prompt: 'No solution loaded yet. Scramble or scan your cube to generate step-by-step instructions!',
    already_solved: 'Cube is already in solved state! Scramble or load new cube to solve.',

    // Settings Modal
    settings_title: 'Settings & Preferences',
    settings_subtitle: 'Language, themes, and learning preferences',
    tab_language: 'Language',
    tab_appearance: 'Theme & Depth',
    tab_learner: 'Learner Preferences',
    lang_section_title: 'Display Language',
    lang_section_desc: 'Select your preferred language. Changes apply throughout the entire app.',
    theme_section_title: 'Black Background Intensity',
    theme_section_desc: 'Customize the depth of pure black for OLED / AMOLED displays',
    quick_presets: 'Quick Presets',
    contrast_badge: 'Contrast A++',
    learner_method_title: 'Default Human Solving Method',
    learner_method_desc: 'Choose how Learner Mode teaches you the Rubik\'s cube solution',
    learner_lbl_desc: "Layer-by-Layer: The authentic 7-step beginner method by J Perm (YouTube: 7Ron6MN45LY) using Right 4-Moves (R U R' U').",
    learner_cfop_desc: 'Fridrich CFOP: The speedcubing standard used by world record holders.',
    watch_jperm_tutorial: 'Watch J Perm Tutorial (YouTube)',
    step7_final_warning: "Step 7 Rule: Hold yellow on bottom, do R U R' U', turn ONLY bottom D!",
    reasons_toggle_title: 'Show Step-by-Step Explanations',
    reasons_toggle_desc: 'Display "Why this move?" cards explaining the strategic purpose behind each turn.',
    voice_toggle_title: 'Audio Voice Guidance',
    voice_toggle_desc: 'Speak move names and directions out loud as you advance through steps.',
  },

  hi: {
    // Navigation
    nav_solver: '3D सॉल्वर',
    nav_scan: 'कैमरा स्कैन',
    nav_input: 'क्यूब इनपुट',
    nav_timer: 'टाइमर',
    nav_settings: 'सेटिंग्स',
    nav_theme: 'थीम',
    nav_install: 'इंस्टॉल करें',
    nav_ready: 'तैयार',
    nav_offline: 'ऑफ़लाइन',

    // Modes
    mode_optimal: 'सर्वोत्तम (~20)',
    mode_beginner: 'शुरुआती (LBL)',
    mode_learner: 'लर्नर मोड (सीखें)',
    submethod_lbl: 'शुरुआती (LBL विधि)',
    submethod_cfop: 'उन्नत (CFOP विधि)',

    // Controls
    btn_prev: 'पिछला',
    btn_next: 'अगला',
    btn_play: 'शुरू',
    btn_pause: 'रोकें',
    btn_reset: 'आरंभ',
    btn_replay: 'पुनः चलाएं',
    btn_adjust_input: 'इनपुट में सुधारें',
    btn_apply_close: 'लागू करें और बंद करें',

    // Orientation
    orient_title: 'क्यूब स्थिति',
    orient_white_top: 'सफ़ेद ऊपर',
    orient_green_front: 'हरा सामने',

    // HUD / Move Status
    step_counter: 'चरण',
    step_of: 'का',
    done: 'पूर्ण',
    next_move: 'अगला',
    active_move: 'सक्रिय',
    prev_move: 'पिछला',
    why_this_move: 'यह चाल क्यों?',
    key_concept: 'मूल सिद्धांत',
    follow_arrow: '3D तीर का अनुसरण करें',

    // Solver Outcomes
    solved_title: 'क्यूब हल हो गया!',
    solved_desc: 'सभी चालें सफलतापूर्वक पूरी हुईं। क्यूब के सभी रंग अपने मूल स्थान पर आ गए हैं!',
    replay_solution: 'आरंभ से पुनः देखें',
    incomplete_title: 'चालें समाप्त • क्यूब अभी अधूरा है',
    incomplete_desc: 'सभी चालें चली गईं, परन्तु कुछ रंग नहीं मिले। कृपया सुनिश्चित करें कि सफ़ेद ऊपर और हरा सामने रहे।',
    no_solution_prompt: 'अभी कोई हल लोड नहीं हुआ है। हल प्राप्त करने के लिए स्क्रैम्बल करें या स्कैन करें!',
    already_solved: 'क्यूब पहले से ही पूरी तरह हल है! अभ्यास के लिए स्क्रैम्बल करें।',

    // Settings Modal
    settings_title: 'सेटिंग्स और प्राथमिकताएँ',
    settings_subtitle: 'भाषा, थीम एवं सीखने की सेटिंग्स',
    tab_language: 'भाषा (Language)',
    tab_appearance: 'थीम और बैकग्राउंड',
    tab_learner: 'लर्नर सेटिंग्स',
    lang_section_title: 'भाषा चयन',
    lang_section_desc: 'अपनी मनपसंद भाषा चुनें। यह विकल्प पूरी वेबसाइट पर तुरंत लागू होगा।',
    theme_section_title: 'ब्लैक बैकग्राउंड की गहराई',
    theme_section_desc: 'OLED / AMOLED स्क्रीन के लिए डार्क मोड की गहराई चुनें',
    quick_presets: 'त्वरित प्रीसेट',
    contrast_badge: 'उत्कृष्ट कंट्रास्ट A++',
    learner_method_title: 'मानव समाधान विधि',
    learner_method_desc: 'चुनें कि लर्नर मोड आपको किस विधि द्वारा सिखाए',
    learner_lbl_desc: "परत-दर-परत (LBL): जे पर्म की प्रामाणिक 7-चरणीय विधि (YouTube: 7Ron6MN45LY) जिसमें 4-चालों (R U R' U') से सिखाया जाता है।",
    learner_cfop_desc: 'सीएफओपी (CFOP): स्पीडक्यूबर्स द्वारा उपयोग की जाने वाली विश्व स्तरीय तकनीक।',
    watch_jperm_tutorial: 'जे पर्म ट्यूटोरियल देखें (यूट्यूब)',
    step7_final_warning: "चरण 7 नियम: पीला नीचे रखें, R U R' U' लगाएं, केवल निचली परत D घुमाएं!",
    reasons_toggle_title: 'हर चाल का कारण दिखाएं',
    reasons_toggle_desc: 'हर चाल के पीछे का रणनीतिक कारण (Why this move?) प्रदर्शित करें।',
    voice_toggle_title: 'ध्वनि निर्देश (Voice Guidance)',
    voice_toggle_desc: 'चाल बदलते समय आवाज़ में निर्देश सुनें।',
  },

  'hi-hinglish': {
    // Navigation
    nav_solver: '3D सॉल्वर',
    nav_scan: 'कैमरा स्कैन',
    nav_input: 'क्यूब इनपुट',
    nav_timer: 'टाइमर',
    nav_settings: 'सेटिंग्स',
    nav_theme: 'थीम',
    nav_install: 'इंस्टॉल करें',
    nav_ready: 'रेडी',
    nav_offline: 'ऑफलाइन',

    // Modes
    mode_optimal: 'ऑप्टिमल (~20)',
    mode_beginner: 'बिगिनर (LBL)',
    mode_learner: 'लर्नर मोड (सीखें)',
    submethod_lbl: 'बिगिनर लेयर मेथड',
    submethod_cfop: 'एडवांस्ड CFOP',

    // Controls
    btn_prev: 'पिछला',
    btn_next: 'अगला',
    btn_play: 'प्ले',
    btn_pause: 'पॉज',
    btn_reset: 'रीसेट',
    btn_replay: 'रीप्ले',
    btn_adjust_input: 'क्यूब इनपुट में सुधारें',
    btn_apply_close: 'सेव करें और बंद करें',

    // Orientation
    orient_title: 'क्यूब ओरिएंटेशन',
    orient_white_top: 'व्हाइट ऊपर',
    orient_green_front: 'ग्रीन सामने',

    // HUD / Move Status
    step_counter: 'स्टेप',
    step_of: 'कुल',
    done: 'पूरा हुआ',
    next_move: 'नेक्स्ट',
    active_move: 'करंट',
    prev_move: 'पिछला',
    why_this_move: 'ये मूव क्यों करना है?',
    key_concept: 'इम्पोर्टेंट कॉन्सेप्ट',
    follow_arrow: '3D एरो को फॉलो करें',

    // Solver Outcomes
    solved_title: 'क्यूब सॉल्व हो गया!',
    solved_desc: 'सारे मूव्स परफेक्ट हुए। आपका रूबिक्स क्यूब पूरी तरह सॉल्व हो चुका है!',
    replay_solution: 'शुरू से दोबारा देखें',
    incomplete_title: 'मूव्स खत्म • लेकिन क्यूब अभी सॉल्व नहीं हुआ',
    incomplete_desc: 'सारे स्टेप्स हो गए पर कुछ स्टिकर्स मैच नहीं हुए। ध्यान रखें कि व्हाइट ऊपर और ग्रीन सामने रहे।',
    no_solution_prompt: 'अभी कोई सॉल्यूशन नहीं है। स्टेप्स देखने के लिए स्क्रैम्बल या स्कैन करें!',
    already_solved: 'क्यूब पहले से ही सॉल्व है! नई प्रैक्टिस के लिए स्क्रैम्बल करें।',

    // Settings Modal
    settings_title: 'सेटिंग्स और प्रेफरेंस',
    settings_subtitle: 'लैंग्वेज, थीम और लर्नर ऑप्शन्स',
    tab_language: 'लैंग्वेज (Language)',
    tab_appearance: 'थीम और डार्कनेस',
    tab_learner: 'लर्नर सेटिंग्स',
    lang_section_title: 'अपनी भाषा चुनें',
    lang_section_desc: 'अपनी पसंद की लैंग्वेज चुनें। यह केवल सेटिंग्स मेनू से चेंज हो सकती है।',
    theme_section_title: 'ब्लैक बैकग्राउंड इंटेंसिटी',
    theme_section_desc: 'OLED / AMOLED डिस्प्ले के लिए परफेक्ट ब्लैक लेवल सेट करें',
    quick_presets: 'क्विक प्रीसेट्स',
    contrast_badge: 'कंट्रास्ट A++',
    learner_method_title: 'सीखने का मेथड चुनें',
    learner_method_desc: 'चुनें कि लर्नर मोड में आप किस तरह से क्यूब सॉल्व करना सीखना चाहते हैं',
    learner_lbl_desc: "लेयर-बाय-लेयर (LBL): J Perm का असली 7-स्टेप मेथड (YouTube: 7Ron6MN45LY) जो 4-मूव्स (R U R' U') के साथ आसानी से सिखाता है।",
    learner_cfop_desc: 'CFOP फ्रिडरिच: फास्ट स्पीडक्यूबिंग के लिए 4 स्टेप्स वाला एडवांस्ड मेथड।',
    watch_jperm_tutorial: 'J Perm वीडियो ट्यूटोरियल देखें (YouTube)',
    step7_final_warning: "स्टेप 7 नियम: येलो नीचे रखें, R U R' U' लगाएं, सिर्फ बॉटम D घुमाएं!",
    reasons_toggle_title: 'हर स्टेप का रीज़न दिखाएं',
    reasons_toggle_desc: 'हर मूव के पीछे की लॉजिक (Reason) स्क्रीन पर दिखाएं।',
    voice_toggle_title: 'वॉइस गाइडेंस',
    voice_toggle_desc: 'हर मूव के साथ आवाज़ में गाइडेंस सुनें।',
  },

  hinglish: {
    // Navigation
    nav_solver: '3D Solver',
    nav_scan: 'Camera Scan',
    nav_input: 'Cube Input',
    nav_timer: 'Timer',
    nav_settings: 'Settings',
    nav_theme: 'Theme',
    nav_install: 'Install App',
    nav_ready: 'Ready',
    nav_offline: 'Offline',

    // Modes
    mode_optimal: 'Optimal (~20)',
    mode_beginner: 'Beginner (LBL)',
    mode_learner: 'Learner Mode',
    submethod_lbl: 'Beginner LBL',
    submethod_cfop: 'Advanced CFOP',

    // Controls
    btn_prev: 'Prev',
    btn_next: 'Next',
    btn_play: 'Play',
    btn_pause: 'Pause',
    btn_reset: 'Reset',
    btn_replay: 'Replay',
    btn_adjust_input: 'Fix in Cube Input',
    btn_apply_close: 'Apply & Close',

    // Orientation
    orient_title: 'Cube Orientation',
    orient_white_top: 'White Top',
    orient_green_front: 'Green Front',

    // HUD / Move Status
    step_counter: 'Step',
    step_of: 'of',
    done: 'done',
    next_move: 'Next',
    active_move: 'Active',
    prev_move: 'Prev',
    why_this_move: 'Why this move?',
    key_concept: 'Key Concept',
    follow_arrow: 'Follow 3D arrow',

    // Solver Outcomes
    solved_title: 'CUBE SOLVED HO GAYA!',
    solved_desc: 'Saare moves cleanly complete hue. Cube ke saare faces solved state mein aa chuke hain!',
    replay_solution: 'Replay Solution From Beginning',
    incomplete_title: 'Sequence Finished • Cube Abhi Incomplete Hai',
    incomplete_desc: 'Saare moves execute ho gaye par stickers match nahi hue. White ko Top aur Green ko Front par pakdein.',
    no_solution_prompt: 'Abhi koi solution loaded nahi hai. Steps ke liye cube ko scramble ya scan karein!',
    already_solved: 'Cube pehle se hi solved hai! Practice ke liye naya scramble karein.',

    // Settings Modal
    settings_title: 'Settings & Preferences',
    settings_subtitle: 'Language, themes, aur learning options',
    tab_language: 'Language',
    tab_appearance: 'Theme & Depth',
    tab_learner: 'Learner Settings',
    lang_section_title: 'Select Language',
    lang_section_desc: 'Apni preferred language select karein. Ye sirf Settings menu se change ho sakti hai.',
    theme_section_title: 'Black Background Intensity',
    theme_section_desc: 'OLED / AMOLED screen ke liye black depth customize karein',
    quick_presets: 'Quick Presets',
    contrast_badge: 'Contrast A++',
    learner_method_title: 'Learner Method Selection',
    learner_method_desc: 'Choose karein ki aap kis human method se Rubik\'s cube solve karna sikhna chahte hain',
    learner_lbl_desc: "Layer-by-Layer (LBL): J Perm ka authentic 7-step method (YouTube: 7Ron6MN45LY) using Right 4-Moves (R U R' U').",
    learner_cfop_desc: 'Fridrich CFOP: Speedcubers ka world record method (Cross, F2L, OLL, PLL).',
    watch_jperm_tutorial: 'Watch J Perm Tutorial (YouTube)',
    step7_final_warning: "Step 7 Rule: Yellow bottom par rakhein, R U R' U' lagayein, sirf bottom D turn karein!",
    reasons_toggle_title: 'Show Step-by-Step Reason',
    reasons_toggle_desc: 'Har move ke peeche ka reason aur logic screen par display karein.',
    voice_toggle_title: 'Voice Audio Guidance',
    voice_toggle_desc: 'Har step par voice cues play karein.',
  },
};

// Localized 18 Standard Move Steering Analogies across all 4 languages
export const MOVE_ANALOGIES: Record<AppLanguage, Record<string, string>> = {
  en: {
    R: 'Turn right side away from you (push up 90°)',
    "R'": 'Turn right side towards you (pull down 90°)',
    R2: 'Turn right side twice (180° rotation)',
    L: 'Turn left side towards you (pull down 90°)',
    "L'": 'Turn left side away from you (push up 90°)',
    L2: 'Turn left side twice (180° rotation)',
    U: 'Turn top layer clockwise 90° (flick left like steering wheel)',
    "U'": 'Turn top layer counter-clockwise 90° (flick right like steering wheel)',
    U2: 'Turn top layer twice (180° rotation)',
    D: 'Turn bottom layer clockwise 90° (flick right)',
    "D'": 'Turn bottom layer counter-clockwise 90° (flick left)',
    D2: 'Turn bottom layer twice (180° rotation)',
    F: 'Turn front face right like a steering wheel (clockwise 90°)',
    "F'": 'Turn front face left like a steering wheel (counter-clockwise 90°)',
    F2: 'Turn front face twice like a steering wheel (180° rotation)',
    B: 'Turn back face clockwise 90° (looking from behind)',
    "B'": 'Turn back face counter-clockwise 90° (looking from behind)',
    B2: 'Turn back face twice (180° rotation)',
  },
  hi: {
    R: 'दाहिनी ओर को ऊपर की तरफ घुमाएं (90° ऊपर)',
    "R'": 'दाहिनी ओर को अपनी तरफ नीचे घुमाएं (90° नीचे)',
    R2: 'दाहिनी ओर को दो बार घुमाएं (180° पूरा चक्कर)',
    L: 'बाईं ओर को अपनी तरफ नीचे घुमाएं (90° नीचे)',
    "L'": 'बाईं ओर को ऊपर की तरफ घुमाएं (90° ऊपर)',
    L2: 'बाईं ओर को दो बार घुमाएं (180° पूरा चक्कर)',
    U: 'ऊपरी परत को घड़ी की दिशा में घुमाएं (बाईं ओर मोड़ें)',
    "U'": 'ऊपरी परत को घड़ी की विपरीत दिशा में घुमाएं (दाईं ओर मोड़ें)',
    U2: 'ऊपरी परत को दो बार घुमाएं (180° पूरा चक्कर)',
    D: 'निचली परत को घड़ी की दिशा में घुमाएं',
    "D'": 'निचली परत को घड़ी की विपरीत दिशा में घुमाएं',
    D2: 'निचली परत को दो बार घुमाएं (180° पूरा चक्कर)',
    F: 'सामने वाले फलक को घड़ी की दिशा में घुमाएं (दाएं मोड़ें)',
    "F'": 'सामने वाले फलक को घड़ी की विपरीत दिशा में घुमाएं (बाएं मोड़ें)',
    F2: 'सामने वाले फलक को दो बार घुमाएं (180° पूरा चक्कर)',
    B: 'पीछे वाले फलक को घड़ी की दिशा में घुमाएं',
    "B'": 'पीछे वाले फलक को घड़ी की विपरीत दिशा में घुमाएं',
    B2: 'पीछे वाले फलक को दो बार घुमाएं (180° पूरा चक्कर)',
  },
  'hi-hinglish': {
    R: 'राइट साइड को ऊपर की तरफ पुश करें (90° ऊपर)',
    "R'": 'राइट साइड को अपनी तरफ नीचे खींचें (90° नीचे)',
    R2: 'राइट साइड को दो बार घुमाएं (180° डबल टर्न)',
    L: 'लेफ्ट साइड को अपनी तरफ नीचे लाएं (90° नीचे)',
    "L'": 'लेफ्ट साइड को ऊपर की तरफ पुश करें (90° ऊपर)',
    L2: 'लेफ्ट साइड को दो बार घुमाएं (180° डबल टर्न)',
    U: 'टॉप लेयर को क्लॉकवाइज घुमाएं (स्टीयरिंग की तरह लेफ्ट फ्लिक करें)',
    "U'": 'टॉप लेयर को एंटी-क्लॉकवाइज घुमाएं (राइट फ्लिक करें)',
    U2: 'टॉप लेयर को दो बार घुमाएं (180° डबल टर्न)',
    D: 'बॉटम लेयर को क्लॉकवाइज घुमाएं (राइट फ्लिक)',
    "D'": 'बॉटम लेयर को एंटी-क्लॉकवाइज घुमाएं (लेफ्ट फ्लिक)',
    D2: 'बॉटम लेयर को दो बार घुमाएं (180° डबल टर्न)',
    F: 'फ्रंट फेस को स्टीयरिंग की तरह राइट टर्न करें (क्लॉकवाइज 90°)',
    "F'": 'फ्रंट फेस को स्टीयरिंग की तरह लेफ्ट टर्न करें (एंटी-क्लॉकवाइज 90°)',
    F2: 'फ्रंट फेस को दो बार घुमाएं (180° डबल टर्न)',
    B: 'बैक फेस को क्लॉकवाइज घुमाएं',
    "B'": 'बैक फेस को एंटी-क्लॉकवाइज घुमाएं',
    B2: 'बैक फेस को दो बार घुमाएं (180° डबल टर्न)',
  },
  hinglish: {
    R: 'Right side ko upar push karein (90° up)',
    "R'": 'Right side ko apni taraf neeche laayein (90° down)',
    R2: 'Right side ko 2 baar ghumayein (180° turn)',
    L: 'Left side ko apni taraf neeche laayein (90° down)',
    "L'": 'Left side ko upar push karein (90° up)',
    L2: 'Left side ko 2 baar ghumayein (180° turn)',
    U: 'Top layer ko clockwise ghumayein (left flick)',
    "U'": 'Top layer ko counter-clockwise ghumayein (right flick)',
    U2: 'Top layer ko 2 baar ghumayein (180° turn)',
    D: 'Bottom layer ko clockwise ghumayein (right flick)',
    "D'": 'Bottom layer ko counter-clockwise ghumayein (left flick)',
    D2: 'Bottom layer ko 2 baar ghumayein (180° turn)',
    F: 'Front face ko steering wheel ki tarah right ghumaayein (clockwise 90°)',
    "F'": 'Front face ko left ghumaayein (counter-clockwise 90°)',
    F2: 'Front face ko 2 baar ghumaayein (180° turn)',
    B: 'Back face ko clockwise ghumaayein',
    "B'": 'Back face ko counter-clockwise ghumaayein',
    B2: 'Back face ko 2 baar ghumaayein (180° turn)',
  },
};

export function getLocalizedAnalogy(notation: string, lang: AppLanguage = 'en'): string {
  if (!notation) return '';
  const trimmed = notation.trim();
  const dict = MOVE_ANALOGIES[lang] || MOVE_ANALOGIES.en;
  return dict[trimmed] || MOVE_ANALOGIES.en[trimmed] || '';
}

export function t(key: string, lang: AppLanguage = 'en'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}
