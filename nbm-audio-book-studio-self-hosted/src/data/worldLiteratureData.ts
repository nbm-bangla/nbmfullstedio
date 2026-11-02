import { WorldLiteratureWork } from "../types";

export const WORLD_LITERATURE_REGIONS = [
  "All Regions",
  "South Asia (Bengal, India, Pakistan)",
  "East Asia (Japan, China, Korea)",
  "Slavic & Eastern Europe (Russia, Poland, Czechia)",
  "Western Europe (France, Germany, UK, Ireland)",
  "Mediterranean & Southern Europe (Italy, Spain, Greece)",
  "Middle East & North Africa (Iran, Egypt, Turkey, Arabia)",
  "Latin America (Brazil, Mexico, Argentina, Colombia)",
  "Sub-Saharan Africa (Nigeria, South Africa, Kenya)",
  "North America (USA, Canada)",
];

export const WORLD_LITERATURE_WORKS: WorldLiteratureWork[] = [
  // 1. Bengali Classic - Rabindranath Tagore
  {
    id: "gitanjali-tagore",
    title: "Gitanjali (Song Offerings)",
    bengaliTitle: "গীতাঞ্জলি",
    author: "Rabindranath Tagore",
    bengaliAuthor: "রবীন্দ্রনাথ ঠাকুর",
    country: "Bangladesh & India",
    region: "South Asia (Bengal, India, Pakistan)",
    originalLanguage: "Bengali",
    epoch: "Early 20th Century (1910)",
    movement: "Bengali Renaissance / Mysticism",
    synopsis: "A collection of devotional lyrics celebrating the intimate communion between the human soul, the infinite divine, and the lush seasonal tapestry of Bengal.",
    bengaliSynopsis: "রবীন্দ্রনাথ ঠাকুরের রচিত বিশ্বনন্দিত ভক্তিমূলক ও আত্মনিবেদনের কবিতা ও গানের অমর সংকলন, যার মধ্য দিয়ে মানবাত্মা ও বিশ্বপ্রকৃতির গভীর নিবিড় যোগ উন্মোচিত হয়েছে।",
    publicDomain: true,
    licenseDetails: "Public Domain worldwide (Published 1910; Nobel Prize 1913)",
    openSourceUrl: "https://www.gutenberg.org/ebooks/7164",
    sourceAttribution: "Project Gutenberg #7164 / Bengali Wikisource",
    recommendedTranslations: ["Bengali Original", "English (Tagore's Own Prose)", "French (André Gide)"],
    sampleText: `আমার মাথা নত করে দাও হে তোমার চরণধূলার তলে।
সকল অহংকার হে আমার ডুবাও চোখের জলে।
নিজেরে করিতে গৌরব দান নিজেরে কেবলি করি অপমান,
আপনারে শুধু ঘেরিয়া ঘেরিয়া ঘুরে মরি পলে পলে।
সকল অহংকার হে আমার ডুবাও চোখের জলে।`,
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
  },

  // 2. Bengali Pastoral Masterpiece - Bibhutibhushan Bandyopadhyay
  {
    id: "pather-panchali",
    title: "Pather Panchali (Song of the Little Road)",
    bengaliTitle: "পথের পাঁচালী",
    author: "Bibhutibhushan Bandyopadhyay",
    bengaliAuthor: "বিভূতিভূষণ বন্দ্যোপাধ্যায়",
    country: "Bangladesh & India",
    region: "South Asia (Bengal, India, Pakistan)",
    originalLanguage: "Bengali",
    epoch: "Interwar Period (1929)",
    movement: "Realism / Rural Pastoralism",
    synopsis: "The poignant childhood saga of siblings Apu and Durga amidst poverty, rural folklore, and the enchanting, untamed beauty of Nischindipur village.",
    bengaliSynopsis: "নিশ্চিন্দিপুরের পল্লীপ্রকৃতির বুকে অপু ও দুর্গার শৈশব, দারিদ্র্যের মধ্যেও জীবনের অবারিত আনন্দ, কাশবন ও কাশবনের ওপারে ট্রেনের রোমাঞ্চের চিরন্তন আখ্যান।",
    publicDomain: true,
    licenseDetails: "Public Domain in India & Bangladesh (Author died 1950)",
    openSourceUrl: "https://bn.wikisource.org/wiki/পথের_পাঁচালী",
    sourceAttribution: "Wikisource Bengali Literary Heritage Archive",
    recommendedTranslations: ["Bengali Original", "English (T.W. Clark & Tarapada Mukherji)"],
    sampleText: `অপু চোখ মেলিয়া দেখিল—সকাল হইয়াছে। জানালার বাহিরে বুনো ডুমুরের ডালে একটা দোয়েল বসিয়া লেজ নাচাইতেছে। উঠানের বাঁশঝাড়ের ওপার হইতে দূর মাঠের কাশবনের নরম বাতাস আসিতেছে।

দিদি দুর্গা আসিয়া চুপি চুপি বলিল, "অপু, ওঠ রে ওঠ! রেলরাস্তার ওপারে আজ নতুন কি একটা ফুল ফুটেছে, দেখবি চল।" অপু অমনি উঠিয়া তাহার হাত ধরিল।`,
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
  },

  // 3. Hindi Masterpiece - Munshi Premchand
  {
    id: "godaan-premchand",
    title: "Godaan (The Gift of a Cow)",
    bengaliTitle: "গোদান",
    author: "Munshi Premchand",
    bengaliAuthor: "মুন্সী প্রেমচন্দ",
    country: "India",
    region: "South Asia (Bengal, India, Pakistan)",
    originalLanguage: "Hindi",
    epoch: "Colonial Era (1936)",
    movement: "Progressive Writers Movement / Peasant Realism",
    synopsis: "The quintessential epic of Indian rural life, revolving around Hori Mahato, an impoverished peasant whose lifelong yearning is to own a sacred milch cow.",
    bengaliSynopsis: "ভারতীয় কৃষক জীবনের কালজয়ী মহাকাব্যিক উপন্যাস। কৃষক হোড়ির আজন্ম লালিত স্বপ্ন একটি গাই বলদের মালিক হওয়া, যা গ্রামীণ মহাজনতন্ত্র ও দারিদ্র্যের নিদারুণ বাস্তবতায় পর্যবসিত হয়।",
    publicDomain: true,
    licenseDetails: "Public Domain (Published 1936; Premchand died 1936)",
    openSourceUrl: "https://archive.org/details/godan-premchand",
    sourceAttribution: "Internet Archive Hindi Classical Repository",
    recommendedTranslations: ["Bengali (Nirmal Sen / Subhash Mukhopadhyay)", "English (Gordon C. Roadarmel)"],
    sampleText: `होरी ने दोनों बैलों को सानी-पानी देकर अपनी पत्नी धनिया से कहा—गोबर को ज़रा चिलम भरने के लिए कह दो। वह लाठी टेकता हुआ द्वार पर आकर बैठ गया।

धनिया ने घर से निकलकर डाँटते हुए कहा—तुम तो हर बात में हुकुम चलाने लगते हो। लड़का खेत में खाद फेंकने गया है, अभी लौटकर नहीं आया। तुम्हारा बुढ़ापा आ गया पर अक्ल न आई।`,
    coverImage: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
  },

  // 4. Urdu Masterpiece - Saadat Hasan Manto
  {
    id: "toba-tek-singh-manto",
    title: "Toba Tek Singh and Other Stories",
    bengaliTitle: "টোবা টেক সিং",
    author: "Saadat Hasan Manto",
    bengaliAuthor: "সাদাত হাসান মান্টো",
    country: "Pakistan & India",
    region: "South Asia (Bengal, India, Pakistan)",
    originalLanguage: "Urdu",
    epoch: "Partition of India (1955)",
    movement: "Psychological Satire / Post-Partition Literature",
    synopsis: "A biting allegorical satire set in a Lahore asylum where inmates are to be partitioned between India and Pakistan based on religion, centering on Bishan Singh.",
    bengaliSynopsis: "দেশভাগের উন্মাদনা ও ট্র্যাজেডির সবচেয়ে তীক্ষ্ণ সাহিত্যিক দলিল। লাহোরের এক পাগলাগারদের নিবাসী বিশেন সিং-এর মাধ্যমে দুই দেশের সীমানার মধ্যকার 'নো ম্যানস ল্যান্ড'-এর মর্মস্পর্শী রূপ।",
    publicDomain: true,
    licenseDetails: "Public Domain (Manto passed away 1955)",
    openSourceUrl: "https://archive.org/details/toba-tek-singh-urdu",
    sourceAttribution: "Rekhta / Internet Archive South Asian Literary Archives",
    recommendedTranslations: ["Bengali (Javed Huda)", "English (Aatish Taseer / Khalid Hasan)"],
    sampleText: `بٹوارے کے دو تین سال بعد پاکستان اور ہندوستان کی حکومتوں کو خیال آیا کہ اخلاقی قیدیوں کی طرح پاگلوں کا بھی تبادلہ ہونا چاہیے، یعنی جو مسلمان پاگل ہندوستان کے پاگل خانوں میں ہیں انہیں پاکستان پہنچا دیا جائے اور جو ہندو اور سکھ پاکستان کے پاگل خانوں میں ہیں، انہیں ہندوستان کے حوالے کر دیا جائے۔

وہاں باغ میں ایک درخت پر چڑھا ہوا ایک پاگل نیچے بیٹھے بشن سنگھ سے بولا: "اوپڑی گڑ گڑ دی انیکس دی بے دھیانا دی منگ دی دال آف دی پاکستان اینڈ ہندوستان آف دی در فٹے منہ!"`,
    coverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80",
  },

  // 5. Arabic Masterpiece - Naguib Mahfouz
  {
    id: "palace-walk-mahfouz",
    title: "Palace Walk (Bayn al-Qasrayn)",
    bengaliTitle: "বায়ন আল-কাসরায়িন (কায়রো ট্রিলজি ১)",
    author: "Naguib Mahfouz",
    bengaliAuthor: "নাগিব মাহফুজ",
    country: "Egypt",
    region: "Middle East & North Africa (Iran, Egypt, Turkey, Arabia)",
    originalLanguage: "Arabic",
    epoch: "Mid 20th Century (1956)",
    movement: "Arabic Social Realism / Historic Epic",
    synopsis: "The patriarchal home of al-Sayyid Ahmad Abd al-Jawad against the turbulent backdrop of the 1919 Egyptian revolution against British colonial rule.",
    bengaliSynopsis: "১৯১৯ সালের ব্রিটিশবিরোধী বিপ্লবকালের কায়রোর এক প্রাচীন পারিবারিক কাঠামো, কঠোর অনুশাসন এবং রাজনৈতিক জাগরণের এক মহাকাব্যিক সামাজিক দলিল।",
    publicDomain: false,
    licenseDetails: "Copyright Protected (Dar el-Shorouk / AUC Press). Editorial excerpt provided.",
    openSourceUrl: "https://archive.org/details/palacewalkcairotrilogy00mahf",
    sourceAttribution: "Internet Archive Open Library Record / AUC Press",
    recommendedTranslations: ["English (William Maynard Hutchins)", "Bengali Translation (Shamsur Rahman)"],
    sampleText: `استيقظت أمينة في منتصف الليل. وكانت تستيقظ دائماً في هذه الساعة، لا تتقدم دقيقة ولا تتأخر، كأنما ينبهها منبه غيبي مودع في أعماق روحها. 

كان البيت الحجري القديم غارقاً في صمت مهيب، إلا من صدى بعيد لعجلات عربة حنطور تتهادى فوق بلاط شارع النحاسين المبلل بالندى. نظرت نحو الفراش الخالي في انتظار عودة السيد.`,
    coverImage: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
  },

  // 6. Russian Masterpiece - Fyodor Dostoevsky
  {
    id: "crime-punishment-dostoevsky",
    title: "Crime and Punishment",
    bengaliTitle: "অপরাধ ও শাস্তি",
    author: "Fyodor Dostoevsky",
    bengaliAuthor: "ফিয়োদর দস্তয়েভস্কি",
    country: "Russia",
    region: "Slavic & Eastern Europe (Russia, Poland, Czechia)",
    originalLanguage: "Russian",
    epoch: "Late 19th Century (1866)",
    movement: "Psychological Realism / Existentialism",
    synopsis: "Rodion Raskolnikov's harrowing internal ordeal after murdering a corrupt pawnbroker to prove his theory of the exceptional individual.",
    bengaliSynopsis: "সেন্ট পিটার্সবার্গের তীব্র দারিদ্র্য ও এক তরুণ ছাত্র রাসকোলনিকভের মনে জেগে ওঠা অতিমানবীয় তত্ত্ব, অপরাধবোধ ও শেষপর্যন্ত আত্মিক পুনর্জন্মের বিশ্ববিখ্যাত মহাকাব্য।",
    publicDomain: true,
    licenseDetails: "Public Domain worldwide (Published 1866)",
    openSourceUrl: "https://www.gutenberg.org/ebooks/2554",
    sourceAttribution: "Project Gutenberg #2554 / Russian Wikisource",
    recommendedTranslations: ["Bengali (Nani Bhowmik)", "English (Constance Garnett / Pevear & Volokhonsky)"],
    sampleText: `В начале июля, в чрезвычайно жаркое время, под вечер, один молодой человек вышел из своей каморки, которую нанимал от жильцов в С — м переулке, на улицу и медленно, как бы в нерешимости, отправился к К — ну мосту.

Он благополучно избегнул встречи с своею хозяйкой на лестнице. Каморка его приходилась под самою кровлей высокого пятиэтажного дома и походила более на шкаф, чем на квартиру.`,
    coverImage: "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=600&auto=format&fit=crop&q=80",
  },

  // 7. English Masterpiece - Charles Dickens
  {
    id: "great-expectations-dickens",
    title: "Great Expectations",
    bengaliTitle: "গ্রেট এক্সপেক্টেশনস",
    author: "Charles Dickens",
    bengaliAuthor: "চার্লস ডিকেন্স",
    country: "United Kingdom",
    region: "Western Europe (France, Germany, UK, Ireland)",
    originalLanguage: "English",
    epoch: "Victorian Era (1861)",
    movement: "Victorian Realism / Bildungsroman",
    synopsis: "The orphan Pip encounters an escaped convict in a misty churchyard and later enters the decaying mansion of Miss Havisham, shaping his fortune.",
    bengaliSynopsis: "কুয়াশাচ্ছন্ন সমাধিভূমিতে পলাতক কয়েদি ম্যাগউইচের সঙ্গে কিশোর পিপের সাক্ষাৎ এবং রহস্যময়ী মিস হ্যাভিশামের পোড়ো বাড়িতে তার ভাগ্যান্বেষণের অমর আখ্যান।",
    publicDomain: true,
    licenseDetails: "Public Domain worldwide (Published 1861)",
    openSourceUrl: "https://www.gutenberg.org/ebooks/1400",
    sourceAttribution: "Project Gutenberg #1400",
    recommendedTranslations: ["Bengali (Ashraf Siddiqui)", "English Original"],
    sampleText: `My father’s family name being Pirrip, and my christian name Philip, my infant tongue could make of both names nothing longer or more explicit than Pip. So, I called myself Pip, and came to be called Pip.

The marshes were just a long black horizontal line then, as I stopped to look after him; and the sky was just a row of long angry red lines and dense black lines intermixed. On the edge of the river stood the gibbet, with the chains hanging to it.`,
    coverImage: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80",
  },

  // 8. French Masterpiece - Albert Camus
  {
    id: "the-stranger-camus",
    title: "The Stranger (L'Étranger)",
    bengaliTitle: "দ্য স্ট্রেঞ্জার / বহিরাগত",
    author: "Albert Camus",
    bengaliAuthor: "আলবেয়ার কামু",
    country: "France & Algeria",
    region: "Western Europe (France, Germany, UK, Ireland)",
    originalLanguage: "French",
    epoch: "Mid 20th Century (1942)",
    movement: "Absurdism / Philosophy of the Absurd",
    synopsis: "Meursault's detached existence under the scorching Algiers sun culminates in an inexplicable shooting and a society demanding theatrical remorse.",
    bengaliSynopsis: "আলজিয়ার্সের রোদে ঝলসানো সৈকত, নিঃস্পৃহ মরসো এবং মানবসমাজের আরোপিত আবেগ ও আদালতের ভন্ডামির বিরুদ্ধে এক অনবদ্য অস্তিত্ববাদী আখ্যান।",
    publicDomain: false,
    licenseDetails: "Copyright Protected (Éditions Gallimard). Editorial excerpt for study.",
    openSourceUrl: "https://archive.org/details/thestranger00camu",
    sourceAttribution: "Internet Archive Lending Library / Gallimard",
    recommendedTranslations: ["Bengali Literary (Manabendra Bandyopadhyay)", "English (Matthew Ward)"],
    sampleText: `Aujourd'hui, maman est morte. Ou peut-être hier, je ne sais pas. J'ai reçu un télégramme de l'asile: « Mère décédée. Enterrement demain. Sentiments distingués. » Cela ne veut rien dire. C'était peut-être hier.

L'asile de vieillards est à Marengo, à quatre-vingts kilomètres d'Alger. Je prendrai l'autobus à deux heures et j'arriverai dans l'après-midi. Ainsi, je pourrai veiller et je rentrerai demain soir.`,
    coverImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80",
  },

  // 9. German Masterpiece - Franz Kafka
  {
    id: "the-metamorphosis-kafka",
    title: "The Metamorphosis (Die Verwandlung)",
    bengaliTitle: "রূপান্তর (দ্য মেটামরফোসিস)",
    author: "Franz Kafka",
    bengaliAuthor: "ফ্রাঞ্জ কাফকা",
    country: "Austria-Hungary & Czechia",
    region: "Western Europe (France, Germany, UK, Ireland)",
    originalLanguage: "German",
    epoch: "Early 20th Century (1915)",
    movement: "Modernist Expressionism / Absurdism",
    synopsis: "Gregor Samsa awakes one morning to find himself transformed into a monstrous insect, confronting the alienation of familial dependency.",
    bengaliSynopsis: "এক সকালে ঘুম ভেঙে গ্রেগর সামসা আবিষ্কার করে যে সে এক বিশাল পতঙ্গে রূপান্তরিত হয়েছে। পরিবারের নির্মম উপেক্ষা ও মানুষের অস্তিত্বের চরম বিচ্ছিন্নতার মর্মস্পর্শী রূপ।",
    publicDomain: true,
    licenseDetails: "Public Domain worldwide (Published 1915)",
    openSourceUrl: "https://www.gutenberg.org/ebooks/5200",
    sourceAttribution: "Project Gutenberg #5200",
    recommendedTranslations: ["Bengali (Kabir Chowdhury / Manabendra Bandyopadhyay)", "English (Willa & Edwin Muir)"],
    sampleText: `Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheuren Ungeziefer verwandelt. Er lag auf seinem panzerartig harten Rücken und sah, wenn er den Kopf ein wenig hob, seinen gewölbten, braunen, von bogenförmigen Versteifungen geteilten Bauch.

»Was ist mit mir geschehen?« dachte er. Es war kein Traum. Sein Zimmer, ein richtiges, nur etwas zu kleines Menschenzimmer, lag ruhig zwischen den vier wohlbekannten Wänden.`,
    coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
  },

  // 10. Japanese Masterpiece - Ryunosuke Akutagawa
  {
    id: "rashomon-akutagawa",
    title: "Rashomon and In a Grove",
    bengaliTitle: "রাশোমোন ও অন্যান্য গল্প",
    author: "Ryunosuke Akutagawa",
    bengaliAuthor: "রিউনোসুকে আকুতাগাওয়া",
    country: "Japan",
    region: "East Asia (Japan, China, Korea)",
    originalLanguage: "Japanese",
    epoch: "Taisho Era (1915)",
    movement: "Japanese Modernism / Psychological Realism",
    synopsis: "A masterwork probing subjective truth, human survival, and ethical ambiguity under the ruined medieval gate of Kyoto.",
    bengaliSynopsis: "ধ্বংসপ্রাপ্ত কিয়োটো নগরের ফটকে মানুষের অস্তিত্ব রক্ষার নৈতিক দ্বন্দ্ব ও পরম সত্যের বহুমাত্রিক রূপের মনস্তাত্ত্বিক অনুসন্ধান।",
    publicDomain: true,
    licenseDetails: "Public Domain (Aozora Bunko Open Archive)",
    openSourceUrl: "https://www.aozora.gr.jp/cards/000879/card127.html",
    sourceAttribution: "Aozora Bunko Japanese National Digital Archive #127",
    recommendedTranslations: ["English (Takashi Kojima)", "Bengali Literary Translation (Hashem Khan)"],
    sampleText: `ある日の暮方の事である。一人の下人が、羅生門の修理待ちの雨やみを待っていた。

広い門の下には、この男のほかに誰もいない。ただ、所々丹塗の剥げた、大きな円柱に、蟋蟀が一匹とまっている。羅生門が、朱雀大路にある以上は、この男のほかにも、雨やみをする市女笠や揉烏帽子が、もう二三人はありそうなものである。それが、この男のほかには誰もいない。`,
    coverImage: "https://images.unsplash.com/photo-1528164344705-475426879c0d?w=600&auto=format&fit=crop&q=80",
  },

  // 11. Persian Masterpiece - Sadegh Hedayat
  {
    id: "blind-owl-hedayat",
    title: "The Blind Owl (Boof-e Koor)",
    bengaliTitle: "অন্ধ পেঁচা (বুফ-ই কুর)",
    author: "Sadegh Hedayat",
    bengaliAuthor: "সাদেক হেদায়েত",
    country: "Iran",
    region: "Middle East & North Africa (Iran, Egypt, Turkey, Arabia)",
    originalLanguage: "Persian",
    epoch: "Interwar Period (1937)",
    movement: "Persian Surrealism / Modernist Gothic",
    synopsis: "A pen-case painter in isolation writes down his hallucinatory visions of an ethereal woman, an old shadow-figure, and the inescapable cycle of decay.",
    bengaliSynopsis: "ফারসি সাহিত্যের আধুনিকতম সুররিয়ালিস্টিক উপন্যাস; কলমদানির চিত্রশিল্পীর বিভ্রম, অন্ধকার ঘর ও এক চিরন্তন ছায়ার কাছে নিজের স্বীকারোক্তি।",
    publicDomain: true,
    licenseDetails: "Public Domain in Iran & worldwide (Published in Bombay, 1937)",
    openSourceUrl: "https://archive.org/details/theblindowl_202003",
    sourceAttribution: "Internet Archive Persian Literature Heritage",
    recommendedTranslations: ["Bengali Edition (Dr. Shafiul Alam)", "English (D.P. Costello)"],
    sampleText: `در زندگی زخم‌هایی هست که مثل خوره روح را آهسته در انزوا می‌تراشد و می‌پوشاند. این دردها را نمی‌شود به کسی اظهار کرد، چون عموماً عادت دارند که این دردهای باورنکردنی را جزو اتفاقات و پیش‌آمدهای نادر و عجیب بشمارند.

تنها مرگم را می‌خواهم، چون زندگی برای من باری سنگین و غیرقابل تحمل شده است. می‌خواهم برای سایه‌ام بنویسم که روی دیوار روبرویم خم شده و انگار تمام حرف‌های مرا با دقت می‌بلعد.`,
    coverImage: "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=600&auto=format&fit=crop&q=80",
  },

  // 12. Spanish Masterpiece - Miguel de Cervantes
  {
    id: "don-quixote-cervantes",
    title: "Don Quixote de la Mancha",
    bengaliTitle: "দন কিহোতে দে লা মাঞ্চা",
    author: "Miguel de Cervantes",
    bengaliAuthor: "মিগেল দে থের্ভান্তেস",
    country: "Spain",
    region: "Mediterranean & Southern Europe (Italy, Spain, Greece)",
    originalLanguage: "Spanish",
    epoch: "Golden Age (1605)",
    movement: "Picaresque / Modern Novel Pioneer",
    synopsis: "An aging Spanish nobleman loses his wits reading romances of chivalry and sets out on horseback with his faithful squire Sancho Panza to revive knighthood.",
    bengaliSynopsis: "বীরত্বগাথা পড়ে উদ্বুদ্ধ এক বুড়ো স্প্যানিশ অভিজাত ও তার অনুগত সাগরেদ সাঞ্চো পানজার বাতাসের কলে (উইন্ডমিল) যুদ্ধ করতে যাওয়ার বিশ্বখ্যাত রোমাঞ্চ ও ট্র্যাজিকমেডি।",
    publicDomain: true,
    licenseDetails: "Public Domain worldwide (Published 1605)",
    openSourceUrl: "https://www.gutenberg.org/ebooks/996",
    sourceAttribution: "Project Gutenberg #996 / Biblioteca Nacional de España",
    recommendedTranslations: ["Bengali (Narendranath Mitra / Syed Mujtaba Ali)", "English (Edith Grossman / John Ormsby)"],
    sampleText: `En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.

Una olla de algo más vaca que carnero, salpicón las más noches, duelos y quebrantos los sábados, lantejas los viernes, algún palomino de añadidura los domingos, consumían las tres partes de su hacienda.`,
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
  },

  // 13. Chinese Masterpiece - Lu Xun
  {
    id: "true-story-ah-q-luxun",
    title: "The True Story of Ah Q",
    bengaliTitle: "আ কিউ-এর সত্য কাহিনী",
    author: "Lu Xun",
    bengaliAuthor: "লু শুন",
    country: "China",
    region: "East Asia (Japan, China, Korea)",
    originalLanguage: "Chinese",
    epoch: "May Fourth Movement (1921)",
    movement: "Modern Chinese Realism / Satire",
    synopsis: "An incisive satire of spiritual victories and national self-deception in early 20th-century China through the misadventures of peasant Ah Q.",
    bengaliSynopsis: "আধুনিক চীনা সাহিত্যের শ্রেষ্ঠ স্যাটায়ার। কল্পিত মানসিক জয়ের মাধ্যমে নিজের অপমান ও পরাজয়কে আত্মতৃপ্তিতে বদলে নেওয়ার মনস্তাত্ত্বিক প্রতিচ্ছবি।",
    publicDomain: true,
    licenseDetails: "Public Domain worldwide (Published 1921)",
    openSourceUrl: "https://www.gutenberg.org/ebooks/2534",
    sourceAttribution: "Project Gutenberg Chinese Archive #2534",
    recommendedTranslations: ["Bengali (Rezaul Karim)", "English (Yang Hsien-yi & Gladys Yang)"],
    sampleText: `我要给阿Q做正传，已经不止一两年了。但一面要做，一面又往回想，这足见我不是一个“立言”的人，因为从来以至诚动天地的人，是没有像我这样踌躇不决的。

然而想到究竟，还是不能不写。阿Q没有固定的家，就住在未庄的土谷祠里；也没有固定的职业，只给人家做短工，割麦便割麦，舂米便舂米，摇船便摇船。`,
    coverImage: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?w=600&auto=format&fit=crop&q=80",
  },
];
