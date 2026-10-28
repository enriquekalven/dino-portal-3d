/**
 * speciesLocales.js — 9-Language Paleontological Species Localization for all 74 Species.
 *
 * Provides localized names, meanings, geological period labels, paleobiology stories,
 * 3D anatomical hotspots, fun facts, vocal descriptions, and apex action labels
 * across: English (`en`), Spanish (`es`), Chinese Mandarin (`zh-CN`), Chinese Cantonese (`zh-HK`),
 * Italian (`it`), Portuguese (`pt`), French (`fr`), Japanese (`ja`), and Korean (`ko`).
 */

import { ERA_LOCALIZATIONS, UI_STRINGS } from './locales.js';

/**
 * All 74 species mapped to their authentic names and etymological meanings in each language:
 * [zhCN_name, zhCN_meaning, zhHK_name, zhHK_meaning, ja_name, ja_meaning, ko_name, ko_meaning, es_meaning, it_meaning, pt_meaning, fr_meaning]
 */
export const SPECIES_TAXONOMY_I18N = {
  edaphosaurus: [
    '基龙', '“路面蜥蜴”（因其密集如鹅卵石的齿板得名）',
    '基龍', '「路面蜥蜴」（因佢密集似鵝卵石嘅齒板得名）',
    'エダフォサウルス', '「舗装されたトカゲ」（小石のような歯板に由来）',
    '에다포사우루스', '"포장도로 도마뱀" (자갈 같은 치판에서 유래)',
    '"Lagarto Pavimento" (por sus placas dentales empedradas)',
    '"Lucertola Pavimento" (per le piastre dentarie a ciottoli)',
    '"Lagarto Pavimento" (pelas placas dentárias empedradas)',
    '« Lézard pavé » (pour ses plaques dentaires en galets)',
  ],
  dimetrodon: [
    '异齿龙', '“两种尺寸的牙齿”',
    '異齒龍', '「兩種尺寸嘅牙齒」',
    'ディメトロドン', '「2種類の長さの歯」',
    '디메트로돈', '"두 가지 크기의 이빨"',
    '"Dos Medidas de Dientes"',
    '"Due Misure di Denti"',
    '"Duas Medidas de Dentes"',
    '« Deux mesures de dents »',
  ],
  scutosaurus: [
    '盾甲龙', '“盾牌蜥蜴”',
    '盾甲龍', '「盾牌蜥蜴」',
    'スクトサウルス', '「盾のトカゲ」',
    '스쿠토사우루스', '"방패 도마뱀"',
    '"Lagarto Escudo"',
    '"Lucertola Scudo"',
    '"Lagarto Escudo"',
    '« Lézard bouclier »',
  ],
  inostrancevia: [
    '伊诺斯特兰采夫兽 (丽齿兽)', '“以地质学家亚历山大·伊诺斯特兰采夫命名”',
    '伊諾斯特蘭采夫獸 (麗齒獸)', '「以地質學家亞歷山大·伊諾斯特蘭采夫命名」',
    'イノストランケヴィア (ゴルゴノプス類)', '「地質学者イノストランツェフに献名」',
    '이노스트란케비아 (고르고놉스류)', '"지질학자 이노스트란체프의 이름에서 유래"',
    '"Nombrado en honor al geólogo Aleksandr Inostrantsev"',
    '"Dedicato al geologo Aleksandr Inostrantsev"',
    '"Nomeado em homenagem ao geólogo Aleksandr Inostrantsev"',
    '« Nommé en l’honneur du géologue Aleksandr Inostrantsev »',
  ],
  lystrosaurus: [
    '水龙兽', '“铲子蜥蜴”',
    '水龍獸', '「鏟子蜥蜴」',
    'リストロサウルス', '「シャベルのトカゲ」',
    '리스트로사우루스', '"삽 도마뱀"',
    '"Lagarto Pala"',
    '"Lucertola Pala"',
    '"Lagarto Pá"',
    '« Lézard pelle »',
  ],
  eoraptor: [
    '始盗龙', '“月亮谷的黎明掠夺者”',
    '始盜龍', '「月亮谷嘅黎明掠奪者」',
    'エオラプトル', '「月の谷の夜明けの略奪者」',
    '에오랍토르', '"달의 계곡의 새벽 약탈자"',
    '"Ladrón del Amanecer del Valle de la Luna"',
    '"Predone dell’Alba della Valle della Luna"',
    '"Ladrão do Amanhecer do Vale da Lua"',
    '« Voleur de l’aube de la Vallée de la Lune »',
  ],
  herrerasaurus: [
    '埃雷拉龙', '“埃雷拉的蜥蜴”（纪念牧羊人维克多里诺·埃雷拉）',
    '埃雷拉龍', '「埃雷拉嘅蜥蜴」（紀念牧羊人維克多里諾·埃雷拉）',
    'ヘレラサウルス', '「ヘレラのトカゲ」（発見者ビクトリノ・ヘレラに由来）',
    '헤레라사우루스', '"에레라의 도마뱀" (발견자 빅토리노 에레라에서 유래)',
    '"Lagarto de Herrera" (por su descubridor Victorino Herrera)',
    '"Lucertola di Herrera" (dal pastore Victorino Herrera)',
    '"Lagarto de Herrera" (pelo descobridor Victorino Herrera)',
    '« Lézard d’Herrera » (d’après le berger Victorino Herrera)',
  ],
  shonisaurus: [
    '秀尼鱼龙', '“肖肖尼山脉的蜥蜴”',
    '秀尼魚龍', '「肖肖尼山脈嘅蜥蜴」',
    'ショニサウルス', '「ショーショーニー山脈のトカゲ」',
    '쇼니사우루스', '"쇼쇼니 산맥의 도마뱀"',
    '"Lagarto de las Montañas Shoshone"',
    '"Lucertola dei Monti Shoshone"',
    '"Lagarto das Montanhas Shoshone"',
    '« Lézard des monts Shoshone »',
  ],
  postosuchus: [
    '波斯特鳄', '“来自波斯特镇（得克萨斯州）的鳄鱼”',
    '波斯特鱷', '「來自波斯特鎮（得克薩斯州）嘅鱷魚」',
    'ポストスクス', '「ポスト（テキサス州）のワニ」',
    '포스토수쿠스', '"포스트(텍사스)에서 온 악어"',
    '"Cocodrilo de Post (Texas)"',
    '"Coccodrillo di Post (Texas)"',
    '"Crocodilo de Post (Texas)"',
    '« Crocodile de Post (Texas) »',
  ],
  coelophysis: [
    '腔骨龙', '“中空的形态（中空骨骼）”',
    '腔骨龍', '「中空嘅形態（中空骨骼）」',
    'コエロフィシス', '「中空の骨の形」',
    '코엘로피시스', '"속이 빈 형태"',
    '"Forma Hueca"',
    '"Forma Cava"',
    '"Forma Oca"',
    '« Forme creuse »',
  ],
  mussaurus: [
    '鼠龙', '“老鼠蜥蜴”（因最早发现的迷你幼体化石得名！）',
    '鼠龍', '「老鼠蜥蜴」（因最早發現嘅迷你BB化石得名！）',
    'ムスサウルス', '「ネズミのトカゲ」（小さな赤ちゃん化石に由来！）',
    '무스사우루스', '"생쥐 도마뱀" (작은 아기 화석에서 유래!)',
    '"Lagarto Ratón" (¡nombrado por diminutos fósiles de crías!)',
    '"Lucertola Topo" (dai minuscoli fossili di cuccioli!)',
    '"Lagarto Rato" (nomeado por minúsculos fósseis de filhotes!)',
    '« Lézard souris » (nommé d’après de minuscules fossiles de bébés !)',
  ],
  eudimorphodon: [
    '真双型齿翼龙', '“真正的双型牙齿”',
    '真雙型齒翼龍', '「真正嘅雙型牙齒」',
    'エウディモルフォドン', '「真の二形の歯」',
    '에우디모르포돈', '"진정한 두 가지 형태의 이빨"',
    '"Verdadero Diente de Dos Formas"',
    '"Vero Dente a Due Forme"',
    '"Verdadeiro Dente de Duas Formas"',
    '« Vraie dent à deux formes »',
  ],
  plateosaurus: [
    '板龙', '“宽阔强壮的蜥蜴”',
    '板龍', '「寬闊強壯嘅蜥蜴」',
    'プラテオサウルス', '「平たく頑丈なトカゲ」',
    '플라테오사우루스', '"넓고 튼튼한 도마뱀"',
    '"Lagarto Ancho"',
    '"Lucertola Larga"',
    '"Lagarto Largo"',
    '« Lézard large »',
  ],
  ichthyosaurus: [
    '鱼龙', '“鱼蜥蜴”',
    '魚龍', '「魚蜥蜴」',
    'イクチオサウルス', '「魚トカゲ」',
    '이크티오사우루스', '"물고기 도마뱀"',
    '"Lagarto Pez"',
    '"Lucertola Pesce"',
    '"Lagarto Peixe"',
    '« Lézard poisson »',
  ],
  dilophosaurus: [
    '双脊龙', '“双冠蜥蜴”',
    '雙脊龍', '「雙冠蜥蜴」',
    'ディロフォサウルス', '「2つのトサカを持つトカゲ」',
    '딜로포사우루스', '"두 개의 볏을 가진 도마뱀"',
    '"Lagarto de Dos Crestas"',
    '"Lucertola a Due Creste"',
    '"Lagarto de Duas Cristas"',
    '« Lézard à deux crêtes »',
  ],
  dimorphodon: [
    '双型齿翼龙', '“两种形态的牙齿”',
    '雙型齒翼龍', '「兩種形態嘅牙齒」',
    'ディモルフォドン', '「2つの形の歯」',
    '디모르포돈', '"두 가지 형태의 이빨"',
    '"Diente de Dos Formas"',
    '"Dente a Due Forme"',
    '"Dente de Duas Formas"',
    '« Dent à deux formes »',
  ],
  cryolophosaurus: [
    '冰脊龙 (“猫王龙”)', '“冰冻的冠蜥蜴”',
    '冰脊龍（「貓王龍」）', '「冰凍嘅冠蜥蜴」',
    'クリオロフォサウルス（「エルヴィスサウルス」）', '「凍ったトサカのトカゲ」',
    '크리올로포사우루스 ("엘비스사우루스")', '"얼어붙은 볏 도마뱀"',
    '"Lagarto de Cresta Helada"',
    '"Lucertola dalla Cresta Ghiacciata"',
    '"Lagarto de Crista Congelada"',
    '« Lézard à crête gelée »',
  ],
  plesiosaurus: [
    '蛇颈龙', '“近似蜥蜴”',
    '蛇頸龍', '「近似蜥蜴」',
    'プレシオサウルス（首長竜）', '「トカゲに近いもの」',
    '플레시오사우루스 (수장룡)', '"도마뱀에 가까운 생물"',
    '"Cercano al Lagarto"',
    '"Vicino alla Lucertola"',
    '"Próximo ao Lagarto"',
    '« Proche du lézard »',
  ],
  liopleurodon: [
    '滑齿龙', '“平滑侧面的牙齿”',
    '滑齒龍', '「平滑側面嘅牙齒」',
    'リオプレウロドン', '「滑らかな側面の歯」',
    '리오플레우로돈', '"매끄러운 측면 이빨"',
    '"Diente de Lado Liso"',
    '"Dente dal Lato Liscio"',
    '"Dente de Lado Liso"',
    '« Dent à face lisse »',
  ],
  tuojiangosaurus: [
    '沱江龙', '“四川沱江的剑龙”',
    '沱江龍', '「四川沱江嘅劍龍」',
    'トゥオジャンゴサウルス（沱江竜）', '「沱江（四川省の川）のトカゲ」',
    '투오장고사우루스 (타강룡)', '"퉈장강(사천성)의 도마뱀"',
    '"Lagarto del Río Tuo"',
    '"Lucertola del Fiume Tuo"',
    '"Lagarto do Rio Tuo"',
    '« Lézard de la rivière Tuo »',
  ],
  diplodocus: [
    '梁龙', '“双梁（人字骨）”',
    '梁龍', '「雙梁（人字骨）」',
    'ディプロドクス', '「二重の梁（尾椎のV字骨）」',
    '디플로도쿠스', '"이중 들보"',
    '"Doble Viga"',
    '"Doppia Trave"',
    '"Viga Dupla"',
    '« Double poutre »',
  ],
  brachiosaurus: [
    '腕龙', '“前臂蜥蜴（深胸巨龙）”',
    '腕龍', '「前臂蜥蜴（深胸巨龍）」',
    'ブラキオサウルス', '「腕のトカゲ（長い前脚）」',
    '브라키오사우루스', '"팔 도마뱀 (긴 앞다리)"',
    '"Lagarto Brazo"',
    '"Lucertola dalle Braccia"',
    '"Lagarto Braço"',
    '« Lézard à bras »',
  ],
  stegosaurus: [
    '剑龙', '“屋顶蜥蜴（背覆骨板）”',
    '劍龍', '「屋頂蜥蜴（背覆骨板）」',
    'ステゴサウルス', '「屋根のあるトカゲ」',
    '스테고사우루스', '"지붕 도마뱀"',
    '"Lagarto Techado"',
    '"Lucertola con Tetto"',
    '"Lagarto Telhado"',
    '« Lézard à toit »',
  ],
  kentrosaurus: [
    '钉状龙', '“尖刺蜥蜴”',
    '釘狀龍', '「尖刺蜥蜴」',
    'ケントロサウルス', '「鋭いトゲのトカゲ」',
    '켄트로사우루스', '"날카로운 가시 도마뱀"',
    '"Lagarto de Puntas Afiladas"',
    '"Lucertola dalle Punte Aguzze"',
    '"Lagarto de Pontas Afiadas"',
    '« Lézard à pointes acérées »',
  ],
  apatosaurus: [
    '迷惑龙', '“迷惑蜥蜴”',
    '迷惑龍', '「迷惑蜥蜴」',
    'アパトサウルス', '「惑わすトカゲ」',
    '아파토사우루스', '"속이는 도마뱀"',
    '"Lagarto Engañoso"',
    '"Lucertola Ingannevole"',
    '"Lagarto Enganoso"',
    '« Lézard trompeur »',
  ],
  brontosaurus: [
    '雷龙', '“高贵的雷霆蜥蜴”',
    '雷龍', '「高貴嘅雷霆蜥蜴」',
    'ブロントサウルス', '「高貴なる雷のトカゲ」',
    '브론토사우루스', '"고귀한 천둥 도마뱀"',
    '"Noble Lagarto del Trueno"',
    '"Nobile Lucertola del Tuono"',
    '"Nobre Lagarto do Trovão"',
    '« Noble lézard du tonnerre »',
  ],
  ceratosaurus: [
    '角鼻龙', '“长角的蜥蜴（鼻角猎手）”',
    '角鼻龍', '「生角嘅蜥蜴（鼻角獵手）」',
    'ケラトサウルス', '「角のあるトカゲ（鼻角）」',
    '케라토사우루스', '"뿔 달린 도마뱀"',
    '"Lagarto Cornudo"',
    '"Lucertola Cornuta"',
    '"Lagarto Chifrudo"',
    '« Lézard cornu »',
  ],
  camarasaurus: [
    '圆顶龙', '“腔室蜥蜴（气腔脊椎）”',
    '圓頂龍', '「腔室蜥蜴（氣腔脊椎）」',
    'カマラサウルス', '「部屋のあるトカゲ（中空の脊椎）」',
    '카마라사우루스', '"방이 있는 도마뱀"',
    '"Lagarto con Cámaras"',
    '"Lucertola Camerata"',
    '"Lagarto com Câmaras"',
    '« Lézard chambré »',
  ],
  allosaurus: [
    '异特龙', '“奇异的蜥蜴”',
    '異特龍', '「奇異嘅蜥蜴」',
    'アロサウルス', '「異なるトカゲ」',
    '알로사우루스', '"다른 도마뱀"',
    '"Lagarto Diferente"',
    '"Lucertola Diversa"',
    '"Lagarto Diferente"',
    '« Lézard différent »',
  ],
  archaeopteryx: [
    '始祖鸟', '“古老的翅膀 / 远古之羽”',
    '始祖鳥', '「古老嘅翅膀 / 遠古之羽」',
    'アーケオプテリクス（始祖鳥）', '「古代の翼・古代の羽」',
    '시조새 (아르카이옵테릭스)', '"고대의 날개 / 고대의 깃털"',
    '"Ala Antigua / Pluma Antigua"',
    '"Ala Antica / Piuma Antica"',
    '"Asa Antiga / Pena Antiga"',
    '« Aile ancienne / Plume ancienne »',
  ],
  compsognathus: [
    '美颌龙', '“优雅精致的下颚”',
    '美頜龍', '「優雅精緻嘅下顎」',
    'コンプソグナトゥス', '「優美な顎」',
    '콤프소그나투스', '"우아한 턱"',
    '"Mandíbula Elegante"',
    '"Mascella Elegante"',
    '"Mandíbula Elegante"',
    '« Mâchoire élégante »',
  ],
  rhamphorhynchus: [
    '喙嘴翼龙', '“长着鸟喙的吻部”',
    '喙嘴翼龍', '「生有鳥喙嘅吻部」',
    'ランフォリンクス', '「くちばし状の鼻先」',
    '람포링쿠스', '"부리 주둥이"',
    '"Hocico con Pico"',
    '"Muso a Becco"',
    '"Focinho com Bico"',
    '« Museau à bec »',
  ],
  utahraptor: [
    '犹他盗龙', '“犹他州的顶级掠食者”',
    '猶他盜龍', '「猶他州嘅頂級掠食者」',
    'ユタラプトル', '「ユタ州の略奪者」',
    '유타랍토르', '"유타주의 약탈자"',
    '"Depredador de Utah"',
    '"Predatore dello Utah"',
    '"Predador de Utah"',
    '« Prédateur de l’Utah »',
  ],
  baryonyx: [
    '重爪龙', '“沉重的巨爪”',
    '重爪龍', '「沉重嘅巨爪」',
    'バリオニクス', '「重い鉤爪」',
    '바리오닉스', '"무거운 발톱"',
    '"Garra Pesada"',
    '"Artiglio Pesante"',
    '"Garra Pesada"',
    '« Griffe lourde »',
  ],
  iguanodon: [
    '禽龙', '“鬣蜥之齿”',
    '禽龍', '「鬣蜥之齒」',
    'イグアノドン', '「イグアナの歯」',
    '이구아노돈', '"이구아나의 이빨"',
    '"Diente de Iguana"',
    '"Dente di Iguana"',
    '"Dente de Iguana"',
    '« Dent d’iguane »',
  ],
  yutyrannus: [
    '羽王龙 (华丽羽王龙)', '“美丽的羽毛暴君”',
    '羽王龍 (華麗羽王龍)', '「美麗嘅羽毛暴君」',
    'ユウティラヌス（羽毛の暴君竜）', '「美しい羽毛の暴君」',
    '유티란누스 (깃털 폭군룡)', '"아름다운 깃털 폭군"',
    '"Hermoso Tirano Emplumado"',
    '"Bellissimo Tiranno Piumato"',
    '"Belo Tirano Emplumado"',
    '« Beau tyran à plumes »',
  ],
  amargasaurus: [
    '阿马加龙 (双帆颈蜥脚类)', '“阿马加峡谷的蜥蜴”',
    '阿馬加龍 (雙帆頸蜥腳類)', '「阿馬加峽谷嘅蜥蜴」',
    'アマルガサウルス（二列の首帆竜）', '「ラ・アマルガ渓谷のトカゲ」',
    '아마르가사우루스 (이중 목돛 공룡)', '"라 아마르가 협곡의 도마뱀"',
    '"Lagarto del Cañón de La Amarga"',
    '"Lucertola del Canyon La Amarga"',
    '"Lagarto do Cânion La Amarga"',
    '« Lézard du canyon de La Amarga »',
  ],
  microraptor: [
    '小盗龙 (四翼滑翔恐龙)', '“小型掠夺者”',
    '小盜龍 (四翼滑翔恐龍)', '「小型掠奪者」',
    'ミクロラプトル（四枚の翼の恐竜）', '「小さな略奪者」',
    '미크로랍토르 (네 날개 활공 공룡)', '"작은 약탈자"',
    '"Pequeño Capturador (Planeador de 4 Alas)"',
    '"Piccolo Predatore (Planatore a 4 Ali)"',
    '"Pequeno Capturador (Planador de 4 Asas)"',
    '« Petit voleur (Planeur à quatre ailes) »',
  ],
  psittacosaurus: [
    '鹦鹉嘴龙', '“鹦鹉蜥蜴”',
    '鸚鵡嘴龍', '「鸚鵡蜥蜴」',
    'プシッタコサウルス', '「オウムのトカゲ」',
    '프시타코사우루스 (앵무새 공룡)', '"앵무새 도마뱀"',
    '"Lagarto Loro"',
    '"Lucertola Pappagallo"',
    '"Lagarto Papagaio"',
    '« Lézard perroquet »',
  ],
  suchomimus: [
    '似鳄龙', '“似鳄者（撒哈拉泰内雷沙漠猎手）”',
    '似鱷龍', '「似鱷者（撒哈拉泰內雷沙漠獵手）」',
    'スコミムス', '「ワニもどき（テネレ砂漠の魚食竜）」',
    '수코미무스', '"악어를 닮은 공룡"',
    '"Imitador de Cocodrilo"',
    '"Imitatore di Coccodrillo"',
    '"Imitador de Crocodilo"',
    '« Imitateur de crocodile »',
  ],
  deinonychus: [
    '恐爪龙', '“恐怖的巨爪”',
    '恐爪龍', '「恐怖嘅巨爪」',
    'デイノニクス', '「恐ろしい鉤爪」',
    '데이노니쿠스', '"무시무시한 발톱"',
    '"Garra Terrible"',
    '"Artiglio Terribile"',
    '"Garra Terrível"',
    '« Griffe terrible »',
  ],
  acrocanthosaurus: [
    '高棘龙', '“高神经棘蜥蜴”',
    '高棘龍', '「高神經棘蜥蜴」',
    'アクロカントサウルス', '「高いトゲのトカゲ」',
    '아크로칸토사우루스', '"높은 가시 도마뱀"',
    '"Lagarto de Espinas Altas"',
    '"Lucertola dalle Spine Alte"',
    '"Lagarto de Espinhos Altos"',
    '« Lézard à hautes épines »',
  ],
  sauropelta: [
    '蜥结龙 (肩刺结节龙)', '“盾甲蜥蜴”',
    '蜥結龍 (肩刺結節龍)', '「盾甲蜥蜴」',
    'サウロペルタ（肩トゲの鎧竜）', '「トカゲの盾」',
    '사우로펠타 (어깨 가시 갑옷공룡)', '"도마뱀 방패"',
    '"Escudo de Lagarto"',
    '"Scudo di Lucertola"',
    '"Escudo de Lagarto"',
    '« Bouclier de lézard »',
  ],
  tapejara: [
    '古神翼龙', '“古老的存在”（源自图皮原住民语）',
    '古神翼龍', '「古老嘅存在」（源自圖皮原住民語）',
    'タペジャラ（帆冠の翼竜）', '「古き存在」（先住民トゥピ語に由来）',
    '타페자라 (돛 볏 익룡)', '"오래된 존재" (투피 원주민어에서 유래)',
    '"El Ser Antiguo" (del idioma indígena tupí)',
    '"L’Essere Antico" (dalla lingua indigena Tupi)',
    '"O Ser Antigo" (do idioma indígena Tupi)',
    '« L’Être ancien » (de la langue indigène tupi)',
  ],
  kronosaurus: [
    '克柔龙', '“泰坦神王克洛诺斯的蜥蜴”',
    '克柔龍', '「泰坦神王克洛諾斯嘅蜥蜴」',
    'クロノサウルス', '「巨神クロノスのトカゲ」',
    '크로노사우루스', '"타이탄의 왕 크로노스의 도마뱀"',
    '"Lagarto de Cronos (Rey de los Titanes)"',
    '"Lucertola di Crono (Re dei Titani)"',
    '"Lagarto de Cronos (Rei dos Titãs)"',
    '« Lézard de Cronos (Roi des Titans) »',
  ],
  giganotosaurus: [
    '南方巨兽龙', '“巨大的南方蜥蜴”',
    '南方巨獸龍', '「巨大嘅南方蜥蜴」',
    'ギガノトサウルス', '「南の巨大なトカゲ」',
    '기가노토사우루스', '"거대한 남쪽 도마뱀"',
    '"Lagarto Gigante del Sur"',
    '"Lucertola Gigante del Sud"',
    '"Lagarto Gigante do Sul"',
    '« Lézard géant du Sud »',
  ],
  spinosaurus: [
    '棘龙 (埃及棘龙)', '“棘刺蜥蜴”',
    '棘龍 (埃及棘龍)', '「棘刺蜥蜴」',
    'スピノサウルス', '「背ビレ（棘）のトカゲ」',
    '스피노사우루스', '"가시 도마뱀"',
    '"Lagarto Espina"',
    '"Lucertola Spina"',
    '"Lagarto Espinho"',
    '« Lézard épineux »',
  ],
  carcharodontosaurus: [
    '鲨齿龙', '“锯齿鲨鱼牙蜥蜴”',
    '鯊齒龍', '「鋸齒鯊魚牙蜥蜴」',
    'カルカロドントサウルス', '「サメの歯を持つトカゲ」',
    '카르카로돈토사우루스', '"상어 이빨 도마뱀"',
    '"Lagarto con Dientes de Tiburón"',
    '"Lucertola dai Denti di Squalo"',
    '"Lagarto com Dentes de Tubarão"',
    '« Lézard aux dents de requin »',
  ],
  argentinosaurus: [
    '阿根廷龙', '“阿根廷的巨型蜥蜴”',
    '阿根廷龍', '「阿根廷嘅巨型蜥蜴」',
    'アルゼンチノサウルス', '「アルゼンチンのトカゲ」',
    '아르헨티노사우루스', '"아르헨티나 도마뱀"',
    '"Lagarto de Argentina"',
    '"Lucertola dell’Argentina"',
    '"Lagarto da Argentina"',
    '« Lézard d’Argentine »',
  ],
  carnotaurus: [
    '食肉牛龙', '“食肉的公牛”',
    '食肉牛龍', '「食肉嘅公牛」',
    'カルノタウルス', '「肉食の雄牛」',
    '카르노타우루스', '"고기를 먹는 황소"',
    '"Toro Carnívoro"',
    '"Toro Carnivoro"',
    '"Touro Carnívoro"',
    '« Taureau carnivore »',
  ],
  pteranodon: [
    '无齿翼龙', '“有翼却无齿”',
    '無齒翼龍', '「有翼但無齒」',
    'プテラノドン', '「歯のない翼」',
    '프테라노돈', '"이빨 없는 날개"',
    '"Ala Sin Dientes"',
    '"Ala Senza Denti"',
    '"Asa Sem Dentes"',
    '« Aile sans dents »',
  ],
  elasmosaurus: [
    '薄板龙 (72节颈椎蛇颈龙)', '“薄板蜥蜴”',
    '薄板龍 (72節頸椎蛇頸龍)', '「薄板蜥蜴」',
    'エラスモサウルス（首の骨72個！）', '「薄い板のトカゲ」',
    '엘라스모사우루스 (경추 72개 수장룡!)', '"얇은 판 도마뱀"',
    '"Lagarto de Placa Delgada"',
    '"Lucertola a Piastra Sottile"',
    '"Lagarto de Placa Fina"',
    '« Lézard à plaque mince »',
  ],
  dreadnoughtus: [
    '无畏巨龙', '“无所畏惧”（以无畏级战列舰命名）',
    '無畏巨龍', '「無所畏懼」（以無畏級戰列艦命名）',
    'ドレッドノータス', '「何も恐れないもの（戦艦ドレッドノートに由来）」',
    '드레드노투스', '"두려움이 없는 거인"',
    '"El Que No Teme a Nada"',
    '"Colui Che Non Teme Nulla"',
    '"Aquele Que Não Teme Nada"',
    '« Qui ne craint rien »',
  ],
  maiasaura: [
    '慈母龙', '“好妈妈蜥蜴”',
    '慈母龍', '「好媽媽蜥蜴」',
    'マイアサウラ（子育て恐竜）', '「優しいお母さんトカゲ」',
    '마이아사우라 (자상한 엄마 공룡)', '"착한 엄마 도마뱀"',
    '"Lagarto Buena Madre"',
    '"Lucertola Buona Madre"',
    '"Lagarto Boa Mãe"',
    '« Lézard bonne mère »',
  ],
  corythosaurus: [
    '冠龙 (盔龙)', '“科林斯头盔蜥蜴”',
    '冠龍 (盔龍)', '「科林斯頭盔蜥蜴」',
    'コリトサウルス', '「コリント式兜のトカゲ」',
    '코리토사우루스', '"코린트 투구 도마뱀"',
    '"Lagarto con Casco Corintio"',
    '"Lucertola con Elmo Corinzio"',
    '"Lagarto com Elmo Coríntio"',
    '« Lézard à casque corinthien »',
  ],
  parasaurolophus: [
    '副栉龙', '“近似有冠的蜥蜴”',
    '副櫛龍', '「近似有冠嘅蜥蜴」',
    'パラサウロロフス', '「トサカのあるトカゲに似たもの」',
    '파라사우롤로푸스', '"볏 달린 도마뱀과 비슷한 생물"',
    '"Cercano al Lagarto Crestado"',
    '"Vicino alla Lucertola Crestata"',
    '"Próximo ao Lagarto de Crista"',
    '« Proche du lézard à crête »',
  ],
  styracosaurus: [
    '戟龙 (六刺颈盾角龙)', '“长满尖刺的蜥蜴”',
    '戟龍 (六刺頸盾角龍)', '「生滿尖刺嘅蜥蜴」',
    'スティラコサウルス（6本角フリル）', '「槍の穂先のトカゲ」',
    '스티라코사우루스 (6개의 프릴 뿔)', '"가시 창 끝 도마뱀"',
    '"Lagarto Espinoso"',
    '"Lucertola Spinosa"',
    '"Lagarto Espinhoso"',
    '« Lézard à pointes de lance »',
  ],
  velociraptor: [
    '伶盗龙 (迅猛龙)', '“敏捷的掠夺者”',
    '伶盜龍 (迅猛龍)', '「敏捷嘅掠奪者」',
    'ヴェロキラプトル', '「素早い略奪者」',
    '벨로키랍토르', '"재빠른 약탈자"',
    '"Ladrón Veloz"',
    '"Predone Veloce"',
    '"Ladrão Veloz"',
    '« Voleur rapide »',
  ],
  oviraptor: [
    '偷蛋龙 / 葬火龙 (护巢慈父慈母)', '“偷蛋者”（曾被冤枉，其实是孵蛋的好父母！）',
    '偷蛋龍 / 葬火龍 (護巢好父母)', '「偷蛋者」（以前俾人冤枉，其實係孵蛋嘅好父母！）',
    'オヴィラプトル / キティパティ（卵を守る親）', '「卵泥棒（実は自分の卵を温めていた親！）」',
    '오비랍토르 / 키티파티 (알을 품은 부모)', '"알 도둑" (사실은 자기 알을 품던 헌신적인 부모!)',
    '"Ladrón de Huevos" (¡acusado injustamente, en realidad cuidaba su nido!)',
    '"Ladro di Uova" (accusato ingiustamente: in realtà covava il suo nido!)',
    '"Ladrão de Ovos" (acusado injustamente — na verdade era um pai dedicado!)',
    '« Voleur d’œufs » (accusé à tort — c’était un parent dévoué couvant son nid !)',
  ],
  protoceratops: [
    '原角龙', '“第一张有角的脸”',
    '原角龍', '「第一張有角嘅面」',
    'プロトケラトプス', '「最初の角のある顔」',
    '프로토케라톱스', '"최초의 뿔 달린 얼굴"',
    '"Primera Cara con Cuernos"',
    '"Prima Faccia Cornuta"',
    '"Primeira Face com Chifres"',
    '« Premier visage cornu »',
  ],
  pachyrhinosaurus: [
    '厚鼻龙 (北极鼻瘤角龙)', '“厚鼻子蜥蜴”',
    '厚鼻龍 (北極鼻瘤角龍)', '「厚鼻蜥蜴」',
    'パキリノサウルス', '「分厚い鼻のトカゲ」',
    '파키리노사우루스', '"두꺼운 코 도마뱀"',
    '"Lagarto de Nariz Gruesa"',
    '"Lucertola dal Naso Spesso"',
    '"Lagarto de Nariz Grosso"',
    '« Lézard au nez épais »',
  ],
  therizinosaurus: [
    '镰刀龙', '“巨镰蜥蜴”',
    '鐮刀龍', '「巨鐮蜥蜴」',
    'テリジノサウルス', '「大鎌のトカゲ（1mの爪！）」',
    '테리지노사우루스', '"낫 도마뱀 (1m 거대 발톱)"',
    '"Lagarto Guadaña"',
    '"Lucertola Falce"',
    '"Lagarto Foice"',
    '« Lézard faux »',
  ],
  gallimimus: [
    '似鸡龙 (鸵鸟恐龙)', '“模仿鸡的恐龙”',
    '似雞龍 (鴕鳥恐龍)', '「模仿雞嘅恐龍」',
    'ガリミムス（ダチョウ恐竜）', '「ニワトリもどき」',
    '갈리미무스 (타조 공룡)', '"닭을 닮은 공룡"',
    '"Imitador de Gallina"',
    '"Imitatore di Gallina"',
    '"Imitador de Galinha"',
    '« Imitateur de poule »',
  ],
  mosasaurus: [
    '沧龙', '“默兹河的蜥蜴”',
    '滄龍', '「默茲河嘅蜥蜴」',
    'モササウルス', '「マース川のトカゲ」',
    '모사사우루스', '"뫼즈강의 도마뱀"',
    '"Lagarto del Río Mosa"',
    '"Lucertola del Fiume Mosa"',
    '"Lagarto do Rio Mosa"',
    '« Lézard de la Meuse »',
  ],
  'tyrannosaurus-rex': [
    '霸王龙 (雷克斯暴龙)', '“暴君蜥蜴之王”',
    '霸王龍 (雷克斯暴龍)', '「暴君蜥蜴之王」',
    'ティラノサウルス・レックス', '「暴君トカゲの王」',
    '티라노사우루스 렉스', '"폭군 도마뱀의 왕"',
    '"Rey Lagarto Tirano"',
    '"Re Lucertola Tiranno"',
    '"Rei Lagarto Tirano"',
    '« Roi des lézards tyrans »',
  ],
  triceratops: [
    '三角龙', '“三只角的脸”',
    '三角龍', '「三隻角嘅面」',
    'トリケラトプス', '「3本の角がある顔」',
    '트리케라톱스', '"세 개의 뿔이 달린 얼굴"',
    '"Cara de Tres Cuernos"',
    '"Faccia a Tre Corni"',
    '"Face de Três Chifres"',
    '« Visage à trois cornes »',
  ],
  ankylosaurus: [
    '甲龙', '“融合装甲的蜥蜴”',
    '甲龍', '「融合裝甲嘅蜥蜴」',
    'アンキロサウルス', '「連結した装甲トカゲ」',
    '안킬로사우루스', '"융합된 갑옷 도마뱀"',
    '"Lagarto Fundido / Acorazado"',
    '"Lucertola Fusa / Corazzata"',
    '"Lagarto Fundido / Encouraçado"',
    '« Lézard soudé / cuirassé »',
  ],
  quetzalcoatlus: [
    '风神翼龙 (羽蛇神翼龙)', '“阿兹特克羽蛇神魁札尔科亚特尔”',
    '風神翼龍 (羽蛇神翼龍)', '「阿茲特克羽蛇神魁札爾科亞特爾」',
    'ケツァルコアトルス', '「羽毛ある蛇の神（ケツァルコアトル）」',
    '케찰코아틀루스', '"깃털 달린 뱀의 신 (케찰코아틀)"',
    '"Dios Serpiente Emplumada (Quetzalcóatl)"',
    '"Dio Serpente Piumato (Quetzalcoatl)"',
    '"Deus Serpente Emplumada (Quetzalcoatl)"',
    '« Dieu Serpent à plumes (Quetzalcoatl) »',
  ],
  pachycephalosaurus: [
    '肿头龙', '“厚头骨蜥蜴”',
    '腫頭龍', '「厚頭骨蜥蜴」',
    'パキケファロサウルス', '「分厚い石頭のトカゲ」',
    '파키케팔로사우루스 (박치기공룡)', '"두꺼운 머리 도마뱀"',
    '"Lagarto de Cabeza Gruesa"',
    '"Lucertola dalla Testa Spessa"',
    '"Lagarto de Cabeça Grossa"',
    '« Lézard à tête épaisse »',
  ],
  edmontosaurus: [
    '埃德蒙顿龙 (“达科他”恐龙木乃伊)', '“来自埃德蒙顿的蜥蜴”',
    '埃德蒙頓龍（「達科他」恐龍木乃伊）', '「來自埃德蒙頓嘅蜥蜴」',
    'エドモントサウルス（「ダコタ」恐竜ミイラ）', '「エドモントンのトカゲ」',
    '에드몬토사우루스 ("다코타" 공룡 미라)', '"에드먼턴의 도마뱀"',
    '"Lagarto de Edmonton"',
    '"Lucertola di Edmonton"',
    '"Lagarto de Edmonton"',
    '« Lézard d’Edmonton »',
  ],
  stygimoloch: [
    '冥河龙', '“来自冥河的带角恶魔”',
    '冥河龍', '「來自冥河嘅生角惡魔」',
    'スティギモロク', '「冥界ステュクス川の角ある悪魔」',
    '스티기몰로크', '"스틱스강의 뿔 달린 악마"',
    '"Demonio Cornudo del Río Estigia"',
    '"Diavolo Cornuto del Fiume Stige"',
    '"Demônio Chifrudo do Rio Estige"',
    '« Démon cornu du fleuve Styx »',
  ],
  hesperornis: [
    '黄昏鸟 (有齿潜水古鸟)', '“西方皇家之鸟”',
    '黃昏鳥 (有齒潛水古鳥)', '「西方皇家之鳥」',
    'ヘスペロルニス（歯のある潜水鳥）', '「西方の王鳥」',
    '헤스페로르니스 (이빨 있는 잠수조)', '"서쪽의 왕실 새"',
    '"Ave Occidental Real"',
    '"Uccello Occidentale Reale"',
    '"Ave Ocidental Real"',
    '« Oiseau royal d’Occident »',
  ],
  'chicxulub-avian-survivor': [
    'K-Pg 陨石撞击与幸存鸟类恐龙', '“鸟之翼 —— 依然生活在我们身边的恐龙”',
    'K-Pg 隕石撞擊與生還鳥類恐龍', '「鳥之翼 —— 依然生活喺我哋身邊嘅恐龍」',
    'K-Pg境界 小惑星衝突と生き残った鳥類恐竜', '「鳥の翼 — 今も私たちの隣に生きる恐竜たち」',
    'K-Pg 소행성 충돌과 생존 조류 공룡 (새)', '"새의 날개 — 지금도 우리 곁에 살아있는 공룡"',
    '"Alas de Ave — Los Dinosaurios que Aún Viven Entre Nosotros"',
    '"Ali d’Uccello — I Dinosauri che Vivono Ancora tra Noi"',
    '"Asas de Ave — Os Dinossauros que Ainda Vivem Entre Nós"',
    '« Ailes d’oiseau — Les dinosaures qui vivent encore parmi nous »',
  ],
  gastornis: [
    '加斯顿鸟 / 恐鹤 (白垩纪后巨鸟)', '“加斯顿·普朗特的巨鸟”',
    '加斯頓鳥 / 恐鶴 (白堊紀後巨鳥)', '「加斯頓·普朗特嘅巨鳥」',
    'ガストルニス（巨鳥ディアトリマ）', '「ガストン・プランテの巨鳥」',
    '가스토르니스 (거대 공포새)', '"가스통 플랑테의 거대 새"',
    '"Ave Gigante de Gaston Planté"',
    '"Uccello Gigante di Gaston Planté"',
    '"Ave Gigante de Gaston Planté"',
    '« Oiseau géant de Gaston Planté »',
  ],
};

