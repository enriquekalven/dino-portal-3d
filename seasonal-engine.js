/**
 * Atlas of Wonder Family — Universal Seasonal & Global Holiday Engine (JS)
 * Drop-in standalone script (IIFE) compatible with strict CSP (script-src 'self',
 * style-src 'self'), zero unsafe DOM sinks, zero inline styles, 13-language support,
 * automatic Day/Night surface detection, and 25 seasons + world/USA holidays.
 */
(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__aowSeasonalMounted) return;
  window.__aowSeasonalMounted = true;

  var STORAGE_SEASON = 'aow-season';
  var STORAGE_CALM = 'aow-season-calm';
  var STORAGE_COMPACT = 'aow-season-compact';

  var SEASON_THEMES = [
    {
      id: 'spring', category: 'season', emoji: '🌸', effect: 'sakura', dateHint: 'Mar 20 – Jun 19',
      colors: ['#f472b6', '#f9a8d4', '#fbcfe8', '#34d399', '#fda4af'],
      labels: { en: 'Spring', es: 'Primavera', zh: '春季', yue: '春季', ja: '春', ko: '봄', pt: 'Primavera', fr: 'Printemps', it: 'Primavera', de: 'Frühling', ar: 'الربيع', hi: 'वसंत', vi: 'Mùa xuân' },
      greetings: {
        en: 'Spring in bloom — drifting sakura petals & curious discoveries',
        es: 'Primavera en flor — pétalos de cerezo y nuevos descubrimientos',
        zh: '春暖花开 · 樱花漫舞，开启探索之旅',
        yue: '春暖花開 · 櫻花飄舞，展開探索之旅',
        ja: '春爛漫 · 舞い散る桜とともに新しい発見を',
        ko: '봄꽃 만개 · 흩날리는 벚꽃과 함께하는 탐험',
        pt: 'Primavera em flor — pétalas de cerejeira e novas descobertas',
        fr: 'Printemps en fleurs — pétales de cerisier et découvertes',
        it: 'Primavera in fiore — petali di ciliegio e nuove scoperte',
        de: 'Frühlingsblüte — tanzende Kirschblüten und Entdeckungen',
        ar: 'إشراقة الربيع — بتلات الكرز المتطايرة واكتشافات جديدة',
        hi: 'वसंत ऋतु — खिलते फूल और नई खोजें',
        vi: 'Mùa xuân nở rộ — cánh hoa anh đào và khám phá mới'
      }
    },
    {
      id: 'summer', category: 'season', emoji: '☀️', effect: 'fireflies', dateHint: 'Jun 20 – Sep 21',
      colors: ['#fbbf24', '#2dd4bf', '#fb923c', '#38bdf8', '#fde047'],
      labels: { en: 'Summer', es: 'Verano', zh: '夏季', yue: '夏季', ja: '夏', ko: '여름', pt: 'Verão', fr: 'Été', it: 'Estate', de: 'Sommer', ar: 'الصيف', hi: 'ग्रीष्म', vi: 'Mùa hè' },
      greetings: {
        en: 'Golden Summer — sunlit skies & glowing evening fireflies',
        es: 'Verano dorado — cielos soleados y luciérnagas brillantes',
        zh: '盛夏流光 · 阳光海岸与夏夜流萤',
        yue: '盛夏流光 · 陽光海岸與夏夜螢火蟲',
        ja: '黄金の夏 · 輝く太陽と蛍のきらめき',
        ko: '황금빛 여름 · 따스한 햇살과 반딧불이',
        pt: 'Verão dourado — dias de sol e vaga-lumes iluminados',
        fr: 'Été doré — soleil radieux et lucioles scintillantes',
        it: 'Estate dorata — sole luminoso e lucciole scintillanti',
        de: 'Goldener Sommer — Sonnenschein und Glühwürmchen',
        ar: 'صيف ذهبي — أشعة الشمس الدافئة واليراعات المضيئة',
        hi: 'सुनहरी गर्मी — चमकती धूप और जुगनू',
        vi: 'Mùa hè rực rỡ — nắng vàng và đom đóm lung linh'
      }
    },
    {
      id: 'fall', category: 'season', emoji: '🍂', effect: 'leaves', dateHint: 'Sep 22 – Dec 20',
      colors: ['#ea580c', '#d97706', '#dc2626', '#f59e0b', '#b45309'],
      labels: { en: 'Autumn', es: 'Otoño', zh: '秋季', yue: '秋季', ja: '秋', ko: '가을', pt: 'Outono', fr: 'Automne', it: 'Autunno', de: 'Herbst', ar: 'الخريف', hi: 'शरद', vi: 'Mùa thu' },
      greetings: {
        en: 'Crisp Autumn — cozy amber warmth & tumbling maple leaves',
        es: 'Otoño acogedor — tonos ámbar cálidos y hojas de arce',
        zh: '金秋枫韵 · 温暖琥珀光影与翩跹红叶',
        yue: '金秋楓韻 · 溫暖琥珀光影與飄舞紅葉',
        ja: '実りの秋 · 琥珀色の温もりと舞い落ちる紅葉',
        ko: '깊어가는 가을 · 따뜻한 호박빛과 춤추는 단풍잎',
        pt: 'Outono acolhedor — tons de âmbar e folhas de bordo',
        fr: 'Automne doré — teintes ambrées et feuilles d’érable',
        it: 'Autunno dorato — calde sfumature ambrate e foglie d’acero',
        de: 'Goldener Herbst — warme Bernsteintöne und Ahornblätter',
        ar: 'خريف دافئ — ألوان العنبر وأوراق القيقب المتساقطة',
        hi: 'सुहानी शरद ऋतु — सुनहरे पत्ते और हल्की ठंडक',
        vi: 'Mùa thu dịu mát — sắc hổ phách ấm áp và lá phong rơi'
      }
    },
    {
      id: 'winter', category: 'season', emoji: '❄️', effect: 'snow', dateHint: 'Dec 21 – Mar 19',
      colors: ['#7dd3fc', '#bae6fd', '#c4b5fd', '#38bdf8', '#e0f2fe'],
      labels: { en: 'Winter', es: 'Invierno', zh: '冬季', yue: '冬季', ja: '冬', ko: '겨울', pt: 'Inverno', fr: 'Hiver', it: 'Inverno', de: 'Winter', ar: 'الشتاء', hi: 'शीत', vi: 'Mùa đông' },
      greetings: {
        en: 'Winter Wonderland — softly drifting snowflakes & aurora glow',
        es: 'Invierno sereno — copos de nieve suaves y destellos de aurora',
        zh: '冬日雪境 · 漫天飞雪与静谧极光',
        yue: '冬日雪境 · 漫天飛雪與靜謐極光',
        ja: '冬のきらめき · 舞い降る雪の結晶とオーロラ',
        ko: '겨울 동화 · 포근히 내리는 눈송이와 오로라',
        pt: 'Inverno sereno — flocos de neve suaves e brilho boreal',
        fr: 'Hiver féerique — flocons de neige et lueur boréale',
        it: 'Inverno incantato — fiocchi di neve e luce boreale',
        de: 'Winterzauber — sanfte Schneeflocken und Polarlicht',
        ar: 'شتاء هادئ — ندفا الثلج المتهادية وضوء الشفق',
        hi: 'सर्दियों का जादू — गिरती बर्फ़ और शांत आकाश',
        vi: 'Mùa đông kỳ diệu — bông tuyết rơi nhẹ và cực quang'
      }
    },
    {
      id: 'new-year', category: 'holiday', emoji: '🎆', effect: 'fireworks', dateHint: 'Jan 1',
      colors: ['#fbbf24', '#a855f7', '#38bdf8', '#fb7185', '#fde047'],
      labels: { en: 'New Year', es: 'Año Nuevo', zh: '元旦', yue: '元旦', ja: '新年', ko: '새해', pt: 'Ano Novo', fr: 'Nouvel An', it: 'Capodanno', de: 'Neujahr', ar: 'رأس السنة', hi: 'नव वर्ष', vi: 'Năm mới' },
      greetings: { en: 'Happy New Year! Wishing you a year full of wonder & discovery', es: '¡Feliz Año Nuevo! Un año lleno de asombro y descubrimientos', zh: '新年快乐！愿新的一年充满好奇与惊喜', yue: '新年快樂！願新一年充滿好奇與驚喜', ja: 'あけましておめでとうございます！発見に満ちた一年を', ko: '새해 복 많이 받으세요! 경이로움이 가득한 한 해 되시길', pt: 'Feliz Ano Novo! Um ano repleto de descobertas', fr: 'Bonne Année ! Une année pleine de découvertes', it: 'Buon Anno! Un anno ricco di meraviglia', de: 'Frohes neues Jahr! Ein Jahr voller Entdeckungen', ar: 'عام سعيد! عام مليء بالدهشة والاكتشاف', hi: 'नव वर्ष की शुभकामनाएँ!', vi: 'Chúc Mừng Năm Mới!' }
    },
    {
      id: 'mlk-day', category: 'holiday', emoji: '🕊️', effect: 'stars', dateHint: 'Jan (3rd Mon)',
      colors: ['#fbbf24', '#60a5fa', '#a78bfa', '#f59e0b', '#93c5fd'],
      labels: { en: 'MLK Day', es: 'Día MLK', zh: 'MLK 纪念日', yue: 'MLK 紀念日', ja: 'MLKデー', ko: 'MLK 데이', pt: 'Dia de MLK', fr: 'Jour de MLK', it: 'Giorno MLK', de: 'MLK-Tag', ar: 'يوم مارتن لوثر كينغ', hi: 'एमएलके दिवस', vi: 'Ngày MLK' },
      greetings: { en: 'MLK Jr. Day — honoring empathy, courage, community & service', es: 'Día de MLK Jr. — empatía, valentía y comunidad', zh: '马丁·路德·金纪念日 · 致敬勇气与同理心', yue: '馬丁·路德·金紀念日 · 致敬勇氣與同理心', ja: 'キング牧師記念日 · 共感と勇気を讃えて', ko: '마틴 루터 킹 데이 · 공감과 용기를 기리며', pt: 'Dia de MLK Jr. — empatia, coragem e comunidade', fr: 'Journée MLK Jr. — empathie, courage et fraternité', it: 'Giornata MLK Jr. — empatia, coraggio e comunità', de: 'MLK-Tag — Empathie, Mut und Gemeinschaft', ar: 'يوم مارتن لوثر كينغ — تكريماً للتعاطف والشجاعة', hi: 'मार्टिन लूथर किंग जूनियर दिवस — साहस और करुणा', vi: 'Ngày MLK Jr. — tôn vinh lòng dũng cảm và sự đồng cảm' }
    },
    {
      id: 'lunar-new-year', category: 'holiday', emoji: '🏮', effect: 'lanterns', dateHint: 'Jan / Feb',
      colors: ['#ef4444', '#fbbf24', '#dc2626', '#fde047', '#f97316'],
      labels: { en: 'Lunar NY', es: 'Año Lunar', zh: '春节', yue: '農曆新年', ja: '春節', ko: '설날', pt: 'Ano Lunar', fr: 'Nouvel An Lunaire', it: 'Capodanno Lunare', de: 'Mondneujahr', ar: 'رأس السنة القمرية', hi: 'चंद्र नववर्ष', vi: 'Tết Nguyên Đán' },
      greetings: { en: 'Happy Lunar New Year · 新春快乐! Glowing lanterns & good fortune', es: '¡Feliz Año Nuevo Lunar · 新春快乐! Linternas rojas y buena fortuna', zh: '新春快乐 · 恭喜发财！红灯高挂，万事胜意', yue: '新春快樂 · 恭喜發財！花燈映照，萬事如意', ja: '春節おめでとうございます！赤いランタンと幸福な一年を', ko: '즐거운 설날 보내세요! 행복과 행운이 가득하길', pt: 'Feliz Ano Novo Lunar! Lanternas douradas e boa sorte', fr: 'Joyeux Nouvel An Lunaire ! Lanternes rouges et prospérité', it: 'Felice Capodanno Lunare! Lanterne rosse e fortuna', de: 'Frohes Mondneujahr! Leuchtende Laternen und viel Glück', ar: 'سنة قمرية سعيدة! فوانيس مضيئة وحظ سعيد', hi: 'चंद्र नववर्ष की शुभकामनाएँ!', vi: 'Chúc Mừng Năm Mới Âm Lịch · Vạn Sự Như Ý!' }
    },
    {
      id: 'valentines', category: 'holiday', emoji: '💝', effect: 'hearts', dateHint: 'Feb 14',
      colors: ['#f43f5e', '#fb7185', '#f472b6', '#fda4af', '#e11d48'],
      labels: { en: "Valentine's", es: 'San Valentín', zh: '情人节', yue: '情人節', ja: 'バレンタイン', ko: '발렌타인', pt: 'São Valentim', fr: 'Saint-Valentin', it: 'San Valentino', de: 'Valentinstag', ar: 'عيد الحب', hi: 'वैलेंटाइन डे', vi: 'Lễ Tình Nhân' },
      greetings: { en: "Happy Valentine's Day — celebrating love, family & kindness", es: '¡Feliz San Valentín! Celebrando el cariño, la familia y la amistad', zh: '情人节快乐 · 礼赞爱、家人与温暖陪伴', yue: '情人節快樂 · 禮讚愛、家人與溫暖陪伴', ja: 'ハッピーバレンタイン · 愛と感謝をこめて', ko: '해피 발렌타인데이 · 사랑과 따뜻한 우정을 기념하며', pt: 'Feliz Dia de São Valentim — amor, família e gentileza', fr: 'Joyeuse Saint-Valentin — amour, famille et douceur', it: 'Buon San Valentino — amore, famiglia e gentilezza', de: 'Alles Liebe zum Valentinstag!', ar: 'عيد حب سعيد — احتفاءً بالمحبة والعائلة واللطف', hi: 'वैलेंटाइन डे की शुभकामनाएँ — प्रेम और स्नेह', vi: 'Chúc mừng Lễ Tình Nhân — yêu thương & ấm áp' }
    },
    {
      id: 'presidents-day', category: 'holiday', emoji: '🏛️', effect: 'stars', dateHint: 'Feb (3rd Mon)',
      colors: ['#2563eb', '#ef4444', '#fbbf24', '#60a5fa', '#dc2626'],
      labels: { en: "Presidents'", es: 'Presidentes', zh: '总统日', yue: '總統日', ja: '大統領の日', ko: '대통령의 날', pt: 'Presidentes', fr: 'Présidents', it: 'Presidenti', de: 'Präsidententag', ar: 'يوم الرؤساء', hi: 'प्रेसिडेंट्स डे', vi: 'Ngày Tổng thống' },
      greetings: { en: "Presidents' Day — exploring civic history, leadership & service", es: 'Día de los Presidentes — historia cívica y liderazgo', zh: '总统日 · 回望历史传承与公共服务精神', yue: '總統日 · 回望歷史傳承與公共服務精神', ja: 'プレジデンツ・デー · 歴史とリーダーシップを考える日', ko: '대통령의 날 · 역사와 공공 봉사의 의미를 되새기며', pt: 'Dia dos Presidentes — história e serviço público', fr: 'Presidents’ Day — histoire civique et leadership', it: 'Presidents’ Day — storia civica e servizio pubblico', de: 'Presidents’ Day — Geschichte und Gemeinsinn', ar: 'يوم الرؤساء — تأمل في التاريخ والخدمة العامة', hi: 'प्रेसिडेंट्स डे — नेतृत्व और इतिहास', vi: 'Ngày Tổng thống — lịch sử và phụng sự cộng đồng' }
    },
    {
      id: 'holi', category: 'holiday', emoji: '🎨', effect: 'holi-colors', dateHint: 'Mar (Full Moon)',
      colors: ['#f43f5e', '#facc15', '#06b6d4', '#a855f7', '#10b981', '#fb923c'],
      labels: { en: 'Holi', es: 'Holi', zh: '洒红节', yue: '灑紅節', ja: 'ホーリー祭', ko: '홀리 축제', pt: 'Holi', fr: 'Holi', it: 'Holi', de: 'Holi', ar: 'مهرجان هولي', hi: 'होली', vi: 'Lễ hội Holi' },
      greetings: { en: 'Happy Holi! Festival of Colors — splash into vibrant spring joy', es: '¡Feliz Holi! Festival de los Colores y alegría primaveral', zh: '洒红节快乐！缤纷色彩点亮春日欢笑', yue: '灑紅節快樂！繽紛色彩點亮春日歡笑', ja: 'ハッピー・ホーリー！色鮮やかな春の喜びの祭典', ko: '해피 홀리! 다채로운 색채와 봄의 기쁨이 넘치는 축제', pt: 'Feliz Holi! Festival das Cores e alegria de primavera', fr: 'Joyeux Holi ! Festival des Couleurs et joie printanière', it: 'Felice Holi! Festival dei Colori e gioia di primavera', de: 'Frohes Holi! Fest der Farben und Frühlingsfreude', ar: 'مهرجان هولي سعيد! احتفال الألوان وفرحة الربيع', hi: 'होली की हार्दिक शुभकामनाएँ! रंगों और खुशियों का त्योहार', vi: 'Chúc mừng Lễ hội Sắc màu Holi!' }
    },
    {
      id: 'st-patricks', category: 'holiday', emoji: '☘️', effect: 'clovers', dateHint: 'Mar 17',
      colors: ['#10b981', '#059669', '#34d399', '#fbbf24', '#6ee7b7'],
      labels: { en: "St. Paddy's", es: 'San Patricio', zh: '三叶草节', yue: '聖博德節', ja: '聖パトリック', ko: '성 패트릭', pt: 'São Patrício', fr: 'Saint-Patrick', it: 'San Patrizio', de: 'St. Patrick’s', ar: 'سانت باتريك', hi: 'सेंट पैट्रिक', vi: 'Thánh Patrick' },
      greetings: { en: "Happy St. Patrick's Day! Emerald shamrocks & golden luck", es: '¡Feliz Día de San Patricio! Tréboles esmeralda y buena suerte', zh: '圣帕特里克节快乐 · 翡翠四叶草带来好运', yue: '聖博德節快樂 · 翡翠三葉草帶來好運', ja: 'セントパトリックスデー！緑のシャムロックと幸運を', ko: '성 패트릭 데이! 에메랄드빛 클로버와 행운이 함께하길', pt: 'Feliz Dia de São Patrício! Trevos esmeralda e sorte', fr: 'Joyeuse Saint-Patrick ! Trèfles émeraude et chance', it: 'Buona festa di San Patrizio! Quadrifogli e fortuna', de: 'Frohen St. Patrick’s Day! Kleeblätter und viel Glück', ar: 'عيد القديس باتريك سعيد! أوراق البرسيم الزمردية', hi: 'सेंट पैट्रिक दिवस की शुभकामनाएँ!', vi: 'Chúc mừng Ngày Thánh Patrick — cỏ bốn lá may mắn!' }
    },
    {
      id: 'easter', category: 'holiday', emoji: '🌷', effect: 'blossoms', dateHint: 'Spring Sun',
      colors: ['#c084fc', '#f472b6', '#34d399', '#fbbf24', '#60a5fa'],
      labels: { en: 'Easter', es: 'Pascua', zh: '复活节', yue: '復活節', ja: 'イースター', ko: '부활절', pt: 'Páscoa', fr: 'Pâques', it: 'Pasqua', de: 'Ostern', ar: 'عيد الفصح', hi: 'ईस्टर', vi: 'Lễ Phục Sinh' },
      greetings: { en: 'Happy Easter! Spring blossoms, pastel colors & renewal', es: '¡Felices Pascuas! Flores de primavera y renovación', zh: '复活节快乐 · 春花绽放与盎然生机', yue: '復活節快樂 · 春花綻放與盎然生機', ja: 'ハッピーイースター！春の花々と彩りの季節', ko: '행복한 부활절 보내세요! 봄꽃과 파스텔빛 설렘', pt: 'Feliz Páscoa! Flores de primavera e renovação', fr: 'Joyeuses Pâques ! Fleurs printanières et renouveau', it: 'Buona Pasqua! Fiori di primavera e serenità', de: 'Frohe Ostern! Frühlingsblüten und Neubeginn', ar: 'عيد فصح سعيد! أزهار الربيع وألوان الباستيل', hi: 'हैप्पी ईस्टर! वसंत के फूल और नई उमंग', vi: 'Chúc mừng Lễ Phục Sinh an lành!' }
    },
    {
      id: 'mothers-day', category: 'holiday', emoji: '💐', effect: 'blossoms', dateHint: 'May (2nd Sun)',
      colors: ['#f472b6', '#fb7185', '#c084fc', '#fbbf24', '#fda4af'],
      labels: { en: "Mother's Day", es: 'Día Madre', zh: '母亲节', yue: '母親節', ja: '母の日', ko: '어머니날', pt: 'Dia das Mães', fr: 'Fête des Mères', it: 'Festa Mamma', de: 'Muttertag', ar: 'عيد الأم', hi: 'मदर्स डे', vi: 'Ngày của Mẹ' },
      greetings: { en: "Happy Mother's Day! Celebrating moms everywhere with love", es: '¡Feliz Día de la Madre! Con todo el cariño y gratitud', zh: '母亲节快乐 · 感恩每一位母亲温暖的爱', yue: '母親節快樂 · 感恩每一位媽媽溫暖嘅愛', ja: '母の日おめでとう · 温かい愛情に心からの感謝を', ko: '어머니날 축하합니다 · 따뜻한 사랑에 깊은 감사를', pt: 'Feliz Dia das Mães! Carinho e gratidão a todas as mães', fr: 'Bonne Fête des Mères ! Avec amour et gratitude', it: 'Buona Festa della Mamma! Con affetto e gratitudine', de: 'Alles Liebe zum Muttertag!', ar: 'عيد أم سعيد! تحية محبة وامتنان لكل أم', hi: 'मातृ दिवस की शुभकामनाएँ!', vi: 'Chúc mừng Ngày của Mẹ đầy yêu thương!' }
    },
    {
      id: 'memorial-day', category: 'holiday', emoji: '🌺', effect: 'poppies', dateHint: 'May (Last Mon)',
      colors: ['#dc2626', '#ef4444', '#2563eb', '#fbbf24', '#60a5fa'],
      labels: { en: 'Memorial Day', es: 'Memorial Day', zh: '纪念日', yue: '紀念日', ja: '戦没将兵追悼日', ko: '메모리얼 데이', pt: 'Memorial Day', fr: 'Memorial Day', it: 'Memorial Day', de: 'Memorial Day', ar: 'يوم الذكرى', hi: 'मेमोरियल डे', vi: 'Chiến sĩ Trận vong' },
      greetings: { en: 'Memorial Day — honoring with gratitude those who served', es: 'Memorial Day — recordando con gratitud a quienes sirvieron', zh: '阵亡将士纪念日 · 铭记奉献与守护', yue: '陣亡將士紀念日 · 銘記奉獻與守護', ja: 'メモリアル・デー · 静かな敬意と感謝を捧げて', ko: '메모리얼 데이 · 헌신과 희생을 기억하며', pt: 'Memorial Day — honrando com gratidão quem serviu', fr: 'Memorial Day — hommage et gratitude', it: 'Memorial Day — ricordo e gratitudine', de: 'Memorial Day — in ehrendem Gedenken', ar: 'يوم الذكرى — تحية احترام وامتنان', hi: 'मेमोरियल डे — सेवा और बलिदान को नमन', vi: 'Ngày Tưởng niệm — tri ân sự hy sinh và phụng sự' }
    },
    {
      id: 'juneteenth', category: 'holiday', emoji: '✊🏿', effect: 'fireworks', dateHint: 'Jun 19',
      colors: ['#dc2626', '#fbbf24', '#059669', '#f59e0b', '#10b981'],
      labels: { en: 'Juneteenth', es: 'Juneteenth', zh: '六月节', yue: '六月節', ja: 'ジューンティーンス', ko: '준틴스', pt: 'Juneteenth', fr: 'Juneteenth', it: 'Juneteenth', de: 'Juneteenth', ar: 'جونتينث', hi: 'जूनटींथ', vi: 'Ngày Juneteenth' },
      greetings: { en: 'Happy Juneteenth! Celebrating freedom, history & community joy', es: '¡Feliz Juneteenth! Celebrando la libertad y la cultura', zh: '六月节 · 礼赞自由、历史传承与坚韧精神', yue: '六月節 · 禮讚自由、歷史傳承與堅韌精神', ja: 'ジューンティーンス · 自由と希望の歩みを祝う日', ko: '준틴스 · 자유와 공동체의 희망을 기념하는 날', pt: 'Feliz Juneteenth! Liberdade, cultura e resiliência', fr: 'Joyeux Juneteenth ! Liberté, histoire et résilience', it: 'Felice Juneteenth! Libertà, storia e resilienza', de: 'Happy Juneteenth! Freiheit und Zusammenhalt feiern', ar: 'جونتينث سعيد! احتفاءً بالحرية والتاريخ والأمل', hi: 'जूनटींथ की शुभकामनाएँ — स्वतंत्रता और संस्कृति', vi: 'Chúc mừng Ngày Juneteenth — tự do và văn hóa!' }
    },
    {
      id: 'fathers-day', category: 'holiday', emoji: '🌟', effect: 'stars', dateHint: 'Jun (3rd Sun)',
      colors: ['#0284c7', '#fbbf24', '#38bdf8', '#d97706', '#60a5fa'],
      labels: { en: "Father's Day", es: 'Día Padre', zh: '父亲节', yue: '父親節', ja: '父の日', ko: '아버지날', pt: 'Dia dos Pais', fr: 'Fête des Pères', it: 'Festa Papà', de: 'Vatertag', ar: 'عيد الأب', hi: 'फादर्स डे', vi: 'Ngày của Cha' },
      greetings: { en: "Happy Father's Day! Celebrating dads, mentors & shared curiosity", es: '¡Feliz Día del Padre! Celebrando a los papás y aventuras juntos', zh: '父亲节快乐 · 致敬陪伴孩子探索世界的父亲们', yue: '父親節快樂 · 致敬陪伴小朋友探索世界嘅爸爸', ja: '父の日おめでとう · 一緒に探検してくれるお父さんに感謝', ko: '아버지날 축하합니다 · 함께 탐험하는 모든 아버지께 감사를', pt: 'Feliz Dia dos Pais! Aventuras e descobertas em família', fr: 'Bonne Fête des Pères ! Pour les papas et belles aventures', it: 'Buona Festa del Papà! Avventure e curiosità insieme', de: 'Alles Gute zum Vatertag!', ar: 'عيد أب سعيد! تحية لكل أب يشارك أطفاله الاستكشاف', hi: 'पितृ दिवस की शुभकामनाएँ!', vi: 'Chúc mừng Ngày của Cha!' }
    },
    {
      id: 'independence-day', category: 'holiday', emoji: '🎇', effect: 'fireworks', dateHint: 'Jul 4',
      colors: ['#dc2626', '#2563eb', '#fbbf24', '#ef4444', '#60a5fa'],
      labels: { en: 'July 4th', es: '4 de Julio', zh: '独立日', yue: '獨立日', ja: '独立記念日', ko: '독립기념일', pt: '4 de Julho', fr: '4 Juillet', it: '4 Luglio', de: '4. Juli', ar: '4 يوليو', hi: '4 जुलाई', vi: 'Quốc khánh Mỹ 4/7' },
      greetings: { en: 'Happy 4th of July! Summer skies & sparkling fireworks', es: '¡Feliz 4 de Julio! Noche de verano y fuegos artificiales', zh: '独立日快乐 · 夏夜星空与绚烂烟花', yue: '獨立日快樂 · 夏夜星空與絢爛煙花', ja: '独立記念日おめでとう！夏の夜空を彩る花火', ko: '독립기념일 축하합니다! 밤하늘을 수놓는 불꽃놀이', pt: 'Feliz 4 de Julho! Noite de verão e fogos brilhantes', fr: 'Joyeux 4 Juillet ! Nuit d’été et feux d’artifice', it: 'Buon 4 Luglio! Fuochi d’artificio estivi', de: 'Frohen 4. Juli! Sommernacht und Feuerwerk', ar: 'الرابع من يوليو سعيد! ألعاب نارية متلألئة', hi: '4 जुलाई की शुभकामनाएँ — आतिशबाज़ी और उत्सव', vi: 'Chúc mừng Ngày 4 tháng 7 rực rỡ pháo hoa!' }
    },
    {
      id: 'labor-day', category: 'holiday', emoji: '🛠️', effect: 'stars', dateHint: 'Sep (1st Mon)',
      colors: ['#d97706', '#2563eb', '#f59e0b', '#ea580c', '#38bdf8'],
      labels: { en: 'Labor Day', es: 'Día Trabajo', zh: '劳工节', yue: '勞工節', ja: 'レイバー・デー', ko: '노동절', pt: 'Dia Trabalho', fr: 'Fête Travail', it: 'Festa Lavoro', de: 'Labor Day', ar: 'عيد العمال', hi: 'लेबर डे', vi: 'Ngày Lao động' },
      greetings: { en: 'Happy Labor Day! Celebrating builders, teachers & curious craft', es: '¡Feliz Día del Trabajo! Celebrando a educadores y creadores', zh: '劳工节快乐 · 致敬每一位创造者与匠心精神', yue: '勞工節快樂 · 致敬每一位創造者與匠心精神', ja: 'レイバー・デー · 創り手や教育者の歩みに敬意を', ko: '노동절 축하합니다 · 모든 창작자와 장인정신을 기리며', pt: 'Feliz Dia do Trabalho! Celebrando quem constrói e ensina', fr: 'Bonne Fête du Travail ! Célébrons les bâtisseurs', it: 'Buona Festa del Lavoro!', de: 'Schönen Labor Day!', ar: 'عيد عمال سعيد! تحية للمبدعين والمعلمين', hi: 'श्रम दिवस की शुभकामनाएँ!', vi: 'Chúc mừng Ngày Lao động!' }
    },
    {
      id: 'mid-autumn', category: 'holiday', emoji: '🥮', effect: 'lanterns', dateHint: 'Sep / Oct',
      colors: ['#fbbf24', '#f59e0b', '#ef4444', '#fde047', '#ea580c'],
      labels: { en: 'Mid-Autumn', es: 'Medio Otoño', zh: '中秋节', yue: '中秋節', ja: '中秋の名月', ko: '추석', pt: 'Meio Outono', fr: 'Mi-Automne', it: 'Metà Autunno', de: 'Mondfest', ar: 'منتصف الخريف', hi: 'शरद पूर्णिमा उत्सव', vi: 'Tết Trung Thu' },
      greetings: { en: 'Happy Mid-Autumn Festival · 中秋快乐! Full harvest moon & lanterns', es: '¡Feliz Festival de la Luna · 中秋快乐! Linternas y unión', zh: '中秋快乐 · 花好月圆，灯火可亲，阖家团圆！', yue: '中秋節快樂 · 人月兩團圓，花燈映照溫馨夜！', ja: '中秋の名月 · 満月とランタンの温かい夜', ko: '풍성한 한가위 보내세요 · 밝은 보름달과 등불', pt: 'Feliz Festival da Lua! Lua cheia e lanternas douradas', fr: 'Joyeuse Fête de la Mi-Automne ! Pleine lune et lanternes', it: 'Felice Festa di Metà Autunno! Luna piena e lanterne', de: 'Frohes Mondfest! Vollmondglanz und Laternen', ar: 'مهرجان منتصف الخريف سعيد! قمر مكتمل وفوانيس مضيئة', hi: 'मध्य-शरद चंद्र उत्सव की शुभकामनाएँ!', vi: 'Chúc mừng Tết Trung Thu đoàn viên!' }
    },
    {
      id: 'indigenous-peoples-day', category: 'holiday', emoji: '🌾', effect: 'leaves', dateHint: 'Oct (2nd Mon)',
      colors: ['#d97706', '#0d9488', '#ea580c', '#b45309', '#14b8a6'],
      labels: { en: 'Indigenous Day', es: 'Pueblos Indígenas', zh: '原住民日', yue: '原住民日', ja: '先住民の日', ko: '원주민의 날', pt: 'Povos Indígenas', fr: 'Peuples Autochtones', it: 'Popoli Indigeni', de: 'Indigene Völker', ar: 'الشعوب الأصلية', hi: 'स्वदेशी जन दिवस', vi: 'Ngày Bản địa' },
      greetings: { en: "Indigenous Peoples' Day — honoring living cultures & stewardship", es: 'Día de los Pueblos Indígenas — culturas vivas y sabiduría', zh: '原住民纪念日 · 致敬多元文化与自然守护', yue: '原住民紀念日 · 致敬多元文化與自然守護', ja: '先住民族の日 · 豊かな文化と自然への敬意を讃えて', ko: '원주민의 날 · 살아있는 문화와 자연의 지혜를 기리며', pt: 'Dia dos Povos Indígenas — culturas vivas e natureza', fr: 'Journée des Peuples Autochtones — cultures et respect de la terre', it: 'Giornata dei Popoli Indigeni — culture e natura', de: 'Tag der indigenen Völker — Kulturen und Naturverbundenheit', ar: 'يوم الشعوب الأصلية — تكريماً للثقافات الحية وحماية الطبيعة', hi: 'स्वदेशी जन दिवस — संस्कृति और प्रकृति का सम्मान', vi: 'Tôn vinh văn hóa & di sản các dân tộc bản địa' }
    },
    {
      id: 'halloween', category: 'holiday', emoji: '🎃', effect: 'halloween', dateHint: 'Oct 31',
      colors: ['#f97316', '#a855f7', '#fb923c', '#84cc16', '#fbbf24'],
      labels: { en: 'Halloween', es: 'Halloween', zh: '万圣节', yue: '萬聖節', ja: 'ハロウィン', ko: '할로윈', pt: 'Halloween', fr: 'Halloween', it: 'Halloween', de: 'Halloween', ar: 'الهالوين', hi: 'हैलोवीन', vi: 'Halloween' },
      greetings: { en: 'Happy Halloween! Friendly jack-o’-lanterns & spooky autumn fun', es: '¡Feliz Halloween! Calabazas luminosas y magia otoñal', zh: '万圣节快乐！南瓜灯闪烁与奇幻秋夜冒险', yue: '萬聖節快樂！南瓜燈閃爍與奇幻秋夜冒險', ja: 'ハッピーハロウィン！かぼちゃのランタンと不思議な夜', ko: '해피 할로윈! 반짝이는 호박등과 가을밤 모험', pt: 'Feliz Halloween! Abóboras iluminadas e magia de outono', fr: 'Joyeux Halloween ! Citrouilles lumineuses et magie', it: 'Buon Halloween! Zucche luminose e magia d’autunno', de: 'Happy Halloween! Leuchtende Kürbisse und Herbstzauber', ar: 'هالوين سعيد! فوانيس اليقطين وأجواء الخريف المرحة', hi: 'हैप्पी हैलोवीन! चमकते कद्दू और मज़ेदार रात', vi: 'Chúc mừng Halloween vui nhộn!' }
    },
    {
      id: 'diwali', category: 'holiday', emoji: '🪔', effect: 'diyas', dateHint: 'Oct / Nov',
      colors: ['#fbbf24', '#f97316', '#ec4899', '#a855f7', '#fde047'],
      labels: { en: 'Diwali', es: 'Diwali', zh: '排灯节', yue: '排燈節', ja: 'ディワリ', ko: '디왈리', pt: 'Diwali', fr: 'Diwali', it: 'Diwali', de: 'Diwali', ar: 'ديوالي', hi: 'दीपावली', vi: 'Lễ hội Diwali' },
      greetings: { en: 'Happy Diwali · Shubh Deepawali! Warm glowing diyas & light', es: '¡Feliz Diwali! Diyas doradas, sabiduría y luz', zh: '排灯节快乐！温暖明灯点亮知识与希望', yue: '排燈節快樂！溫暖明燈點亮知識與希望', ja: 'ハッピー・ディワリ！ディヤの灯りが希望を照らしますように', ko: '해피 디왈리! 따뜻한 등불이 희망과 기쁨을 밝혀주기를', pt: 'Feliz Diwali! Luzes douradas de diyas e alegria', fr: 'Joyeux Diwali ! Lumières dorées des diyas et sérénité', it: 'Felice Diwali! Calde luci di diya e gioia', de: 'Frohes Diwali! Fest des Lichts und leuchtende Diyas', ar: 'ديوالي سعيد! مصابيح الديا الدافئة تضيء الأمل', hi: 'शुभ दीपावली! दीपों का प्रकाश ज्ञान और खुशहाली लाए', vi: 'Chúc mừng Lễ hội Ánh sáng Diwali!' }
    },
    {
      id: 'veterans-day', category: 'holiday', emoji: '🎖️', effect: 'stars', dateHint: 'Nov 11',
      colors: ['#d97706', '#2563eb', '#dc2626', '#fbbf24', '#60a5fa'],
      labels: { en: 'Veterans Day', es: 'Veteranos', zh: '退伍军人节', yue: '退伍軍人節', ja: '退役軍人の日', ko: '재향군인의 날', pt: 'Veteranos', fr: 'Anciens Combattants', it: 'Veterani', de: 'Veteranentag', ar: 'المحاربين القدامى', hi: 'वेटरन्स डे', vi: 'Ngày Cựu chiến binh' },
      greetings: { en: 'Veterans Day — heartfelt gratitude to veterans & military families', es: 'Día de los Veteranos — gratitud a quienes han servido', zh: '退伍军人节 · 向退伍军人与军属致以诚挚感谢', yue: '退伍軍人節 · 向退伍軍人與軍屬致以誠摯感謝', ja: '退役軍人の日 · 奉仕された方々に心からの感謝を', ko: '재향군인의 날 · 헌신하신 분들께 깊은 감사를 전합니다', pt: 'Dia dos Veteranos — gratidão a quem serviu', fr: 'Journée des Anciens Combattants — sincère gratitude', it: 'Giornata dei Veterani — sincera gratitudine', de: 'Veterans Day — herzlicher Dank für den Dienst', ar: 'يوم المحاربين القدامى — امتنان صادق', hi: 'वेटरन्स डे — सेवानिवृत्त सैनिकों के प्रति कृतज्ञता', vi: 'Ngày Cựu chiến binh — lòng biết ơn chân thành' }
    },
    {
      id: 'thanksgiving', category: 'holiday', emoji: '🦃', effect: 'leaves', dateHint: 'Nov (4th Thu)',
      colors: ['#d97706', '#b45309', '#dc2626', '#ea580c', '#f59e0b'],
      labels: { en: 'Thanksgiving', es: 'Acción de Gracias', zh: '感恩节', yue: '感恩節', ja: '感謝祭', ko: '추수감사절', pt: 'Ação de Graças', fr: 'Thanksgiving', it: 'Ringraziamento', de: 'Erntedank', ar: 'عيد الشكر', hi: 'थैंक्सगिविंग', vi: 'Lễ Tạ Ơn' },
      greetings: { en: 'Happy Thanksgiving! Grateful for family, curiosity & shared stories', es: '¡Feliz Acción de Gracias! Gratitud por la familia y aprender juntos', zh: '感恩节快乐 · 感恩家人陪伴与好奇探索的每一天', yue: '感恩節快樂 · 感恩家人陪伴與好奇探索嘅每一日', ja: 'ハッピー・サンクスギビング！家族と学ぶ喜びに感謝', ko: '행복한 추수감사절 보내세요! 가족과 함께하는 시간에 감사하며', pt: 'Feliz Dia de Ação de Graças! Gratidão pela família', fr: 'Joyeux Thanksgiving ! Gratitude et moments partagés', it: 'Felice Giorno del Ringraziamento!', de: 'Frohes Thanksgiving! Dankbar für Familie und Neugier', ar: 'عيد شكر سعيد! ممتنون للعائلة والعقول الفضولية', hi: 'थैंक्सगिविंग की शुभकामनाएँ — परिवार और कृतज्ञता', vi: 'Chúc mừng Lễ Tạ Ơn ấm áp bên gia đình!' }
    },
    {
      id: 'christmas', category: 'holiday', emoji: '🎄', effect: 'christmas-snow', dateHint: 'Dec 25',
      colors: ['#dc2626', '#059669', '#fbbf24', '#10b981', '#ef4444'],
      labels: { en: 'Christmas', es: 'Navidad', zh: '圣诞节', yue: '聖誕節', ja: 'クリスマス', ko: '크리스마스', pt: 'Natal', fr: 'Noël', it: 'Natale', de: 'Weihnachten', ar: 'عيد الميلاد', hi: 'क्रिसमस', vi: 'Giáng Sinh' },
      greetings: { en: 'Merry Christmas & Happy Holidays! Evergreen warmth, snow & peace', es: '¡Feliz Navidad y Felices Fiestas! Paz, nieve y calidez familiar', zh: '圣诞与节日快乐 · 松林瑞雪与岁末温情', yue: '聖誕與節日快樂 · 松林瑞雪與歲末溫情', ja: 'メリークリスマス！雪のきらめきと温かい時間を', ko: '메리 크리스마스! 포근한 눈빛과 평화로운 연말 되세요', pt: 'Feliz Natal e Boas Festas! Paz e magia de inverno', fr: 'Joyeux Noël et Bonnes Fêtes ! Douceur et paix', it: 'Buon Natale e Buone Feste! Calore e serenità', de: 'Frohe Weihnachten & schöne Feiertage!', ar: 'عيد ميلاد مجيد وأعياد سعيدة! دفء وسلام', hi: 'मेरी क्रिसमस और छुट्टियों की शुभकामनाएँ!', vi: 'Giáng Sinh An Lành & Ấm Áp!' }
    }
  ];

  var UI_COPY = {
    en: { aria: 'Season and holiday theme', auto: 'Auto · Live Calendar', autoSub: 'Follows today’s season & holidays automatically', seasons: 'Four Seasons', holidays: 'World & USA Holidays', fxOn: 'Sky effects: On', fxCalm: 'Sky effects: Calm', celebrate: 'Celebrate!', hideGreeting: 'Minimize seasonal greeting' },
    es: { aria: 'Tema de estación y festividad', auto: 'Auto · Calendario vivo', autoSub: 'Sigue la estación o festividad de hoy', seasons: 'Cuatro estaciones', holidays: 'Fiestas del mundo y EE. UU.', fxOn: 'Efectos: Activos', fxCalm: 'Efectos: Calma', celebrate: '¡Celebrar!', hideGreeting: 'Minimizar saludo' },
    zh: { aria: '四季与节日主题', auto: '自动 · 实时日历', autoSub: '根据当日节气与全球节日自动切换', seasons: '四季风物', holidays: '全球与美国节日', fxOn: '动态氛围：开启', fxCalm: '动态氛围：静谧', celebrate: '欢庆!', hideGreeting: '收起节日问候' },
    yue: { aria: '四季與節日主題', auto: '自動 · 實時日曆', autoSub: '跟隨當日季節與全球節日自動切換', seasons: '四季風物', holidays: '全球與美國節日', fxOn: '動態氛圍：開啟', fxCalm: '動態氛圍：靜謐', celebrate: '慶祝!', hideGreeting: '收起節日問候' },
    ja: { aria: '季節と祝日のテーマ', auto: '自動 · カレンダー連動', autoSub: '今日の季節や祝日に合わせて自動切替', seasons: '四季', holidays: '世界と米国の祝日', fxOn: '空の効果: オン', fxCalm: '空の効果: 静か', celebrate: 'お祝い!', hideGreeting: '挨拶を折りたたむ' },
    ko: { aria: '계절 및 명절 테마', auto: '자동 · 실시간 달력', autoSub: '오늘의 계절과 명절에 맞춰 자동 전환', seasons: '사계절', holidays: '세계 및 미국 명절', fxOn: '하늘 효과: 켜짐', fxCalm: '하늘 효과: 차분함', celebrate: '축하!', hideGreeting: '인사말 접기' },
    pt: { aria: 'Tema de estação e feriado', auto: 'Auto · Calendário ao vivo', autoSub: 'Muda conforme a estação ou feriado de hoje', seasons: 'Quatro estações', holidays: 'Feriados mundiais e EUA', fxOn: 'Efeitos: Ativos', fxCalm: 'Efeitos: Calmo', celebrate: 'Celebrar!', hideGreeting: 'Minimizar saudação' },
    fr: { aria: 'Thème des saisons et fêtes', auto: 'Auto · Calendrier en direct', autoSub: 'Suit la saison ou fête d’aujourd’hui', seasons: 'Quatre saisons', holidays: 'Fêtes du monde et USA', fxOn: 'Effets : Activés', fxCalm: 'Effets : Calme', celebrate: 'Célébrer !', hideGreeting: 'Réduire le message' },
    it: { aria: 'Tema stagioni e festività', auto: 'Auto · Calendario dal vivo', autoSub: 'Segue la stagione o festa di oggi', seasons: 'Quattro stagioni', holidays: 'Feste del mondo e USA', fxOn: 'Effetti: Attivi', fxCalm: 'Effetti: Calma', celebrate: 'Festeggia!', hideGreeting: 'Comprimi saluto' },
    de: { aria: 'Jahreszeiten- & Feiertagsthema', auto: 'Auto · Live-Kalender', autoSub: 'Folgt automatisch Jahreszeit & Feiertagen', seasons: 'Vier Jahreszeiten', holidays: 'Welt- & US-Feiertage', fxOn: 'Effekte: An', fxCalm: 'Effekte: Ruhig', celebrate: 'Feiern!', hideGreeting: 'Gruß einklappen' },
    ar: { aria: 'سمة الفصول والمناسبات', auto: 'تلقائي · التقويم الحي', autoSub: 'يتغير تلقائياً حسب فصل اليوم والمناسبات', seasons: 'الفصول الأربعة', holidays: 'أعياد العالم والولايات المتحدة', fxOn: 'التأثيرات: مفعّلة', fxCalm: 'التأثيرات: هادئة', celebrate: 'احتفل!', hideGreeting: 'تصغير التحية' },
    hi: { aria: 'ऋतु और त्योहार थीम', auto: 'ऑटो · लाइव कैलेंडर', autoSub: 'आज के मौसम और त्योहार के अनुसार स्वतः बदलाव', seasons: 'चार ऋतुएँ', holidays: 'विश्व और अमेरिकी त्योहार', fxOn: 'प्रभाव: चालू', fxCalm: 'प्रभाव: शांत', celebrate: 'उत्सव!', hideGreeting: 'संदेश छोटा करें' },
    vi: { aria: 'Chủ đề mùa & lễ hội', auto: 'Tự động · Lịch trực tiếp', autoSub: 'Tự động theo mùa và ngày lễ hôm nay', seasons: 'Bốn mùa', holidays: 'Lễ hội Thế giới & Hoa Kỳ', fxOn: 'Hiệu ứng: Bật', fxCalm: 'Hiệu ứng: Dịu', celebrate: 'Ăn mừng!', hideGreeting: 'Thu gọn lời chào' }
  };

  var THEME_MAP = {};
  for (var i = 0; i < SEASON_THEMES.length; i++) {
    THEME_MAP[SEASON_THEMES[i].id] = SEASON_THEMES[i];
  }

  var LUNAR_NEW_YEAR = { 2025:[1,29], 2026:[2,17], 2027:[2,6], 2028:[1,26], 2029:[2,13], 2030:[2,3], 2031:[1,23], 2032:[2,11], 2033:[1,31], 2034:[2,19], 2035:[2,8], 2036:[1,28] };
  var HOLI = { 2025:[3,14], 2026:[3,4], 2027:[3,22], 2028:[3,11], 2029:[3,1], 2030:[3,20], 2031:[3,9], 2032:[2,27], 2033:[3,16], 2034:[3,5], 2035:[3,24], 2036:[3,12] };
  var MID_AUTUMN = { 2025:[10,6], 2026:[9,25], 2027:[9,15], 2028:[10,3], 2029:[9,22], 2030:[9,12], 2031:[10,1], 2032:[9,19], 2033:[9,8], 2034:[9,27], 2035:[9,16], 2036:[10,4] };
  var DIWALI = { 2025:[10,20], 2026:[11,8], 2027:[10,29], 2028:[10,17], 2029:[11,5], 2030:[10,26], 2031:[11,14], 2032:[11,2], 2033:[10,22], 2034:[11,10], 2035:[10,30], 2036:[11,17] };

  function nthWeekday(y, m1, w0, nth) {
    var first = new Date(y, m1 - 1, 1).getDay();
    return 1 + ((w0 - first + 7) % 7) + (nth - 1) * 7;
  }
  function lastWeekday(y, m1, w0) {
    var last = new Date(y, m1, 0);
    return last.getDate() - ((last.getDay() - w0 + 7) % 7);
  }
  function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    return [Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1];
  }
  function dayDiff(y1, m1, d1, y2, m2, d2) {
    return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 86400000);
  }

  function resolveCalendarSeason(now) {
    var d = now || new Date();
    var year = d.getFullYear(), month = d.getMonth() + 1, day = d.getDate();
    if ((month === 12 && day === 31) || (month === 1 && day <= 2)) return 'new-year';
    if (month === 12 && day >= 21 && day <= 26) return 'christmas';
    var lny = LUNAR_NEW_YEAR[year];
    if (lny) {
      var ld = dayDiff(year, month, day, year, lny[0], lny[1]);
      if (ld >= -1 && ld <= 4) return 'lunar-new-year';
    }
    if (month === 1) {
      var mlk = nthWeekday(year, 1, 1, 3);
      if (day >= mlk - 2 && day <= mlk) return 'mlk-day';
    }
    if (month === 2 && (day === 13 || day === 14)) return 'valentines';
    if (month === 2) {
      var pres = nthWeekday(year, 2, 1, 3);
      if (day >= pres - 2 && day <= pres) return 'presidents-day';
    }
    var holi = HOLI[year];
    if (holi && Math.abs(dayDiff(year, month, day, year, holi[0], holi[1])) <= 1) return 'holi';
    if (month === 3 && (day === 16 || day === 17)) return 'st-patricks';
    var ea = easterSunday(year);
    var ed = dayDiff(year, month, day, year, ea[0], ea[1]);
    if (ed >= -2 && ed <= 1) return 'easter';
    if (month === 5) {
      var mo = nthWeekday(year, 5, 0, 2);
      if (day === mo - 1 || day === mo) return 'mothers-day';
      var mem = lastWeekday(year, 5, 1);
      if (day >= mem - 2 && day <= mem) return 'memorial-day';
    }
    if (month === 6 && day >= 18 && day <= 20) return 'juneteenth';
    if (month === 6) {
      var fa = nthWeekday(year, 6, 0, 3);
      if (day === fa - 1 || day === fa) return 'fathers-day';
    }
    if (month === 7 && day >= 2 && day <= 5) return 'independence-day';
    if (month === 9) {
      var lab = nthWeekday(year, 9, 1, 1);
      if (day >= lab - 2 && day <= lab) return 'labor-day';
    }
    var ma = MID_AUTUMN[year];
    if (ma && Math.abs(dayDiff(year, month, day, year, ma[0], ma[1])) <= 1) return 'mid-autumn';
    if (month === 10) {
      var ind = nthWeekday(year, 10, 1, 2);
      if (day === ind - 1 || day === ind) return 'indigenous-peoples-day';
    }
    if (!(month === 10 && day >= 29)) {
      var dw1 = DIWALI[year];
      if (dw1 && Math.abs(dayDiff(year, month, day, year, dw1[0], dw1[1])) <= 2) return 'diwali';
    }
    if ((month === 10 && day >= 25) || (month === 11 && day === 1)) return 'halloween';
    var dw2 = DIWALI[year];
    if (dw2 && Math.abs(dayDiff(year, month, day, year, dw2[0], dw2[1])) <= 2) return 'diwali';
    if (month === 11 && (day === 10 || day === 11)) return 'veterans-day';
    if (month === 11) {
      var tg = nthWeekday(year, 11, 4, 4);
      if (day >= tg - 2 && day <= tg + 3) return 'thanksgiving';
    }
    if ((month === 3 && day >= 20) || month === 4 || month === 5 || (month === 6 && day <= 19)) return 'spring';
    if ((month === 6 && day >= 20) || month === 7 || month === 8 || (month === 9 && day <= 21)) return 'summer';
    if ((month === 9 && day >= 22) || month === 10 || month === 11 || (month === 12 && day <= 20)) return 'fall';
    return 'winter';
  }

  function safeGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try {
      if (val === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, val);
    } catch (e) { /* ignore */ }
  }

  function normalizeLang(raw) {
    if (!raw) return 'en';
    var lower = String(raw).toLowerCase().trim();
    if (lower === 'yue' || lower.indexOf('zh-hk') === 0 || lower.indexOf('zh-hant') === 0) return 'yue';
    var base = lower.split(/[-_]/)[0];
    return UI_COPY[base] ? base : 'en';
  }

  function detectLang() {
    var htmlLang = document.documentElement.getAttribute('lang');
    if (htmlLang) return normalizeLang(htmlLang);
    try {
      var qLang = new URLSearchParams(window.location.search).get('lang');
      if (qLang) return normalizeLang(qLang);
    } catch (e) { /* ignore */ }
    return normalizeLang(safeGet('aow-lang') || safeGet('lang') || navigator.language || 'en');
  }

  function detectSurfaceMode() {
    var root = document.documentElement;
    var body = document.body;
    var dt = (root.getAttribute('data-theme') || (body && body.getAttribute('data-theme')) || '').toLowerCase();
    if (dt === 'light' || dt === 'day') return 'day';
    if (dt === 'dark' || dt === 'night') return 'night';
    var cls = ((root.className || '') + ' ' + ((body && body.className) || '')).toLowerCase();
    if (/\b(light|day|theme-light|light-mode)\b/.test(cls)) return 'day';
    if (/\b(dark|night|theme-dark|dark-mode)\b/.test(cls)) return 'night';
    if (body && window.getComputedStyle) {
      var bg = window.getComputedStyle(body).backgroundColor || '';
      var m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        var lum = (0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3])) / 255;
        if (lum > 0.62) return 'day';
      }
    }
    return 'night';
  }

  function el(tag, className, text, attrs, children) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var i = 0; i < keys.length; i++) {
        node.setAttribute(keys[i], attrs[keys[i]]);
      }
    }
    if (children) {
      for (var j = 0; j < children.length; j++) {
        if (children[j]) node.appendChild(children[j]);
      }
    }
    return node;
  }

  /* ---------- Deterministic Particle PRNG & Canvas 2D Drawing ---------- */

  var prngState = (Date.now() ^ 0x9e3779b9) >>> 0;
  function nextRand() {
    prngState = (prngState * 1664525 + 1013904223) >>> 0;
    return prngState / 4294967296;
  }

  function drawShape(ctx, p, effect) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
    var s = p.size;

    if (effect === 'leaves') {
      ctx.rotate(p.rotation);
      ctx.scale(Math.max(0.25, Math.abs(Math.cos(p.flip))), 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.variant === 0) {
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.28, -s * 0.42);
        ctx.lineTo(s * 0.88, -s * 0.52);
        ctx.lineTo(s * 0.48, -s * 0.05);
        ctx.lineTo(s * 0.78, s * 0.36);
        ctx.lineTo(s * 0.2, s * 0.32);
        ctx.lineTo(0, s * 0.72);
        ctx.lineTo(-s * 0.2, s * 0.32);
        ctx.lineTo(-s * 0.78, s * 0.36);
        ctx.lineTo(-s * 0.48, -s * 0.05);
        ctx.lineTo(-s * 0.88, -s * 0.52);
        ctx.lineTo(-s * 0.28, -s * 0.42);
        ctx.closePath();
      } else {
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.75, -s * 0.55, s * 0.75, s * 0.45, 0, s * 0.85);
        ctx.bezierCurveTo(-s * 0.75, s * 0.45, -s * 0.75, -s * 0.55, 0, -s);
      }
      ctx.fill();
    } else if (effect === 'sakura') {
      ctx.rotate(p.rotation);
      ctx.scale(Math.max(0.35, Math.abs(Math.cos(p.flip))), 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.8);
      ctx.bezierCurveTo(-s * 0.85, s * 0.25, -s * 0.75, -s * 0.75, -s * 0.18, -s * 0.85);
      ctx.lineTo(0, -s * 0.52);
      ctx.lineTo(s * 0.18, -s * 0.85);
      ctx.bezierCurveTo(s * 0.75, -s * 0.75, s * 0.85, s * 0.25, 0, s * 0.8);
      ctx.fill();
    } else if (effect === 'blossoms') {
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      for (var b = 0; b < 5; b++) {
        ctx.save();
        ctx.rotate((b * Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.46, s * 0.3, s * 0.44, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect === 'snow' || effect === 'christmas-snow') {
      if (effect === 'christmas-snow' && p.variant === 0) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        for (var st = 0; st < 8; st++) {
          var r = st % 2 === 0 ? s : s * 0.34;
          var a = (st * Math.PI) / 4;
          if (st === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.rotate(p.rotation);
        ctx.strokeStyle = effect === 'christmas-snow' ? '#bae6fd' : p.color;
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        for (var sn = 0; sn < 6; sn++) {
          ctx.save();
          ctx.rotate((sn * Math.PI) / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -s);
          ctx.moveTo(0, -s * 0.55);
          ctx.lineTo(s * 0.25, -s * 0.78);
          ctx.moveTo(0, -s * 0.55);
          ctx.lineTo(-s * 0.25, -s * 0.78);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (effect === 'lanterns') {
      ctx.rotate(Math.sin(p.phase) * 0.08);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-s * 0.56, -s * 0.7, s * 1.12, s * 1.28, s * 0.34);
      else ctx.rect(-s * 0.56, -s * 0.7, s * 1.12, s * 1.28);
      ctx.fill();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.78)';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.26, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-s * 0.34, -s * 0.8, s * 0.68, s * 0.13);
      ctx.fillRect(-s * 0.3, s * 0.56, s * 0.6, s * 0.13);
    } else if (effect === 'diyas') {
      var fl = 0.88 + Math.sin(p.phase * 5) * 0.12;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.92 * fl);
      ctx.quadraticCurveTo(s * 0.32, -s * 0.36, 0, -s * 0.06);
      ctx.quadraticCurveTo(-s * 0.32, -s * 0.36, 0, -s * 0.92 * fl);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -s * 0.3, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, -s * 0.05, s * 0.65, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    } else if (effect === 'holi-colors') {
      var hg = ctx.createRadialGradient(0, 0, s * 0.08, 0, 0, s);
      hg.addColorStop(0, p.color);
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect === 'fireflies') {
      ctx.globalAlpha *= 0.4 + 0.6 * Math.abs(Math.sin(p.phase * 1.8));
      var fg = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 2.1);
      fg.addColorStop(0, p.color);
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(0, 0, s * 2.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect === 'halloween') {
      if (p.variant === 0) {
        var wing = Math.sin(p.phase * 4.2) * s * 0.35;
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.18);
        ctx.quadraticCurveTo(s * 0.55, -s * 0.65 + wing, s * 1.02, -s * 0.05 + wing);
        ctx.quadraticCurveTo(s * 0.55, s * 0.12, 0, s * 0.25);
        ctx.quadraticCurveTo(-s * 0.55, s * 0.12, -s * 1.02, -s * 0.05 + wing);
        ctx.quadraticCurveTo(-s * 0.55, -s * 0.65 + wing, 0, -s * 0.18);
        ctx.fill();
      } else {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.68, s * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#15803d';
        ctx.fillRect(-s * 0.1, -s * 0.7, s * 0.2, s * 0.22);
      }
    } else if (effect === 'hearts') {
      ctx.rotate(Math.sin(p.phase) * 0.2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.65);
      ctx.bezierCurveTo(-s * 0.92, s * 0.05, -s * 0.82, -s * 0.72, 0, -s * 0.28);
      ctx.bezierCurveTo(s * 0.82, -s * 0.72, s * 0.92, s * 0.05, 0, s * 0.65);
      ctx.fill();
    } else if (effect === 'clovers') {
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      for (var cl = 0; cl < 4; cl++) {
        ctx.save();
        ctx.rotate((cl * Math.PI) / 2);
        ctx.beginPath();
        ctx.arc(0, -s * 0.42, s * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (effect === 'poppies') {
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      for (var po = 0; po < 4; po++) {
        ctx.save();
        ctx.rotate((po * Math.PI) / 2 + 0.35);
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.35, s * 0.4, s * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.rotate(p.rotation * 0.4);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (var sp = 0; sp < 8; sp++) {
        var sr = sp % 2 === 0 ? s : s * 0.32;
        var sa = (sp * Math.PI) / 4;
        if (sp === 0) ctx.moveTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
        else ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function makeParticle(w, h, theme, randomY) {
    var effect = theme.effect;
    var color = theme.colors[Math.floor(nextRand() * theme.colors.length)];
    var rising = effect === 'lanterns' || effect === 'diyas' || effect === 'fireflies' || effect === 'hearts' || effect === 'fireworks';
    var size = effect === 'holi-colors' ? 11 + nextRand() * 13 : effect === 'fireflies' ? 4 + nextRand() * 4 : 6.5 + nextRand() * 5.5;
    return {
      x: nextRand() * w,
      y: randomY ? nextRand() * h : rising ? h + 24 + nextRand() * 32 : -24 - nextRand() * 32,
      vx: (nextRand() - 0.45) * 0.5,
      vy: rising ? -(0.3 + nextRand() * 0.45) : 0.45 + nextRand() * 0.68,
      size: size,
      rotation: nextRand() * Math.PI * 2,
      vRot: (nextRand() - 0.5) * 0.024,
      flip: nextRand() * Math.PI * 2,
      vFlip: 0.02 + nextRand() * 0.026,
      phase: nextRand() * Math.PI * 2,
      color: color,
      alpha: effect === 'holi-colors' ? 0.22 + nextRand() * 0.18 : 0.38 + nextRand() * 0.32,
      variant: Math.floor(nextRand() * 3),
      burst: false,
      life: 0,
      maxLife: 0
    };
  }

  function makeBurst(x, y, theme) {
    var angle = nextRand() * Math.PI * 2;
    var speed = 1.8 + nextRand() * 5.0;
    var color = theme.colors[Math.floor(nextRand() * theme.colors.length)];
    return {
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.4,
      size: theme.effect === 'holi-colors' ? 13 + nextRand() * 15 : 7 + nextRand() * 6,
      rotation: nextRand() * Math.PI * 2,
      vRot: (nextRand() - 0.5) * 0.09,
      flip: nextRand() * Math.PI * 2,
      vFlip: 0.05 + nextRand() * 0.05,
      phase: nextRand() * Math.PI * 2,
      color: color,
      alpha: 0.92,
      variant: Math.floor(nextRand() * 3),
      burst: true,
      life: 0,
      maxLife: 62 + Math.floor(nextRand() * 42)
    };
  }

  function boot() {
    if (!document.body) return;

    var reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    var selection = 'auto';
    try {
      var param = new URLSearchParams(window.location.search).get('season');
      var saved = safeGet(STORAGE_SEASON);
      if (param === 'auto' || THEME_MAP[param]) selection = param;
      else if (saved === 'auto' || THEME_MAP[saved]) selection = saved;
    } catch (e) { /* ignore */ }

    var calm = safeGet(STORAGE_CALM) === 'true';
    var compact = safeGet(STORAGE_COMPACT) === 'true';
    var popoverOpen = false;
    var calendarId = resolveCalendarSeason();
    var lang = detectLang();
    var particles = [];
    var rafId = 0;

    function activeId() {
      return selection === 'auto' ? calendarId : selection;
    }
    function activeTheme() {
      return THEME_MAP[activeId()] || THEME_MAP.fall;
    }
    function ui() {
      return UI_COPY[lang] || UI_COPY.en;
    }

    // Apply initial attribute immediately
    document.documentElement.setAttribute('data-season', activeId());

    var topStrip = el('div', 'aow-season-topstrip', null, { 'aria-hidden': 'true' });
    var aura = el('div', 'aow-season-aura', null, { 'aria-hidden': 'true' });
    var canvas = el('canvas', 'aow-season-canvas', null, { 'aria-hidden': 'true' });
    var dock = el('aside', 'aow-season-dock', null, { 'aria-label': ui().aria });
    if (document.querySelector('#timeline, .timeline-bar, .timeline-dock, footer.timeline')) {
      dock.setAttribute('data-pos', 'above-footer');
    }

    document.body.appendChild(topStrip);
    document.body.appendChild(aura);
    document.body.appendChild(canvas);
    document.body.appendChild(dock);

    function spawnBurst(bx, by, count) {
      if (calm || reducedMotion.matches) return;
      var theme = activeTheme();
      for (var i = 0; i < count; i++) {
        particles.push(makeBurst(bx, by, theme));
      }
    }

    function setupCanvas() {
      window.cancelAnimationFrame(rafId);
      canvas.setAttribute('data-calm', String(calm));
      if (calm || reducedMotion.matches) return;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;

      var w = window.innerWidth;
      var h = window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();
      window.addEventListener('resize', resize);

      var count = w < 640 ? 12 : 18;
      var theme = activeTheme();
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push(makeParticle(w, h, theme, true));
      }

      var tickCount = 0;
      function tick() {
        if (document.visibilityState !== 'hidden') {
          ctx.clearRect(0, 0, w, h);
          var cur = activeTheme();
          if (cur.effect === 'fireworks') {
            tickCount += 1;
            if (tickCount % 170 === 50 && particles.length < 75) {
              spawnBurst(w * (0.2 + nextRand() * 0.6), h * (0.14 + nextRand() * 0.34), 15);
            }
          }
          var rising = cur.effect === 'lanterns' || cur.effect === 'diyas' || cur.effect === 'fireflies' || cur.effect === 'hearts' || cur.effect === 'fireworks';
          for (var j = particles.length - 1; j >= 0; j--) {
            var p = particles[j];
            p.phase += 0.023;
            p.rotation += p.vRot;
            p.flip += p.vFlip;
            if (p.burst) {
              p.x += p.vx;
              p.y += p.vy;
              p.vy += 0.055;
              p.vx *= 0.985;
              p.life += 1;
              p.alpha = Math.max(0, 1 - p.life / p.maxLife);
              if (p.life >= p.maxLife) {
                particles.splice(j, 1);
                continue;
              }
            } else {
              p.x += p.vx + Math.sin(p.phase) * 0.28;
              p.y += p.vy;
              if (!rising && p.y > h + 44) particles[j] = makeParticle(w, h, cur, false);
              else if (rising && p.y < -44) particles[j] = makeParticle(w, h, cur, false);
              if (p.x > w + 44) p.x = -44;
              if (p.x < -44) p.x = w + 44;
            }
            drawShape(ctx, particles[j], cur.effect);
          }
        }
        rafId = window.requestAnimationFrame(tick);
      }
      rafId = window.requestAnimationFrame(tick);
    }

    function renderDock() {
      var strings = ui();
      var theme = activeTheme();
      var calTheme = THEME_MAP[calendarId] || THEME_MAP.fall;
      dock.setAttribute('data-surface', detectSurfaceMode());
      dock.setAttribute('aria-label', strings.aria);

      var children = [];

      if (popoverOpen) {
        var autoBtn = el('button', 'aow-season-auto', null, {
          type: 'button',
          'aria-pressed': String(selection === 'auto')
        }, [
          el('span', 'aow-season-auto__top', null, null, [
            el('span', null, strings.auto),
            el('span', 'aow-season-auto__now', calTheme.emoji + ' ' + (calTheme.labels[lang] || calTheme.labels.en))
          ]),
          el('span', 'aow-season-auto__sub', strings.autoSub)
        ]);
        autoBtn.addEventListener('click', function () {
          popoverOpen = false;
          applySelection('auto', true);
        });

        var fourBtns = [];
        var holBtns = [];
        for (var i = 0; i < SEASON_THEMES.length; i++) {
          (function (item) {
            if (item.category === 'season') {
              var chip = el('button', 'aow-season-chip', null, {
                type: 'button',
                'aria-pressed': String(selection === item.id)
              }, [
                el('span', 'aow-season-chip__emoji', item.emoji, { 'aria-hidden': 'true' }),
                el('span', null, item.labels[lang] || item.labels.en)
              ]);
              chip.addEventListener('click', function () { applySelection(item.id, true); });
              fourBtns.push(chip);
            } else {
              var hb = el('button', 'aow-season-holiday', null, {
                type: 'button',
                'aria-pressed': String(selection === item.id)
              }, [
                el('span', 'aow-season-holiday__emoji', item.emoji, { 'aria-hidden': 'true' }),
                el('span', 'aow-season-holiday__meta', null, null, [
                  el('span', 'aow-season-holiday__name', item.labels[lang] || item.labels.en),
                  el('span', 'aow-season-holiday__date', item.dateHint)
                ])
              ]);
              hb.addEventListener('click', function () { applySelection(item.id, true); });
              holBtns.push(hb);
            }
          })(SEASON_THEMES[i]);
        }

        var calmBtn = el('button', 'aow-season-calm', calm ? strings.fxCalm : strings.fxOn, {
          type: 'button',
          'aria-pressed': String(!calm)
        });
        calmBtn.addEventListener('click', function () {
          calm = !calm;
          safeSet(STORAGE_CALM, String(calm));
          setupCanvas();
          renderDock();
        });

        var popCelebrate = el('button', 'aow-season-celebrate', '✨ ' + strings.celebrate, { type: 'button' });
        popCelebrate.addEventListener('click', function (ev) {
          if (calm) {
            calm = false;
            safeSet(STORAGE_CALM, 'false');
            setupCanvas();
          }
          var rect = ev.currentTarget.getBoundingClientRect();
          spawnBurst(rect.left + rect.width / 2, rect.top, 34);
        });

        var pop = el('div', 'aow-season-popover', null, { role: 'dialog', 'aria-label': strings.aria }, [
          autoBtn,
          el('p', 'aow-season-heading', strings.seasons),
          el('div', 'aow-season-four', null, null, fourBtns),
          el('p', 'aow-season-heading', strings.holidays),
          el('div', 'aow-season-holidays', null, null, holBtns),
          el('div', 'aow-season-footer', null, null, [calmBtn, popCelebrate])
        ]);
        children.push(pop);
      }

      var triggerBtn = el('button', 'aow-season-trigger', null, {
        type: 'button',
        'aria-expanded': String(popoverOpen),
        'aria-haspopup': 'dialog',
        'aria-label': strings.aria,
        title: theme.greetings[lang] || theme.greetings.en
      }, [
        el('span', null, theme.emoji, { 'aria-hidden': 'true' }),
        el('span', null, theme.labels[lang] || theme.labels.en),
        el('span', null, popoverOpen ? '▴' : '▾', { 'aria-hidden': 'true' })
      ]);
      triggerBtn.addEventListener('click', function () {
        popoverOpen = !popoverOpen;
        renderDock();
      });

      var greetingText = el('span', 'aow-season-greeting', theme.greetings[lang] || theme.greetings.en);
      if (compact) greetingText.setAttribute('hidden', '');

      var celebratePill = el('button', 'aow-season-celebrate', '✨ ' + strings.celebrate, { type: 'button' });
      celebratePill.addEventListener('click', function (ev) {
        if (calm) {
          calm = false;
          safeSet(STORAGE_CALM, 'false');
          setupCanvas();
        }
        var rect = ev.currentTarget.getBoundingClientRect();
        spawnBurst(rect.left + rect.width / 2, rect.top, 34);
      });

      var collapseBtn = el('button', 'aow-season-collapse', '×', {
        type: 'button',
        'aria-label': strings.hideGreeting,
        title: strings.hideGreeting
      });
      if (compact) collapseBtn.setAttribute('hidden', '');
      collapseBtn.addEventListener('click', function () {
        compact = true;
        safeSet(STORAGE_COMPACT, 'true');
        renderDock();
      });

      var bar = el('div', 'aow-season-bar', null, null, [
        triggerBtn,
        greetingText,
        celebratePill,
        collapseBtn
      ]);
      children.push(bar);

      dock.replaceChildren.apply(dock, children);
    }

    function applySelection(next, fromUser) {
      selection = next === 'auto' || THEME_MAP[next] ? next : 'auto';
      var resolved = activeId();
      document.documentElement.setAttribute('data-season', resolved);
      if (fromUser) {
        compact = false;
        safeSet(STORAGE_COMPACT, 'false');
        safeSet(STORAGE_SEASON, selection);
        try {
          var url = new URL(window.location.href);
          if (selection === 'auto') url.searchParams.delete('season');
          else url.searchParams.set('season', selection);
          window.history.replaceState(window.history.state, '', url);
        } catch (e) { /* ignore */ }
      }
      renderDock();
      setupCanvas();
    }

    document.addEventListener('mousedown', function (ev) {
      if (popoverOpen && !dock.contains(ev.target)) {
        popoverOpen = false;
        renderDock();
      }
    });
    window.addEventListener('keydown', function (ev) {
      if (popoverOpen && ev.key === 'Escape') {
        popoverOpen = false;
        renderDock();
      }
    });

    if (typeof MutationObserver !== 'undefined') {
      var obs = new MutationObserver(function () {
        var nextLang = detectLang();
        lang = nextLang;
        renderDock();
      });
      obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['lang', 'dir', 'data-theme', 'class']
      });
    }

    applySelection(selection, false);
  }

  function scheduleBoot() {
    if (window.__next_f) {
      if (document.readyState === 'complete') {
        window.setTimeout(boot, 240);
      } else {
        window.addEventListener('load', function () {
          window.setTimeout(boot, 240);
        }, { once: true });
      }
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }

  scheduleBoot();
})();