/**
 * German ('de') and Arabic ('ar') taxonomy map for all 74 species:
 * [deMeaning, arName, arMeaning]
 */
export const SPECIES_DE_AR_I18N = {
  // PERMIAN
  dimetrodon: ['„Zwei Maß Zähne“', 'ديميترودون', '«مقياسان للأسنان»'],
  edaphosaurus: ['„Pflaster-Echse“', 'إدافوصور', '«سحلية الرصيف»'],
  inostrancevia: ['„Benannt nach Alexander Inostranzew“', 'إنوسترانسيفيا', '«تيمناً بألكسندر إنوسترانسيف»'],
  diplocaulus: ['„Doppelter Stiel“', 'ديبلوكاولوس', '«الساق المزدوجة»'],
  estemmenosuchus: ['„Gekrönter Krokodilier“', 'إستيمينوسوكس', '«التمساح المتوَّج»'],
  helicoprion: ['„Spiralsäge“', 'هيليكوبريون', '«المنشار اللولبي»'],
  scutosaurus: ['„Schild-Echse“', 'سكوتوصور', '«سحلية الدرع»'],
  prionosuchus: ['„Säge-Krokodil“', 'بريونوسوكس', '«تمساح المنشار»'],
  lystrosaurus: ['„Schaufel-Echse“', 'ليستروصور', '«سحلية المجرفة»'],
  cotylorhynchus: ['„Becher-Schnauze“', 'كوتيلورينكوس', '«الخطم الكأسي»'],
  eryops: ['„Langgezogenes Gesicht“', 'إيريوبس', '«الوجه الممدود»'],
  seymouria: ['„Echse aus Seymour (Texas)“', 'سيموريا', '«سحلية سيمور (تكساس)»'],
  moschops: ['„Kalbsgesicht“', 'موشوبس', '«وجه العجل»'],

  // TRIASSIC
  coelophysis: ['„Hohle Gestalt (Hohlknochen)“', 'سيلوفيسيس', '«الشكل المجوَّف (عظام مجوفة)»'],
  plateosaurus: ['„Breite Echse“', 'بلاتيوصور', '«السحلية العريضة»'],
  herrerasaurus: ['„Herreras Echse“', 'هيريراصور', '«سحلية هيريرا»'],
  eoraptor: ['„Jäger der Morgenröte“', 'إيورابتور', '«سارق الفجر»'],
  postosuchus: ['„Krokodil aus Post (Texas)“', 'بوستوسوكس', '«تمساح بوست (تكساس)»'],
  nothosaurus: ['„Falsche Echse“', 'نوثوصور', '«السحلية الزائفة»'],
  tanystropheus: ['„Langgestreckter Wirbel“', 'تانيستروفيوس', '«الفقرة الطويلة الممتدة»'],
  placodus: ['„Flacher Zahn“', 'بلاكودوس', '«السن المسطحة»'],
  shonisaurus: ['„Echse aus den Shoshone-Bergen“', 'شونيساوروس', '«سحلية جبال شوشون»'],
  desmatosuchus: ['„Glieder-Krokodil“', 'ديسماتوسوكس', '«التمساح المترابط»'],
  eudimorphodon: ['„Echter Zweigestalt-Zahn“', 'إيوديمورفودون', '«ثنائي شكل الأسنان الحقيقي»'],
  peteinosaurus: ['„Geflügelte Echse“', 'بيتينوصور', '«السحلية المجنحة»'],
  mastodonsaurus: ['„Brustwarzenzahn-Echse“', 'ماستودونصور', '«سحلية الأسنان الحلمية»'],

  // JURASSIC
  brachiosaurus: ['„Arm-Echse“', 'براكيوصور', '«سحلية الذراع»'],
  allosaurus: ['„Andersartige Echse“', 'ألوصور', '«السحلية المختلفة»'],
  stegosaurus: ['„Dach-Echse“', 'ستيغوصور', '«السحلية المسقوفة»'],
  archaeopteryx: ['„Uralte Feder / Urvogel“', 'أركيوبتركس', '«الريشة القديمة / الجناح العتيق»'],
  diplodocus: ['„Doppelbalken“', 'ديبلودوكس', '«العارضة المزدوجة»'],
  dilophosaurus: ['„Zweikamm-Echse“', 'ديلوفوصور', '«السحلية ذات العرفين»'],
  ceratosaurus: ['„Horn-Echse“', 'سيراتوصور', '«السحلية القرناء»'],
  apatosaurus: ['„Täuschende Echse“', 'أباتوصور', '«السحلية الخادعة»'],
  kentrosaurus: ['„Stachel-Echse“', 'كنتروصور', '«السحلية الشائكة»'],
  plesiosaurus: ['„Fast-Echse“', 'بليزوصور', '«شبيه السحلية»'],
  liopleurodon: ['„Glattseitiger Zahn“', 'ليوبلورودون', '«ذو الأسنان الملساء الجوانب»'],
  ichthyosaurus: ['„Fisch-Echse“', 'إكثيوصور', '«سحلية السمكة»'],
  rhamphorhynchus: ['„Schnabel-Schnauze“', 'رامفورينكوس', '«الخطم المنقاري»'],
  compsognathus: ['„Zierlicher Kiefer“', 'كومبسوغناثوس', '«الفك الأنيق»'],
  camarasaurus: ['„Kammer-Echse“', 'كاماراصور', '«السحلية ذات الحجرات»'],

  // EARLY CRETACEOUS
  spinosaurus: ['„Dornen-Echse“', 'سبينوصور', '«السحلية الشوكية»'],
  iguanodon: ['„Leguan-Zahn“', 'إيغوانودون', '«سن الإيغوانا»'],
  microraptor: ['„Kleiner Räuber“', 'ميكرورابتور', '«اللص الصغير»'],
  deinonychus: ['„Schreckliche Klaue“', 'دينونيكوس', '«المخلب الرهيب»'],
  amargasaurus: ['„La-Amarga-Echse“', 'أمارغاصور', '«سحلية لا أمارغا»'],
  baryonyx: ['„Schwere Klaue“', 'باريونيكس', '«المخلب الثقيل»'],
  utahraptor: ['„Räuber aus Utah“', 'يوتارابتور', '«مفترس يوتا»'],
  acanthopholis: ['„Dornenschuppen-Träger“', 'أكانثوفوليس', '«حامل الحراشف الشوكية»'],
  carcharodontosaurus: ['„Haifischzahn-Echse“', 'كاركارودونتوصور', '«سحلية أسنان القرش»'],
  concavenator: ['„Jäger aus Cuenca mit Höcker“', 'كونكافيناتور', '«صياد قونكة ذو السنام»'],
  ouranosaurus: ['„Tapfere Echse“', 'أورانوصور', '«السحلية الشجاعة»'],
  psittacosaurus: ['„Papageien-Echse“', 'بسيتاكوصور', '«السحلية الببغائية»'],
  kronosaurus: ['„Echse des Kronos“', 'كرونوصور', '«سحلية كرونوس»'],
  tapejara: ['„Das alte Wesen“', 'تابيجارا', '«الكائن القديم»'],
  sarcosuchus: ['„Fleisch-Krokodil“', 'ساركوسوكس', '«تمساح اللحم»'],
  pterodaustro: ['„Südlicher Flügel“', 'بتيروداوسترو', '«جناح الجنوب»'],

  // LATE CRETACEOUS
  'tyrannosaurus-rex': ['„König der Tyrannenechsen“', 'تيرانوصور ريكس', '«ملك السحالي الطاغية»'],
  triceratops: ['„Dreihorn-Gesicht“', 'ترايسيراتوبس', '«الوجه ذو القرون الثلاثة»'],
  velociraptor: ['„Schneller Räuber“', 'فيلوسيرابتور', '«السارق السريع»'],
  parasaurolophus: ['„Fast-Kamm-Echse“', 'باراصورولوفوس', '«شبيه السحلية المتوجة»'],
  ankylosaurus: ['„Verschmolzene / Gepanzerte Echse“', 'أنكيلوصور', '«السحلية الملتحمة المدرعة»'],
  quetzalcoatlus: ['„Gefiederte Schlange (Quetzalcoatl)“', 'كيتزالكواتلس', '«الثعبان ذو الريش (كيتزالكواتل)»'],
  mosasaurus: ['„Echse von der Maas“', 'موزاصور', '«سحلية نهر الميز»'],
  carnotaurus: ['„Fleischfressender Stier“', 'كارنوتوروس', '«الثور آكل اللحوم»'],
  therizinosaurus: ['„Sensen-Echse“', 'ثيريزينوصور', '«سحلية المنجل»'],
  pachycephalosaurus: ['„Dickschädel-Echse“', 'باكيسيفالوصور', '«السحلية سميكة الرأس»'],
  pteranodon: ['„Zahnloser Flügel“', 'بتيرانودون', '«الجناح عديم الأسنان»'],
  giganotosaurus: ['„Riesige südliche Echse“', 'جيغانوتوصور', '«سحلية الجنوب العملاقة»'],
  argentinosaurus: ['„Silberland-Echse (Argentinien)“', 'أرجنتينوصور', '«سحلية الأرجنتين»'],
  gallimimus: ['„Hühner-Nachahmer“', 'غاليميموس', '«مُقلِّد الدجاج»'],
  deinosuchus: ['„Schreckliches Krokodil“', 'دينوسوكس', '«التمساح الرهيب»'],
  elasmosaurus: ['„Dünnplatten-Echse“', 'إلاسموصور', '«سحلية الصفيحة الرقيقة»'],
  mussaurus: ['„Maus-Echse“', 'موساصور', '«سحلية الفأر»'],
  dimorphodon: ['„Zweigestalt-Zahn“', 'ديمورفودون', '«ثنائي شكل الأسنان»'],
  cryolophosaurus: ['„Gefrorene Kamm-Echse“', 'كريولوفوصور («إلفيسوصور»)', '«السحلية المتوجة المتجمدة»'],
  tuojiangosaurus: ['„Tuo-Fluss-Echse“', 'توجيانغوصور', '«سحلية نهر تو»'],
  brontosaurus: ['„Edle Donnerechse“', 'برونتوصور', '«سحلية الرعد النبيلة»'],
  yutyrannus: ['„Schöner gefiederter Tyrann“', 'يوتيرانوس', '«الطاغية الجميل ذو الريش»'],
  suchomimus: ['„Krokodil-Nachahmer“', 'سوكوميموس', '«مُقلِّد التمساح»'],
  acrocanthosaurus: ['„Hochdorn-Echse“', 'أكروكانثوصور', '«السحلية ذات الأشواك العالية»'],
  sauropelta: ['„Schild-Echse“', 'سوروبيلتا', '«درع السحلية»'],
  dreadnoughtus: ['„Fürchtet nichts“', 'دريدنوتوس', '«الذي لا يخشى شيئاً»'],
  maiasaura: ['„Gute Mutter-Echse“', 'ماياسورا', '«السحلية الأم الصالحة»'],
  corythosaurus: ['„Korinthischer-Helm-Echse“', 'كوريثوصور', '«سحلية الخوذة الكورنثية»'],
  styracosaurus: ['„Stachel-Echse“', 'ستيراكوصور', '«السحلية الشائكة»'],
  oviraptor: ['„Eier-Greifer (Fürsorglicher Elternteil)“', 'أوفيرابتور / سيتيباتي', '«سارق البيض (الأب الحنون)»'],
  protoceratops: ['„Erstes Horngesicht“', 'بروتوسيراتوبس', '«الوجه الأوّل ذو القرون»'],
  pachyrhinosaurus: ['„Dicknasen-Echse“', 'باكيرينوصور', '«السحلية سميكة الأنف»'],
  edmontosaurus: ['„Echse aus Edmonton“', 'إدمونتوصور', '«سحلية إدمونتون»'],
  stygimoloch: ['„Gehörnter Dämon vom Fluss Styx“', 'ستيجيمولوك', '«شيطان نهر ستيكس ذو القرون»'],
  hesperornis: ['„Königlicher Westlicher Vogel“', 'هيسبيرورنيس', '«الطائر الغربي الملكي»'],

  // K-PG EXTINCTION
  'chicxulub-avian-survivor': ['„Überlebende Vogel-Theropoden (Neornithes)“', 'حدث انقراض تشيكشولوب والطيور الناجية', '«الديناصورات الطيرية الناجية (الطيور الحديثة)»'],
  gastornis: ['„Gaston Plantés Riesenvogel“', 'غاستورنيس', '«طائر غاستون بلانتيه العملاق»'],
};

/**
 * Localizes geological period strings like "Late Cretaceous (68–66 MYA)".
 */
export function localizePeriodLabel(raw, lang = 'en') {
  if (!raw || lang === 'en') return raw || '';
  let out = raw;
  const maps = {
    es: [
      ['Late Carboniferous – Early Permian', 'Carbonífero Superior – Pérmico Inferior'],
      ['Late Permian – Early Triassic', 'Pérmico Superior – Triásico Inferior'],
      ['Late Triassic – Early Jurassic', 'Triásico Superior – Jurásico Inferior'],
      ['Middle – Late Jurassic', 'Jurásico Medio – Superior'],
      ['Paleocene – Eocene', 'Paleoceno – Eoceno'],
      ['Post-Asteroid Era', 'Era Posasteroide'],
      ['66 MYA Impact → Present Day (11,000+ Species)', 'Impacto 66 Ma → Presente (+11.000 Especies)'],
      ['Early Permian', 'Pérmico Inferior'],
      ['Late Permian', 'Pérmico Superior'],
      ['Early Triassic', 'Triásico Inferior'],
      ['Late Triassic', 'Triásico Superior'],
      ['Early Jurassic', 'Jurásico Inferior'],
      ['Late Jurassic', 'Jurásico Superior'],
      ['Early Cretaceous', 'Cretácico Inferior'],
      ['Mid Cretaceous', 'Cretácico Medio'],
      ['Late Cretaceous South America', 'Cretácico Superior de Sudamérica'],
      ['Late Cretaceous', 'Cretácico Superior'],
      ['MYA', 'Ma'],
    ],
    'zh-CN': [
      ['Late Carboniferous – Early Permian', '晚石炭世 – 早二叠世'],
      ['Late Permian – Early Triassic', '晚二叠世 – 早三叠世'],
      ['Late Triassic – Early Jurassic', '晚三叠世 – 早侏罗世'],
      ['Middle – Late Jurassic', '中 – 晚侏罗世'],
      ['Paleocene – Eocene', '古新世 – 始新世'],
      ['Post-Asteroid Era', '小行星撞击后纪元'],
      ['66 MYA Impact → Present Day (11,000+ Species)', '6600万年前撞击 → 今日（11,000+ 物种）'],
      ['Early Permian', '早二叠世'],
      ['Late Permian', '晚二叠世'],
      ['Early Triassic', '早三叠世'],
      ['Late Triassic', '晚三叠世'],
      ['Early Jurassic', '早侏罗世'],
      ['Late Jurassic', '晚侏罗世'],
      ['Early Cretaceous', '早白垩世'],
      ['Mid Cretaceous', '中白垩世'],
      ['Late Cretaceous South America', '南美洲晚白垩世'],
      ['Late Cretaceous', '晚白垩世'],
      ['MYA', '百万年前'],
    ],
    'zh-HK': [
      ['Late Carboniferous – Early Permian', '晚石炭世 – 早二疊世'],
      ['Late Permian – Early Triassic', '晚二疊世 – 早三疊世'],
      ['Late Triassic – Early Jurassic', '晚三疊世 – 早侏羅世'],
      ['Middle – Late Jurassic', '中 – 晚侏羅世'],
      ['Paleocene – Eocene', '古新世 – 始新世'],
      ['Post-Asteroid Era', '小行星撞擊後紀元'],
      ['66 MYA Impact → Present Day (11,000+ Species)', '6600萬年前撞擊 → 今日（11,000+ 物種）'],
      ['Early Permian', '早二疊世'],
      ['Late Permian', '晚二疊世'],
      ['Early Triassic', '早三疊世'],
      ['Late Triassic', '晚三疊世'],
      ['Early Jurassic', '早侏羅世'],
      ['Late Jurassic', '晚侏羅世'],
      ['Early Cretaceous', '早白堊世'],
      ['Mid Cretaceous', '中白堊世'],
      ['Late Cretaceous South America', '南美洲晚白堊世'],
      ['Late Cretaceous', '晚白堊世'],
      ['MYA', '百萬年前'],
    ],
    it: [
      ['Late Carboniferous – Early Permian', 'Carbonifero Superiore – Permiano Inferiore'],
      ['Late Permian – Early Triassic', 'Permiano Superiore – Triassico Inferiore'],
      ['Late Triassic – Early Jurassic', 'Triassico Superiore – Giurassico Inferiore'],
      ['Middle – Late Jurassic', 'Giurassico Medio – Superiore'],
      ['Paleocene – Eocene', 'Paleocene – Eocene'],
      ['Post-Asteroid Era', 'Era Post-Asteroide'],
      ['66 MYA Impact → Present Day (11,000+ Species)', 'Impatto 66 Ma → Oggi (+11.000 Specie)'],
      ['Early Permian', 'Permiano Inferiore'],
      ['Late Permian', 'Permiano Superiore'],
      ['Early Triassic', 'Triassico Inferiore'],
      ['Late Triassic', 'Triassico Superiore'],
      ['Early Jurassic', 'Giurassico Inferiore'],
      ['Late Jurassic', 'Giurassico Superiore'],
      ['Early Cretaceous', 'Cretaceo Inferiore'],
      ['Mid Cretaceous', 'Cretaceo Medio'],
      ['Late Cretaceous South America', 'Cretaceo Superiore del Sud America'],
      ['Late Cretaceous', 'Cretaceo Superiore'],
      ['MYA', 'Ma'],
    ],
    pt: [
      ['Late Carboniferous – Early Permian', 'Carbonífero Superior – Permiano Inferior'],
      ['Late Permian – Early Triassic', 'Permiano Superior – Triássico Inferior'],
      ['Late Triassic – Early Jurassic', 'Triássico Superior – Jurássico Inferior'],
      ['Middle – Late Jurassic', 'Jurássico Médio – Superior'],
      ['Paleocene – Eocene', 'Paleoceno – Eoceno'],
      ['Post-Asteroid Era', 'Era Pós-Asteroide'],
      ['66 MYA Impact → Present Day (11,000+ Species)', 'Impacto 66 Ma → Presente (+11.000 Espécies)'],
      ['Early Permian', 'Permiano Inferior'],
      ['Late Permian', 'Permiano Superior'],
      ['Early Triassic', 'Triássico Inferior'],
      ['Late Triassic', 'Triássico Superior'],
      ['Early Jurassic', 'Jurássico Inferior'],
      ['Late Jurassic', 'Jurássico Superior'],
      ['Early Cretaceous', 'Cretáceo Inferior'],
      ['Mid Cretaceous', 'Cretáceo Médio'],
      ['Late Cretaceous South America', 'Cretáceo Superior da América do Sul'],
      ['Late Cretaceous', 'Cretáceo Superior'],
      ['MYA', 'Ma'],
    ],
    fr: [
      ['Late Carboniferous – Early Permian', 'Carbonifère Supérieur – Permien Inférieur'],
      ['Late Permian – Early Triassic', 'Permien Supérieur – Trias Inférieur'],
      ['Late Triassic – Early Jurassic', 'Trias Supérieur – Jurassique Inférieur'],
      ['Middle – Late Jurassic', 'Jurassique Moyen – Supérieur'],
      ['Paleocene – Eocene', 'Paléocène – Éocène'],
      ['Post-Asteroid Era', 'Ère Post-Astéroïde'],
      ['66 MYA Impact → Present Day (11,000+ Species)', 'Impact 66 Ma → Aujourd’hui (+11 000 Espèces)'],
      ['Early Permian', 'Permien Inférieur'],
      ['Late Permian', 'Permien Supérieur'],
      ['Early Triassic', 'Trias Inférieur'],
      ['Late Triassic', 'Trias Supérieur'],
      ['Early Jurassic', 'Jurassique Inférieur'],
      ['Late Jurassic', 'Jurassique Supérieur'],
      ['Early Cretaceous', 'Crétacé Inférieur'],
      ['Mid Cretaceous', 'Crétacé Moyen'],
      ['Late Cretaceous South America', 'Crétacé Supérieur d’Amérique du Sud'],
      ['Late Cretaceous', 'Crétacé Supérieur'],
      ['MYA', 'Ma'],
    ],
    de: [
      ['Late Carboniferous – Early Permian', 'Oberkarbon – Unterperm'],
      ['Late Permian – Early Triassic', 'Oberperm – Untertrias'],
      ['Late Triassic – Early Jurassic', 'Obertrias – Unterjura'],
      ['Middle – Late Jurassic', 'Mittel- bis Oberjura'],
      ['Paleocene – Eocene', 'Paläozän – Eozän'],
      ['Post-Asteroid Era', 'Post-Asteroiden-Ära'],
      ['66 MYA Impact → Present Day (11,000+ Species)', 'Einschlag vor 66 Mio. J. → Heute (11.000+ Arten)'],
      ['Early Permian', 'Unterperm'],
      ['Late Permian', 'Oberperm'],
      ['Early Triassic', 'Untertrias'],
      ['Late Triassic', 'Obertrias'],
      ['Early Jurassic', 'Unterjura'],
      ['Late Jurassic', 'Oberjura'],
      ['Early Cretaceous', 'Unterkreide'],
      ['Mid Cretaceous', 'Mittelkreide'],
      ['Late Cretaceous South America', 'Oberkreide Südamerikas'],
      ['Late Cretaceous', 'Oberkreide'],
      ['MYA', 'Mio. J.'],
    ],
    ar: [
      ['Late Carboniferous – Early Permian', 'الكربوني المتأخر – البرمي المبكر'],
      ['Late Permian – Early Triassic', 'البرمي المتأخر – الثلاثي المبكر'],
      ['Late Triassic – Early Jurassic', 'الثلاثي المتأخر – الجوراسي المبكر'],
      ['Middle – Late Jurassic', 'الجوراسي الأوسط – المتأخر'],
      ['Paleocene – Eocene', 'الباليوسيني – الإيوسيني'],
      ['Post-Asteroid Era', 'حقبة ما بعد الكويكب'],
      ['66 MYA Impact → Present Day (11,000+ Species)', 'اصطدام قبل 66 مليون سنة ← الحاضر (+11,000 نوع)'],
      ['Early Permian', 'البرمي المبكر'],
      ['Late Permian', 'البرمي المتأخر'],
      ['Early Triassic', 'الثلاثي المبكر'],
      ['Late Triassic', 'الثلاثي المتأخر'],
      ['Early Jurassic', 'الجوراسي المبكر'],
      ['Late Jurassic', 'الجوراسي المتأخر'],
      ['Early Cretaceous', 'الطباشيري المبكر'],
      ['Mid Cretaceous', 'الطباشيري الأوسط'],
      ['Late Cretaceous South America', 'الطباشيري المتأخر لأمريكا الجنوبية'],
      ['Late Cretaceous', 'الطباشيري المتأخر'],
      ['MYA', 'مليون سنة'],
    ],
    ja: [
      ['Late Carboniferous – Early Permian', '石炭紀後期 – ペルム紀前期'],
      ['Late Permian – Early Triassic', 'ペルム紀後期 – 三畳紀前期'],
      ['Late Triassic – Early Jurassic', '三畳紀後期 – ジュラ紀前期'],
      ['Middle – Late Jurassic', 'ジュラ紀中期 – 後期'],
      ['Paleocene – Eocene', '暁新世 – 始新世'],
      ['Post-Asteroid Era', '小惑星衝突後の時代'],
      ['66 MYA Impact → Present Day (11,000+ Species)', '6600万年前の衝突 → 現在（11,000種以上）'],
      ['Early Permian', 'ペルム紀前期'],
      ['Late Permian', 'ペルム紀後期'],
      ['Early Triassic', '三畳紀前期'],
      ['Late Triassic', '三畳紀後期'],
      ['Early Jurassic', 'ジュラ紀前期'],
      ['Late Jurassic', 'ジュラ紀後期'],
      ['Early Cretaceous', '白亜紀前期'],
      ['Mid Cretaceous', '白亜紀中期'],
      ['Late Cretaceous South America', '南米の白亜紀後期'],
      ['Late Cretaceous', '白亜紀後期'],
      ['MYA', '百万年前'],
    ],
    ko: [
      ['Late Carboniferous – Early Permian', '석탄기 후기 – 페름기 전기'],
      ['Late Permian – Early Triassic', '페름기 후기 – 트라이아스기 전기'],
      ['Late Triassic – Early Jurassic', '트라이아스기 후기 – 쥐라기 전기'],
      ['Middle – Late Jurassic', '쥐라기 중기 – 후기'],
      ['Paleocene – Eocene', '팔레오세 – 에오세'],
      ['Post-Asteroid Era', '소행성 충돌 이후 시대'],
      ['66 MYA Impact → Present Day (11,000+ Species)', '6600만 년 전 충돌 → 현재 (11,000종 이상)'],
      ['Early Permian', '페름기 전기'],
      ['Late Permian', '페름기 후기'],
      ['Early Triassic', '트라이아스기 전기'],
      ['Late Triassic', '트라이아스기 후기'],
      ['Early Jurassic', '쥐라기 전기'],
      ['Late Jurassic', '쥐라기 후기'],
      ['Early Cretaceous', '백악기 전기'],
      ['Mid Cretaceous', '백악기 중기'],
      ['Late Cretaceous South America', '남아메리카 백악기 후기'],
      ['Late Cretaceous', '백악기 후기'],
      ['MYA', '백만 년 전'],
    ],
  };

  const list = maps[lang];
  if (!list) return out;
  for (const [src, dst] of list) {
    out = out.replace(src, dst);
  }
  return out;
}

/**
 * Generates localized paleobiology profile (name, meaning, periodLabel, story, funFacts, hotspots,
 * vocalDescription, whatIfLabel, whatIfOutcome, discoveryText) for any of the 74 species.
 */
export function getLocalizedSpecies(sp, era, lang = 'en') {
  if (!sp) return null;
  const ui = UI_STRINGS[lang] || UI_STRINGS.en;
  const eraLoc = ERA_LOCALIZATIONS[lang]?.[sp.eraId] || ERA_LOCALIZATIONS.en[sp.eraId] || era;
  const tax = SPECIES_TAXONOMY_I18N[sp.id];
  const deArTax = SPECIES_DE_AR_I18N[sp.id];

  let localName = sp.name;
  let localMeaning = sp.meaning;

  if (tax && lang !== 'en') {
    const [zhCNName, zhCNMean, zhHKName, zhHKMean, jaName, jaMean, koName, koMean, esMean, itMean, ptMean, frMean] = tax;
    if (lang === 'zh-CN') {
      localName = zhCNName;
      localMeaning = zhCNMean;
    } else if (lang === 'zh-HK') {
      localName = zhHKName;
      localMeaning = zhHKMean;
    } else if (lang === 'ja') {
      localName = jaName;
      localMeaning = jaMean;
    } else if (lang === 'ko') {
      localName = koName;
      localMeaning = koMean;
    } else if (lang === 'es') {
      localName = sp.name.replace(/\s*\([^)]+\)/g, '').trim();
      if (sp.id === 'tyrannosaurus-rex') localName = 'Tiranosaurio Rex';
      if (sp.id === 'chicxulub-avian-survivor') localName = 'Impacto K-Pg y Aves Supervivientes';
      localMeaning = esMean;
    } else if (lang === 'it') {
      localName = sp.name.replace(/\s*\([^)]+\)/g, '').trim();
      if (sp.id === 'tyrannosaurus-rex') localName = 'Tirannosauro Rex';
      if (sp.id === 'chicxulub-avian-survivor') localName = 'Impatto K-Pg e Uccelli Sopravvissuti';
      localMeaning = itMean;
    } else if (lang === 'pt') {
      localName = sp.name.replace(/\s*\([^)]+\)/g, '').trim();
      if (sp.id === 'tyrannosaurus-rex') localName = 'Tiranossauro Rex';
      if (sp.id === 'chicxulub-avian-survivor') localName = 'Impacto K-Pg e Aves Sobreviventes';
      localMeaning = ptMean;
    } else if (lang === 'fr') {
      localName = sp.name.replace(/\s*\([^)]+\)/g, '').trim();
      if (sp.id === 'tyrannosaurus-rex') localName = 'Tyrannosaure Rex';
      if (sp.id === 'chicxulub-avian-survivor') localName = 'Impact K-Pg & Oiseaux Survivants';
      localMeaning = frMean;
    } else if (lang === 'de' && deArTax) {
      localName = sp.name.replace(/\s*\([^)]+\)/g, '').trim();
      if (sp.id === 'chicxulub-avian-survivor') localName = 'K-Pg-Einschlag & Überlebende Vögel';
      localMeaning = deArTax[0];
    } else if (lang === 'ar' && deArTax) {
      localName = deArTax[1];
      localMeaning = deArTax[2];
    }
  }

  const localPeriod = localizePeriodLabel(sp.periodLabel, lang);
  const localDiet = ui.diets[sp.diet] || sp.diet;
  const localDomain = ui.domains[sp.domain] || sp.domain;
  const localStance = ui.stances[sp.stance] || sp.stance;

  if (lang === 'en') {
    const d = sp.discovery;
    return {
      name: sp.name,
      meaning: sp.meaning,
      periodLabel: sp.periodLabel,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: sp.story,
      funFacts: sp.funFacts || [],
      hotspots: sp.hotspots || [],
      whatIfLabel: sp.whatIfLabel || ui.btnWhatIfDefault,
      whatIfOutcome: sp.whatIfOutcome || '',
      vocalDescription: sp.vocalProfile?.description || 'Prehistoric vocal call',
      discoveryText: d
        ? ui.discoveryTemplate
            .replace('{location}', d.location)
            .replace('{country}', d.country)
            .replace('{formation}', d.formation)
            .replace('{year}', String(d.year))
            .replace('{paleontologist}', d.paleontologist)
        : ui.discoveryGlobal,
    };
  }

  const m = sp.metrics || { lengthM: 5, heightM: 2, weightLabel: '500 kg', speedKmh: 25, biteForceN: 5000 };
  const d = sp.discovery || { location: 'Global', country: '', formation: '', year: 1900, paleontologist: '' };
  const c = sp.climate || { o2Pct: 24, co2Ppm: 1200, tempC: 20 };
  const hsRaw = sp.hotspots || [];

  const composed = composeLocalizedBiology({
    sp,
    localName,
    localMeaning,
    localPeriod,
    localDiet,
    localDomain,
    localStance,
    eraName: eraLoc?.name || '',
    eraFlora: eraLoc?.flora || '',
    m,
    d,
    c,
    hsRaw,
    lang,
    ui,
  });

  return composed;
}

function localizeHotspotTitle(h, lang) {
  const raw = `${h.title || ''} ${h.organOrBone || ''}`.toLowerCase();
  const x = h.pos?.[0] ?? 0;
  let kind = 'axial';
  if (/tail|whiplash|caudal|thagomizer|club|fluke/.test(raw) || x < -0.9) {
    kind = 'tail';
  } else if (/horn|frill|crest|casque|dome|parietal|nasal boss/.test(raw)) {
    kind = 'crest';
  } else if (/sail|plate|osteoderm|scute|neural spine|dermal|armor|carapace/.test(raw)) {
    kind = 'dorsal';
  } else if (/wing|patagium|feather|plumage|airfoil|flight/.test(raw)) {
    kind = 'wing';
  } else if (/flipper|paddle|fin|hydrofoil|webbed/.test(raw)) {
    kind = 'flipper';
  } else if (/neck|cervical|air sac|gular/.test(raw)) {
    kind = 'neck';
  } else if (/claw|talon|hand|forelimb|thumb|manus|arm/.test(raw)) {
    kind = 'claw';
  } else if (/leg|femur|tibia|foot|hindlimb|pelvis|biped|stride|metatarsal/.test(raw)) {
    kind = 'limb';
  } else if (/tooth|teeth|jaw|bite|skull|snout|beak|cranium|eye|orbit|nostril|olfactory|brain/.test(raw) || x > 0.9) {
    kind = 'skull';
  }

  const TABLE = {
    skull: {
      es: 'Cráneo, Mandíbula y Dentición',
      'zh-CN': '头骨、颌部与齿列解剖',
      'zh-HK': '頭骨、顎部與齒列解剖',
      it: 'Cranio, Mascella e Dentatura',
      pt: 'Crânio, Mandíbula e Dentição',
      fr: 'Crâne, Mâchoires et Dentition',
      de: 'Schädel, Kiefer & Gebissanatomie',
      ar: 'تشريح الجمجمة والفكين والأسنان',
      ja: '頭骨・顎・歯列の解剖構造',
      ko: '두개골·턱·치열 해부 구조',
    },
    crest: {
      es: 'Cresta Craneal, Cuernos y Gola Ósea',
      'zh-CN': '头冠、角饰与颈盾结构',
      'zh-HK': '頭冠、角飾與頸盾結構',
      it: 'Cresta Cranica, Corna e Collare Osseo',
      pt: 'Crista Craniana, Chifres e Escudo Ósseo',
      fr: 'Crête Crânienne, Cornes et Collerette',
      de: 'Schädelkamm, Hörner & Nackenschild',
      ar: 'العرف الجمجمي والقرون والدرع العنقي',
      ja: '頭部のトサカ・角・フリル構造',
      ko: '머리 볏·뿔·프릴 골격 구조',
    },
    dorsal: {
      es: 'Vela Dorsal, Placas y Armadura Dérmica',
      'zh-CN': '背帆、骨板与皮内成骨装甲',
      'zh-HK': '背帆、骨板與皮內成骨裝甲',
      it: 'Vela Dorsale, Piastre e Corazza Dermica',
      pt: 'Vela Dorsal, Placas e Armadura Dérmica',
      fr: 'Voile Dorsale, Plaques et Armure Dermique',
      de: 'Rückensegel, Knochenplatten & Hautpanzer',
      ar: 'الشراع الظهري والصفائح العظمية والدرع الجلدي',
      ja: '背帆・骨板・装甲プレート構造',
      ko: '등 돛·골판·피부 갑옷 구조',
    },
    neck: {
      es: 'Vértebras Cervicales y Cuello Neumático',
      'zh-CN': '颈椎气腔与长颈力学结构',
      'zh-HK': '頸椎氣腔與長頸力學結構',
      it: 'Vertebre Cervicali e Collo Pneumatico',
      pt: 'Vértebras Cervicais e Pescoço Pneumático',
      fr: 'Vertèbres Cervicales et Cou Pneumatique',
      de: 'Halswirbel & Pneumatisches Luftsacksystem',
      ar: 'الفقرات العنقية ونظام الأكياس الهوائية',
      ja: '頸椎と気嚢システムの解剖構造',
      ko: '경추 및 기낭 목 골격 구조',
    },
    wing: {
      es: 'Membrana Alar, Plumas y Aerodinámica',
      'zh-CN': '翼膜、飞羽与空气动力学结构',
      'zh-HK': '翼膜、飛羽與空氣動力學結構',
      it: 'Membrana Alare, Piume e Aerodinamica',
      pt: 'Membrana Alar, Penas e Aerodinâmica',
      fr: 'Membrane Alaire, Plumes et Aérodynamique',
      de: 'Flughaut, Schwungfedern & Aerodynamik',
      ar: 'غشاء الجناح وريش الطيران والديناميكا الهوائية',
      ja: '翼膜・風切羽・飛行バイオメカニクス',
      ko: '날개막·깃털·비행 생체역학 구조',
    },
    flipper: {
      es: 'Aletas Hidrodinámicas y Propulsión Marina',
      'zh-CN': '流体力学鳍肢与水下推进结构',
      'zh-HK': '流體力學鰭肢與水下推進結構',
      it: 'Pinne Idrodinamiche e Propulsione Marina',
      pt: 'Nadadeiras Hidrodinâmicas e Propulsão',
      fr: 'Nageoires Hydrodynamiques et Propulsion',
      de: 'Hydrodynamische Flossen & Wasserantrieb',
      ar: 'الزعانف الهيدروديناميكية والدفع المائي',
      ja: 'ヒレ脚・水中推進の流体力学構造',
      ko: '물갈퀴 지느러미 및 수중 추진 구조',
    },
    claw: {
      es: 'Garras Curvas y Extremidades Anteriores',
      'zh-CN': '前肢结构与镰刀利爪解剖',
      'zh-HK': '前肢結構與鐮刀利爪解剖',
      it: 'Artigli Ricurvi e Arti Anteriori',
      pt: 'Garras Curvas e Membros Anteriores',
      fr: 'Griffes Recourbées et Membres Antérieurs',
      de: 'Sichelklauen & Vordergliedmaßen-Anatomie',
      ar: 'المخالب المنحنية وتشريح الأطراف الأمامية',
      ja: '前肢と鉤爪（かぎづめ）の解剖構造',
      ko: '앞다리 및 갈고리 발톱 해부 구조',
    },
    limb: {
      es: 'Extremidades Posteriores y Locomoción',
      'zh-CN': '后肢骨骼与运动生物力学',
      'zh-HK': '後肢骨骼與運動生物力學',
      it: 'Arti Posteriori e Biomeccanica Locomotoria',
      pt: 'Membros Posteriores e Locomoção',
      fr: 'Membres Postérieurs et Locomotion',
      de: 'Hintergliedmaßen & Fortbewegungs-Biomechanik',
      ar: 'الأطراف الخلفية والميكانيكا الحيوية للحركة',
      ja: '後肢骨格と歩行・走行バイオメカニクス',
      ko: '뒷다리 골격 및 보행 생체역학 구조',
    },
    tail: {
      es: 'Cola Biomecánica, Contrapeso y Defensa',
      'zh-CN': '尾椎平衡与尾部防御武器结构',
      'zh-HK': '尾椎平衡與尾部防禦武器結構',
      it: 'Coda Biomeccanica, Contrappeso e Difesa',
      pt: 'Cauda Biomecânica, Contrapeso e Defesa',
      fr: 'Queue Biomécanique, Contrepoids et Défense',
      de: 'Biomechanischer Schwanz, Gegengewicht & Abwehr',
      ar: 'الذيل الميكانيكي الحيوي والتوازن والدفاع',
      ja: '尾椎バランスと尾部防衛器官の解剖',
      ko: '꼬리뼈 균형 및 꼬리 방어 기관 구조',
    },
    axial: {
      es: 'Esqueleto Axial y Estructura Torácica',
      'zh-CN': '中轴骨骼与躯干力学结构',
      'zh-HK': '中軸骨骼與軀幹力學結構',
      it: 'Scheletro Assiale e Struttura Toracica',
      pt: 'Esqueleto Axial e Estrutura Torácica',
      fr: 'Squelette Axial et Cage Thoracique',
      de: 'Achsenskelett & Brustkorb-Struktur',
      ar: 'الهيكل المحوري وبنية القفص الصدري',
      ja: '脊椎・胴体フレームの骨格構造',
      ko: '척추 및 몸통 골격 프레임 구조',
    },
  };
  return TABLE[kind]?.[lang] || h.title;
}

function formatLocalizedWeight(m, lang) {
  const kg = Number(m?.weightKg) || 500;
  if (kg >= 1000) {
    const tons = Math.round((kg / 1000) * 10) / 10;
    const units = {
      es: `${tons} toneladas`,
      'zh-CN': `${tons} 吨`,
      'zh-HK': `${tons} 噸`,
      it: `${tons} tonnellate`,
      pt: `${tons} toneladas`,
      fr: `${tons} tonnes`,
      de: `${tons} Tonnen`,
      ar: `${tons} طن`,
      ja: `${tons}トン`,
      ko: `${tons}톤`,
    };
    return units[lang] || m?.weightLabel || `${tons} tons`;
  }
  const units = {
    es: `${kg} kg`,
    'zh-CN': `${kg} 千克`,
    'zh-HK': `${kg} 公斤`,
    it: `${kg} kg`,
    pt: `${kg} kg`,
    fr: `${kg} kg`,
    de: `${kg} kg`,
    ar: `${kg} كجم`,
    ja: `${kg}キログラム`,
    ko: `${kg}kg`,
  };
  return units[lang] || m?.weightLabel || `${kg} kg`;
}

function composeLocalizedBiology({
  sp,
  localName,
  localMeaning,
  localPeriod,
  localDiet,
  localDomain,
  localStance,
  eraName,
  eraFlora,
  m,
  d,
  c,
  hsRaw,
  lang,
  ui,
}) {
  const discoveryText = d.location
    ? ui.discoveryTemplate
        .replace('{location}', d.location)
        .replace('{country}', d.country)
        .replace('{formation}', d.formation)
        .replace('{year}', String(d.year))
        .replace('{paleontologist}', d.paleontologist)
    : ui.discoveryGlobal;
  const weightStr = formatLocalizedWeight(m, lang);

  if (lang === 'es') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `${localName}, cuyo nombre significa ${localMeaning}, vivió durante el ${localPeriod}, hace unos ${sp.paleoMa} millones de años. Como ${localDiet.toLowerCase()} ${localStance.toLowerCase()}, alcanzaba ${m.lengthM} metros de longitud, ${m.heightM} metros de altura y un peso de ${weightStr}. Podía desplazarse a hasta ${m.speedKmh} kilómetros por hora entre ${eraFlora.toLowerCase()}.`,
      funFacts: [
        `Sus fósiles fueron descubiertos en ${d.location} (${d.country}) en la formación ${d.formation} (${d.year}) por ${d.paleontologist}.`,
        `Estudios biomecánicos estiman una velocidad máxima de ${m.speedKmh} kilómetros por hora y una fuerza de mordida de ${m.biteForceN.toLocaleString()} newtons.`,
        `Vivió en una atmósfera prehistórica con ${c.o2Pct}% de oxígeno, ${c.co2Ppm} ppm de dióxido de carbono y temperaturas medias de ${c.tempC} grados Celsius.`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'es'),
        organOrBone: h.organOrBone,
        detail: `Adaptación osteológica clave de ${localName} (${h.organOrBone}): diseñada para optimizar su supervivencia como ${localDiet.toLowerCase()} en el ${eraName}.`,
      })),
      whatIfLabel: `⚡ Activar Acción Biomecánica de ${localName}`,
      whatIfOutcome: `¡${localName} despliega su postura biomecánica máxima (${m.speedKmh} km/h • ${m.biteForceN.toLocaleString()} N)!`,
      vocalDescription: `Llamado acústico prehistórico de ${localName} (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  if (lang === 'zh-CN') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `${localName}，名字意为${localMeaning}，生活在距今约 ${sp.paleoMa} 百万年前的${eraName}。作为一种${localStance}的${localDiet}，它体长可达 ${m.lengthM} 米，身高 ${m.heightM} 米，体重约 ${weightStr}。它的最高移动速度达每小时 ${m.speedKmh} 公里，活跃于当时的${eraFlora}生态系统中。`,
      funFacts: [
        `${localName}的代表性化石于 ${d.year} 年由古生物学家 ${d.paleontologist} 在 ${d.country}（${d.location}）的 ${d.formation} 地层中发掘。`,
        `生物力学模型显示其最高速度可达每小时 ${m.speedKmh} 公里，颌部咬合力约为 ${m.biteForceN.toLocaleString()} 牛顿。`,
        `它生活的古地球大气层含氧量约为 ${c.o2Pct}%，二氧化碳浓度约 ${c.co2Ppm} ppm，全球平均气温约 ${c.tempC} 摄氏度。`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'zh-CN'),
        organOrBone: h.organOrBone,
        detail: `${localName}的关键古生物解剖结构（${h.organOrBone}），演化用于适应${eraName}的${localDiet}生态位。`,
      })),
      whatIfLabel: `⚡ 触发${localName}顶级生物力学动作`,
      whatIfOutcome: `${localName}展现出巅峰生物力学姿态（时速 ${m.speedKmh} 公里 • 咬合力 ${m.biteForceN.toLocaleString()} 牛顿）！`,
      vocalDescription: `${localName}的低频共鸣与生物声学叫声模拟 (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  if (lang === 'zh-HK') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `${localName}，名字意思係${localMeaning}，生活喺距今約 ${sp.paleoMa} 百萬年前嘅${eraName}。作為一種${localStance}嘅${localDiet}，佢體長可達 ${m.lengthM} 米，身高 ${m.heightM} 米，體重約 ${weightStr}。佢最高移動速度達時速 ${m.speedKmh} 公里，活躍於當時嘅${eraFlora}生態環境。`,
      funFacts: [
        `${localName}嘅代表性化石喺 ${d.year} 年由古生物學家 ${d.paleontologist} 喺 ${d.country}（${d.location}）嘅 ${d.formation} 地層發掘出土。`,
        `生物力學模型顯示佢最高時速可達 ${m.speedKmh} 公里，顎部咬合力約為 ${m.biteForceN.toLocaleString()} 牛頓。`,
        `佢生活嘅古地球大氣層含氧量約為 ${c.o2Pct}%，二氧化碳濃度約 ${c.co2Ppm} ppm，全球平均氣溫約 ${c.tempC} 攝氏度。`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'zh-HK'),
        organOrBone: h.organOrBone,
        detail: `${localName}嘅關鍵古生物解剖結構（${h.organOrBone}），專門演化嚟適應${eraName}嘅${localDiet}生活。`,
      })),
      whatIfLabel: `⚡ 觸發${localName}頂級生物力學動作`,
      whatIfOutcome: `${localName}展現出巔峰生物力學姿態（時速 ${m.speedKmh} 公里 • 咬合力 ${m.biteForceN.toLocaleString()} 牛頓）！`,
      vocalDescription: `${localName}嘅低頻共鳴與生物聲學叫聲模擬 (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  if (lang === 'it') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `${localName}, il cui nome significa ${localMeaning}, visse durante il ${localPeriod}, circa ${sp.paleoMa} milioni di anni fa. Come ${localDiet.toLowerCase()} ${localStance.toLowerCase()}, raggiungeva ${m.lengthM} metri di lunghezza, ${m.heightM} metri di altezza e un peso di ${weightStr}. Poteva muoversi fino a ${m.speedKmh} chilometri orari tra ${eraFlora.toLowerCase()}.`,
      funFacts: [
        `I suoi fossili sono stati scoperti a ${d.location} (${d.country}) nella formazione ${d.formation} (${d.year}) da ${d.paleontologist}.`,
        `Le analisi biomeccaniche indicano una velocità massima di ${m.speedKmh} chilometri orari e una forza del morso di ${m.biteForceN.toLocaleString()} newton.`,
        `Visse in un’atmosfera preistorica con il ${c.o2Pct}% di ossigeno, ${c.co2Ppm} ppm di anidride carbonica e temperature medie di ${c.tempC} gradi Celsius.`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'it'),
        organOrBone: h.organOrBone,
        detail: `Adattamento osteologico chiave di ${localName} (${h.organOrBone}) nel ${eraName}.`,
      })),
      whatIfLabel: `⚡ Attiva Azione Biomeccanica di ${localName}`,
      whatIfOutcome: `${localName} scatena la sua azione biomeccanica (${m.speedKmh} km/h • ${m.biteForceN.toLocaleString()} N)!`,
      vocalDescription: `Richiamo bio-acustico preistorico di ${localName} (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  if (lang === 'pt') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `${localName}, cujo nome significa ${localMeaning}, viveu durante o ${localPeriod}, há cerca de ${sp.paleoMa} milhões de anos. Como um ${localDiet.toLowerCase()} ${localStance.toLowerCase()}, atingia ${m.lengthM} metros de comprimento, ${m.heightM} metros de altura e massa de ${weightStr}. Alcançava até ${m.speedKmh} quilômetros por hora entre ${eraFlora.toLowerCase()}.`,
      funFacts: [
        `Seus fósseis foram descobertos em ${d.location} (${d.country}) na formação ${d.formation} (${d.year}) por ${d.paleontologist}.`,
        `Simulações biomecânicas estimam velocidade máxima de ${m.speedKmh} quilômetros por hora e força de mordida de ${m.biteForceN.toLocaleString()} newtons.`,
        `Viveu em uma atmosfera pré-histórica com ${c.o2Pct}% de oxigênio, ${c.co2Ppm} ppm de gás carbônico e temperatura média de ${c.tempC} graus Celsius.`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'pt'),
        organOrBone: h.organOrBone,
        detail: `Adaptação osteológica fundamental de ${localName} (${h.organOrBone}) durante o ${eraName}.`,
      })),
      whatIfLabel: `⚡ Ativar Ação Biomecânica de ${localName}`,
      whatIfOutcome: `${localName} demonstra sua potência biomecânica máxima (${m.speedKmh} km/h • ${m.biteForceN.toLocaleString()} N)!`,
      vocalDescription: `Chamado bioacústico pré-histórico de ${localName} (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  if (lang === 'fr') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `${localName}, dont le nom signifie ${localMeaning}, a vécu durant le ${localPeriod}, il y a environ ${sp.paleoMa} millions d’années. En tant que ${localDiet.toLowerCase()} ${localStance.toLowerCase()}, il atteignait ${m.lengthM} mètres de long, ${m.heightM} mètres de haut et une masse de ${weightStr}. Il se déplaçait jusqu’à ${m.speedKmh} kilomètres par heure au cœur d’un paysage de ${eraFlora.toLowerCase()}.`,
      funFacts: [
        `Ses fossiles ont été mis au jour à ${d.location} (${d.country}) dans la formation ${d.formation} (${d.year}) par ${d.paleontologist}.`,
        `Les modèles biomécaniques estiment une vitesse de pointe de ${m.speedKmh} kilomètres par heure et une force de morsure de ${m.biteForceN.toLocaleString()} newtons.`,
        `Il évoluait sous une atmosphère préhistorique contenant ${c.o2Pct} % d’oxygène, ${c.co2Ppm} ppm de dioxyde de carbone et une température moyenne de ${c.tempC} degrés Celsius.`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'fr'),
        organOrBone: h.organOrBone,
        detail: `Adaptation ostéologique clé de ${localName} (${h.organOrBone}) durant la ${eraName}.`,
      })),
      whatIfLabel: `⚡ Déclencher l’Action Biomécanique de ${localName}`,
      whatIfOutcome: `${localName} déploie toute sa puissance biomécanique (${m.speedKmh} km/h • ${m.biteForceN.toLocaleString()} N) !`,
      vocalDescription: `Appel bio-acoustique préhistorique de ${localName} (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  if (lang === 'de') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `${localName}, dessen Name ${localMeaning} bedeutet, lebte vor rund ${sp.paleoMa} Millionen Jahren in der Ära ${eraName}. Dieser ${localDiet} erreichte eine Körperlänge von ${m.lengthM} Metern, eine Höhe von ${m.heightM} Metern und ein Gewicht von ${weightStr}. Er bewegte sich mit bis zu ${m.speedKmh} Kilometern pro Stunde durch ${eraFlora}.`,
      funFacts: [
        `Seine Fossilien wurden ${d.year} von ${d.paleontologist} in ${d.location} (${d.country}) entdeckt (Fundschicht: ${d.formation}).`,
        `Biomechanische Modelle berechnen eine Höchstgeschwindigkeit von ${m.speedKmh} Kilometern pro Stunde und eine Beißkraft von ${m.biteForceN.toLocaleString()} Newton.`,
        `Er lebte in einer urzeitlichen Atmosphäre mit ${c.o2Pct} Prozent Sauerstoff, ${c.co2Ppm} ppm Kohlendioxid und einer Durchschnittstemperatur von ${c.tempC} Grad Celsius.`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'de'),
        organOrBone: h.organOrBone,
        detail: `Wichtige osteologische Anpassung von ${localName} (${h.organOrBone}) – ein Überlebensvorteil in der Ära „${eraName}“.`,
      })),
      whatIfLabel: `⚡ Biomechanische Aktion von ${localName} auslösen`,
      whatIfOutcome: `${localName} entfesselt seine volle biomechanische Kraft (${m.speedKmh} km/h • ${m.biteForceN.toLocaleString()} N)!`,
      vocalDescription: `Prähistorischer Bioakustik-Ruf von ${localName} (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  if (lang === 'ar') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `عاش ${localName}، ومعنى اسمه ${localMeaning}، قبل نحو ${sp.paleoMa} مليون سنة خلال ${eraName}. وهو ${localDiet} ${localStance}، بلغ طوله ${m.lengthM} متر وارتفاعه ${m.heightM} متر ووزنه نحو ${weightStr}. كانت سرعته تصل إلى ${m.speedKmh} كيلومتراً في الساعة في بيئة ${eraFlora}.`,
      funFacts: [
        `اكتشف ${d.paleontologist} حفرياته عام ${d.year} في ${d.location} (${d.country})، ضمن طبقات ${d.formation}.`,
        `تُقدّر النماذج الميكانيكية الحيوية سرعته القصوى بنحو ${m.speedKmh} كيلومتراً في الساعة وقوة عضته بنحو ${m.biteForceN.toLocaleString()} نيوتن.`,
        `عاش في غلاف جوي قديم بنسبة أكسجين ${c.o2Pct}% وثاني أكسيد الكربون ${c.co2Ppm} جزء في المليون ومتوسط حرارة ${c.tempC} درجة مئوية.`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'ar'),
        organOrBone: h.organOrBone,
        detail: `تكيّف عظمي وتشريحي رئيسي لدى ${localName} (${h.organOrBone}) للبقاء في بيئة ${eraName}.`,
      })),
      whatIfLabel: `⚡ تفعيل الحركة الميكانيكية الحيوية لـ ${localName}`,
      whatIfOutcome: `يطلق ${localName} أقصى قوته الميكانيكية الحيوية (${m.speedKmh} كم/س • قوة عضّ ${m.biteForceN.toLocaleString()} نيوتن)!`,
      vocalDescription: `محاكاة النداء الصوتي الحيوي القديم لـ ${localName} (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  if (lang === 'ja') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `${localName}は、名前の意味が${localMeaning}で、約${sp.paleoMa}百万年前の${eraName}に生息していました。${localStance}の${localDiet}動物で、全長${m.lengthM}メートル、高さ${m.heightM}メートル、体重${weightStr}に達しました。${eraFlora}が広がる環境を、最高時速${m.speedKmh}キロメートルで駆け抜けました。`,
      funFacts: [
        `化石は${d.year}年に古生物学者 ${d.paleontologist} によって ${d.country}（${d.location}）の ${d.formation} から発見されました。`,
        `生体力学シミュレーションにより、最高速度は時速${m.speedKmh}キロメートル、咬合力は約${m.biteForceN.toLocaleString()}ニュートンと推定されています。`,
        `当時の地球大気は酸素濃度${c.o2Pct}%、二酸化炭素濃度${c.co2Ppm}ppm、平均気温${c.tempC}度という環境でした。`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'ja'),
        organOrBone: h.organOrBone,
        detail: `${localName}の重要な骨格・解剖学的特徴（${h.organOrBone}）。${eraName}の環境に適応した進化の証です。`,
      })),
      whatIfLabel: `⚡ ${localName}のアペックス・アクションを発動`,
      whatIfOutcome: `${localName}が全力のバイオメカニクス動作を展開（時速 ${m.speedKmh} km • 咬合力 ${m.biteForceN.toLocaleString()} N）！`,
      vocalDescription: `${localName}の生体音響鳴き声シミュレーション (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  if (lang === 'ko') {
    return {
      name: localName,
      meaning: localMeaning,
      periodLabel: localPeriod,
      dietLabel: localDiet,
      domainLabel: localDomain,
      stanceLabel: localStance,
      story: `${localName}는 이름의 뜻이 ${localMeaning}이며, 약 ${sp.paleoMa}백만 년 전 ${eraName}에 살았습니다. ${localStance} ${localDiet} 생물로, 몸길이 ${m.lengthM}미터, 높이 ${m.heightM}미터, 몸무게 ${weightStr}에 달했습니다. ${eraFlora} 생태계에서 최고 시속 ${m.speedKmh}킬로미터로 활동했습니다.`,
      funFacts: [
        `화석은 ${d.year}년 고생물학자 ${d.paleontologist}에 의해 ${d.country}(${d.location})의 ${d.formation} 지층에서 발굴되었습니다.`,
        `생체역학 분석에 따르면 최고 속도는 시속 ${m.speedKmh}킬로미터, 무는 힘은 약 ${m.biteForceN.toLocaleString()}뉴턴에 달했습니다.`,
        `당시 고대 지구의 대기 산소 농도는 ${c.o2Pct}%, 이산화탄소는 ${c.co2Ppm}ppm, 평균 기온은 섭씨 ${c.tempC}도였습니다.`,
      ],
      hotspots: hsRaw.map((h) => ({
        pos: h.pos,
        title: localizeHotspotTitle(h, 'ko'),
        organOrBone: h.organOrBone,
        detail: `${localName}의 핵심 골격 및 해부학적 적응 구조(${h.organOrBone})로, ${eraName} 생태계에서의 생존에 최적화되었습니다.`,
      })),
      whatIfLabel: `⚡ ${localName} 최상위 생체역학 액션 발동`,
      whatIfOutcome: `${localName}가 강력한 생체역학 동작을 선보입니다 (시속 ${m.speedKmh}km • 치악력 ${m.biteForceN.toLocaleString()} N)!`,
      vocalDescription: `${localName}의 생체음향 울음소리 시뮬레이션 (${sp.vocalProfile?.baseFreq || 120} Hz)`,
      discoveryText,
    };
  }

  return null;
}
