// Carnatic theory: swarasthanas, the 72 melakartas, janya ragas and helpers.
const Theory = (() => {
  // Just-intonation ratios for the 12 swarasthanas above Sa.
  const RATIOS = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
  const CENTS = RATIOS.map((r) => 1200 * Math.log2(r));

  const SEMI = { S: 0, R1: 1, R2: 2, R3: 3, G1: 2, G2: 3, G3: 4, M1: 5, M2: 6, P: 7, D1: 8, D2: 9, D3: 10, N1: 9, N2: 10, N3: 11 };

  const POSITIONS = [
    { st: 0, names: ['S'], full: ['Shadjam'] },
    { st: 1, names: ['R1'], full: ['Shuddha Rishabham'] },
    { st: 2, names: ['R2', 'G1'], full: ['Chatushruti Ri', 'Shuddha Ga'] },
    { st: 3, names: ['R3', 'G2'], full: ['Shatshruti Ri', 'Sadharana Ga'] },
    { st: 4, names: ['G3'], full: ['Antara Gandharam'] },
    { st: 5, names: ['M1'], full: ['Shuddha Madhyamam'] },
    { st: 6, names: ['M2'], full: ['Prati Madhyamam'] },
    { st: 7, names: ['P'], full: ['Panchamam'] },
    { st: 8, names: ['D1'], full: ['Shuddha Dhaivatam'] },
    { st: 9, names: ['D2', 'N1'], full: ['Chatushruti Dha', 'Shuddha Ni'] },
    { st: 10, names: ['D3', 'N2'], full: ['Shatshruti Dha', 'Kaisiki Ni'] },
    { st: 11, names: ['N3'], full: ['Kakali Nishadam'] },
  ];

  const FULL_NAME = {
    S: 'Shadjam', R1: 'Shuddha Rishabham', R2: 'Chatushruti Rishabham', R3: 'Shatshruti Rishabham',
    G1: 'Shuddha Gandharam', G2: 'Sadharana Gandharam', G3: 'Antara Gandharam',
    M1: 'Shuddha Madhyamam', M2: 'Prati Madhyamam', P: 'Panchamam',
    D1: 'Shuddha Dhaivatam', D2: 'Chatushruti Dhaivatam', D3: 'Shatshruti Dhaivatam',
    N1: 'Shuddha Nishadam', N2: 'Kaisiki Nishadam', N3: 'Kakali Nishadam',
  };

  const CHAKRAS = ['Indu', 'Netra', 'Agni', 'Veda', 'Bana', 'Rutu', 'Rishi', 'Vasu', 'Brahma', 'Disi', 'Rudra', 'Aditya'];
  const RG = [['R1', 'G1'], ['R1', 'G2'], ['R1', 'G3'], ['R2', 'G2'], ['R2', 'G3'], ['R3', 'G3']];
  const DN = [['D1', 'N1'], ['D1', 'N2'], ['D1', 'N3'], ['D2', 'N2'], ['D2', 'N3'], ['D3', 'N3']];
  const PA = ['pa', 'sri', 'go', 'bhu', 'ma', 'sha'];

  const MELA_NAMES = [
    'Kanakangi', 'Ratnangi', 'Ganamurti', 'Vanaspati', 'Manavati', 'Tanarupi',
    'Senavati', 'Hanumatodi', 'Dhenuka', 'Natakapriya', 'Kokilapriya', 'Rupavati',
    'Gayakapriya', 'Vakulabharanam', 'Mayamalavagowla', 'Chakravakam', 'Suryakantam', 'Hatakambari',
    'Jhankaradhwani', 'Natabhairavi', 'Keeravani', 'Kharaharapriya', 'Gourimanohari', 'Varunapriya',
    'Mararanjani', 'Charukesi', 'Sarasangi', 'Harikambhoji', 'Dheerasankarabharanam', 'Naganandini',
    'Yagapriya', 'Ragavardhini', 'Gangeyabhushani', 'Vagadheeswari', 'Shulini', 'Chalanata',
    'Salagam', 'Jalarnavam', 'Jhalavarali', 'Navaneetam', 'Pavani', 'Raghupriya',
    'Gavambhodi', 'Bhavapriya', 'Shubhapantuvarali', 'Shadvidamargini', 'Suvarnangi', 'Divyamani',
    'Dhavalambari', 'Namanarayani', 'Kamavardhini', 'Ramapriya', 'Gamanashrama', 'Vishwambari',
    'Shamalangi', 'Shanmukhapriya', 'Simhendramadhyamam', 'Hemavati', 'Dharmavati', 'Neetimati',
    'Kantamani', 'Rishabhapriya', 'Latangi', 'Vachaspati', 'Mechakalyani', 'Chitrambari',
    'Sucharitra', 'Jyotiswarupini', 'Dhatuvardhani', 'Nasikabhushani', 'Kosalam', 'Rasikapriya',
  ];
  const ALIASES = { 8: 'Todi', 29: 'Sankarabharanam', 51: 'Pantuvarali', 65: 'Kalyani' };

  // [name, parent mela, arohanam, avarohanam, extras]. ' = tara sthayi, . = mandra sthayi.
  // extras.anya lists anya swaras: notes from outside the parent that make a raga bhashanga.
  const JANYA_DATA = [
    ['Revati', 2, "S R1 M1 P N2 S'", "S' N2 P M1 R1 S"],
    ['Dhanyasi', 8, "S G2 M1 P N2 S'", "S' N2 D1 P M1 G2 R1 S"],
    ['Bhupalam', 8, "S R1 G2 P D1 S'", "S' D1 P G2 R1 S"],
    ['Malahari', 15, "S R1 M1 P D1 S'", "S' D1 P M1 G3 R1 S"],
    ['Saveri', 15, "S R1 M1 P D1 S'", "S' N3 D1 P M1 G3 R1 S"],
    ['Bowli', 15, "S R1 G3 P D1 S'", "S' N3 D1 P G3 R1 S"],
    ['Revagupti', 15, "S R1 G3 P D1 S'", "S' D1 P G3 R1 S"],
    ['Lalita', 15, "S R1 G3 M1 D1 N3 S'", "S' N3 D1 M1 G3 R1 S"],
    ['Jaganmohini', 15, "S G3 M1 P N3 S'", "S' N3 P M1 G3 R1 S"],
    ['Gowla', 15, "S R1 M1 P N3 S'", "S' N3 P M1 R1 G3 M1 R1 S"],
    ['Malayamarutam', 16, "S R1 G3 P D2 N2 S'", "S' N2 D2 P G3 R1 S"],
    ['Vasantha', 17, "S M1 G3 M1 D2 N3 S'", "S' N3 D2 M1 G3 R1 S"],
    ['Hindolam', 20, "S G2 M1 D1 N2 S'", "S' N2 D1 M1 G2 S"],
    ['Jonpuri', 20, "S R2 M1 P D1 N2 S'", "S' N2 D1 P M1 G2 R2 S"],
    ['Kalyanavasantham', 21, "S G2 M1 D1 N3 S'", "S' N3 D1 P M1 G2 R2 S"],
    ['Abheri', 22, "S G2 M1 P N2 S'", "S' N2 D2 P M1 G2 R2 S"],
    ['Sriranjani', 22, "S R2 G2 M1 D2 N2 S'", "S' N2 D2 M1 G2 R2 S"],
    ['Madhyamavati', 22, "S R2 M1 P N2 S'", "S' N2 P M1 R2 S"],
    ['Shuddha Dhanyasi', 22, "S G2 M1 P N2 S'", "S' N2 P M1 G2 S"],
    ['Manirangu', 22, "S R2 M1 P N2 S'", "S' N2 P M1 G2 R2 S"],
    ['Sri', 22, "S R2 M1 P N2 S'", "S' N2 P D2 N2 P M1 R2 G2 R2 S"],
    ['Shivaranjani', 22, "S R2 G2 P D2 S'", "S' D2 P G2 R2 S"],
    ['Mohanam', 28, "S R2 G3 P D2 S'", "S' D2 P G3 R2 S"],
    // Bhashanga: kakali nishadam (N3) is an anya swara, heard in the mandra phrase S Ṇ P̣ Ḍ S.
    ['Kambhoji', 28, "S R2 G3 M1 P D2 S'", "S' N2 D2 P M1 G3 R2 S N3. P. D2. S", { anya: ['N3'] }],
    ['Kedaragowla', 28, "S R2 M1 P N2 S'", "S' N2 D2 P M1 G3 R2 S"],
    ['Yadukula Kambhoji', 28, "S R2 M1 P D2 S'", "S' N2 D2 P M1 G3 R2 S"],
    ['Valaji', 28, "S G3 P D2 N2 S'", "S' N2 D2 P G3 S"],
    ['Sama', 28, "S R2 M1 P D2 S'", "S' D2 P M1 G3 R2 S"],
    ['Bilahari', 29, "S R2 G3 P D2 S'", "S' N3 D2 P M1 G3 R2 S"],
    ['Hamsadhwani', 29, "S R2 G3 P N3 S'", "S' N3 P G3 R2 S"],
    ['Arabhi', 29, "S R2 M1 P D2 S'", "S' N3 D2 P M1 G3 R2 S"],
    ['Suddha Saveri', 29, "S R2 M1 P D2 S'", "S' D2 P M1 R2 S"],
    ['Kedaram', 29, "S M1 G3 M1 P N3 S'", "S' N3 P M1 G3 R2 S"],
    ['Niroshta', 29, "S R2 G3 D2 N3 S'", "S' N3 D2 G3 R2 S"],
    ['Nata', 36, "S R3 G3 M1 P D3 N3 S'", "S' N3 P M1 R3 S"],
    ['Gambhiranata', 36, "S G3 M1 P N3 S'", "S' N3 P M1 G3 S"],
    ['Hamsanandi', 53, "S R1 G3 M2 D2 N3 S'", "S' N3 D2 M2 G3 R1 S"],
    ['Purvikalyani', 53, "S R1 G3 M2 P D2 P S'", "S' N3 D2 P M2 G3 R1 S"],
    ['Madhuvanti', 59, "S G2 M2 P N3 S'", "S' N3 D2 P M2 G2 R2 S"],
    ['Saraswati', 64, "S R2 M2 P D2 S'", "S' N2 D2 P M2 G3 R2 S"],
    ['Mohanakalyani', 65, "S R2 G3 P D2 S'", "S' N3 D2 P M2 G3 R2 S"],
    ['Sunadavinodini', 65, "S G3 M2 D2 N3 S'", "S' N3 D2 M2 G3 S"],
    ['Yamunakalyani', 65, "S R2 G3 P M2 P D2 S'", "S' D2 P M2 P G3 R2 S"],
    ['Amritavarshini', 66, "S G3 M2 P N3 S'", "S' N3 P M2 G3 S"],
    ['Varali', 39, "S G1 R1 G1 M2 P D1 N3 S'", "S' N3 D1 P M2 G1 R1 S"],
    ['Saramati', 20, "S R2 G2 M1 P D1 N2 S'", "S' N2 D1 M1 G2 S"],
    ['Bhairavi', 20, "S R2 G2 M1 P D2 N2 S'", "S' N2 D1 P M1 G2 R2 S", { anya: ['D2'] }],
    ['Abhogi', 22, "S R2 G2 M1 D2 S'", "S' D2 M1 G2 R2 S"],
    ['Andolika', 22, "S R2 M1 P N2 S'", "S' N2 D2 M1 R2 S"],
    ['Ritigowla', 22, "S G2 R2 G2 M1 N2 D2 M1 N2 S'", "S' N2 D2 M1 G2 M1 P M1 G2 R2 S"],
    ['Nalinakanti', 27, "S G3 R2 M1 P N3 S'", "S' N3 P M1 G3 R2 S"],
    ['Surutti', 28, "S R2 M1 P N2 S'", "S' N2 D2 P M1 G3 P M1 R2 S"],
    ['Nagaswaravali', 28, "S G3 M1 P D2 S'", "S' D2 P M1 G3 S"],
    ['Kadanakutuhalam', 29, "S R2 M1 D2 N3 G3 P S'", "S' N3 D2 P M1 G3 R2 S"],
    ['Ranjani', 59, "S R2 G2 M2 D2 S'", "S' N3 D2 M2 G2 S R2 G2 S"],
    // From the list of janya ragas on Wikipedia, checked to sit inside the parent mela.
    ['Kanakambari', 1, "S R1 M1 P D1 S'", "S' N1 D1 P M1 G1 R1 S"],
    ['Kanakatodi', 1, "S R1 G1 M1 P D1 S'", "S' N1 D1 P M1 R1 S"],
    ['Madhavapriya', 1, "S R1 G1 P D1 N1 S'", "S' N1 D1 P G1 R1 S"],
    ['Ganamukhari', 2, "S R1 M1 D1 S'", "S' N2 D1 M1 R1 S"],
    ['Svadhya', 2, "S R1 M1 P N2 S'", "S' N2 D1 P M1 R1 S"],
    ['Ratnavarali', 2, "S R1 M1 P N2 D1 S'", "S' N2 P M1 R1 G1 R1 S"],
    ['Bhinnapanchamam', 3, "S R1 G1 M1 P D1 N3 S'", "S' N3 D1 P M1 G1 R1 S"],
    ['Nadharanjani', 3, "S R1 M1 D1 N3 S'", "S' N3 D1 M1 G1 R1 S"],
    ['Samavarali', 3, "S R1 M1 P D1 N3 S'", "S' N3 D1 P M1 G1 R1 G1 S"],
    ['Rasali', 4, "S R1 M1 P D2 N2 S'", "S' D2 P M1 R1 S"],
    ['Vittalapriya', 4, "S R1 M1 P D2 S'", "S' D2 P M1 R1 S"],
    ['Manoranjani', 5, "S R1 M1 P D2 N3 S'", "S' N3 D2 P M1 G1 R1 S"],
    ['Ghanashyamala', 5, "S G1 M1 P D2 S'", "S' D2 N3 P M1 G1 R1 S"],
    ['Kunjari', 5, "S R1 M1 P D2 P S'", "S' N3 D2 P M1 G1 R1 S"],
    ['Tanukeerti', 6, "S R1 M1 P N3 S'", "S' N3 D3 N3 P M1 G1 M1 R1 S"],
    ['Sindhu Gowri', 7, "S R1 G2 M1 P D1 N1 S'", "S' N1 D1 M1 G2 M1 R1 S"],
    ['Chitthakarshani', 7, "S R1 G2 M1 D1 S'", "S' D1 M1 G2 R1 S"],
    ['Navarasa Mala', 7, "S R1 G2 M1 P D1 S'", "S' N1 D1 P M1 R1 S"],
    ['Asaveri', 8, "S R1 M1 P D1 S'", "S' N2 S' P D1 M1 P R1 G2 R1 S"],
    ['Bhinnashadjam', 9, "S R1 G2 R1 P M1 P N3 S'", "S' D1 P M1 G2 R1 S"],
    ['Mohananata', 9, "S G2 M1 P D1 P M1 P N3 S'", "S' N3 P D1 P M1 G2 S"],
    ['Udayaravichandrika', 9, "S G2 M1 P N3 S'", "S' N3 P M1 G2 S"],
    ['Natabharanam', 10, "S R1 G2 M1 P D2 N2 S'", "S' N2 D2 P M1 G2 R1 S"],
    ['Alankarapriya', 10, "S R1 G2 M1 D2 N2 S'", "S' N2 D2 M1 G2 R1 S"],
    ['Gunavati', 10, "S R1 M1 P D2 S'", "S' D2 P M1 R1 S"],
    ['Chitramani', 11, "S R1 M1 P D2 N3 S'", "S' N3 D2 P M1 G2 R1 S"],
    ['Kowmari', 11, "S R1 G2 M1 P D2 S'", "S' N3 D2 P M1 G2 R1 S"],
    ['Rowpyanaka', 12, "S M1 P D3 N3 S'", "S' N3 P M1 G2 R1 S"],
    ['Shyamakalyani', 12, "S M1 G2 M1 P D3 N3 S'", "S' N3 P D3 N3 P M1 G2 R1 S"],
    ['Hejjajji', 13, "S R1 G3 M1 P D1 S'", "S' N1 D1 P M1 G3 R1 S"],
    ['Kalakanti', 13, "S R1 G3 M1 D1 N1 S'", "S' N1 D1 P G3 R1 S"],
    ['Kalpanadharini', 13, "S G3 M1 P D1 S'", "S' N1 D1 P M1 G3 R1 S"],
    ['Vasantabhairavi', 14, "S R1 G3 M1 D1 N2 S'", "S' N2 D1 M1 P M1 G3 R1 S"],
    ['Gummakambhoji', 15, "S R1 G3 M1 P D1 N3 S'", "S' N3 D1 P M1 G3 R1 S"],
    ['Chayagowla', 15, "S R1 M1 G3 M1 P N3 S'", "S' N3 D1 P M1 G3 R1 S"],
    ['Ramakali', 15, "S R1 G3 P D1 S'", "S' N3 D1 P M1 G3 R1 S"],
    ['Ahir Bhairavi', 16, "S R1 G3 M1 P N2 D2 M1 P D2 S'", "S' N2 D2 P M1 P G3 R1 S"],
    ['Bhujangini', 16, "S R1 G3 M1 D2 N2 S'", "S' N2 D2 M1 G3 R1 S"],
    ['Veenadhari', 16, "S R1 G3 P D2 N2 S'", "S' N2 D2 P M1 G3 R1 S"],
    ['Chayavathi', 17, "S R1 G3 M1 D2 N3 S'", "S' N3 D2 P M1 G3 R1 S"],
    ['Hamsanantini', 18, "S G3 M1 P S'", "S' P M1 G3 R1 S"],
    ['Kallola', 18, "S P D3 N3 S'", "S' N3 D3 P M1 G3 R1 S"],
    ['Simhala', 18, "S R1 G3 M1 P D3 N3 S'", "S' N3 D3 N3 P M1 G3 R1 S"],
    ['Bharati', 19, "S R2 G2 M1 P S'", "S' P M1 G2 R2 S"],
    ['Lalitabhairavi', 19, "S G2 M1 P D1 S'", "S' N1 D1 P M1 G2 R2 S"],
    ['Keeranavali', 21, "S R2 G2 M1 P D1 N3 S'", "S' P M1 G2 R2 S"],
    ['Chandrika', 21, "S R2 G2 P D1 N3 S'", "S' N3 D1 P G2 R2 S"],
    ['Rishipriya', 21, "S R2 G2 M1 P D1 N3 S'", "S' N3 P M1 G2 R2 S"],
    ['Bageshri', 22, "S G2 M1 D2 N2 S'", "S' N2 D2 M1 P D2 G2 M1 R2 S"],
    ['Salagabhairavi', 22, "S R2 M1 P D2 S'", "S' N2 D2 P M1 G2 R2 S"],
    ['Gowrishankar', 23, "S R2 G2 M1 P N3 S'", "S' N3 D2 P M1 G2 R2 S"],
    ['Hamsadeepika', 23, "S R2 G2 M1 D2 S'", "S' N3 D2 P M1 G2 R2 S"],
    ['Thyagaraja Mangalam', 23, "S G2 M1 P N3 S'", "S' N3 D2 P M1 G2 R2 S"],
    ['Veeravasantham', 24, "S R2 G2 M1 P S'", "S' N3 D3 P M1 G2 R2 S"],
    ['Sharavathi', 25, "S R2 G3 M1 P D1 N1 D1 S'", "S' N1 D1 P M1 G3 R2 S"],
    ['Devasalaga', 25, "S G3 P D1 N1 S'", "S' N1 D1 P M1 G3 R2 S"],
    ['Maravi', 26, "S G3 M1 P N2 S'", "S' N2 D1 P M1 G3 R2 S"],
    ['Shiva Manohari', 26, "S M1 G3 M1 P D1 N2 S'", "S' N2 D1 P M1 G3 R2 S"],
    ['Chirswaroopi', 26, "S R2 G3 M1 P D1 N2 S'", "S' N2 D1 P M1 G3 R2 S"],
    ['Sowrasena', 27, "S R2 M1 P D1 S'", "S' N3 D1 P M1 G3 R2 S"],
    ['Srirangapriya', 27, "S R2 G3 M1 P D1 S'", "S' D1 P M1 G3 R2 S"],
    ['Neelamani', 27, "S R2 M1 P D1 N3 S'", "S' N3 D1 P M1 R2 S"],
    ['Harikedaram', 28, "S R2 G3 M1 P D2 N2 S N2 S'", "S' N2 S' D2 N2 D2 P M1 G3 R2 S"],
    ['Mahathi', 28, "S G3 P N2 S'", "S' N2 P G3 S"],
    ['Begada', 29, "S G3 R2 G3 M1 P D2 P S'", "S' N3 D2 P M1 G3 R2 S"],
    ['Garudadhvani', 29, "S R2 G3 M1 P D2 N3 S'", "S' D2 P G3 R2 S"],
    ['Atana', 29, "S R2 M1 P N2 S'", "S' N2 D2 P M1 G2 M1 R2 S", { anya: ['G2', 'N2'] }],
    ['Lalithagandharva', 30, "S R2 G3 M1 P D3 N3 S'", "S' N3 P G3 R2 S"],
    ['Gambheeravani', 30, "S G3 P M1 D3 N3 S'", "S' N3 P M1 G3 R2 G3 R2 S"],
    ['Kalavathi', 31, "S R3 G3 M1 P D1 N1 S'", "S' N1 D1 P M1 G3 R3 S"],
    ['Kalahamsa', 31, "S R3 G3 M1 P D1 S'", "S' N1 D1 P M1 G3 R3 S"],
    ['Desharanjani', 31, "S R3 M1 P D1 N1 S'", "S' N1 D1 P M1 R3 S"],
    ['Ragachoodamani', 32, "S R3 G3 M1 P N2 S'", "S' N2 D1 M1 R3 G3 S"],
    ['Amudagandhari', 32, "S G3 M1 P D1 N2 S'", "S' N2 D1 P M1 G3 R3 S"],
    ['Ramya', 32, "S R3 G3 M1 P D1 N2 P S'", "S' N2 D1 P M1 G3 R3 S"],
    ['Gangatarangini', 33, "S R3 G3 M1 P D1 N3 S'", "S' N3 D1 P M1 G3 M1 R3 S"],
    ['Amarasindhu', 34, "S R3 G3 P D2 N2 S'", "S' N2 D2 P G3 R3 S"],
    ['Maghathi', 34, "S R3 M1 P D2 N2 S'", "S' N2 D2 P M1 R3 S"],
    ['Murali', 34, "S R3 G3 M1 D2 N2 S'", "S' N2 D2 M1 G3 R3 S"],
    ['Suryavasantham', 35, "S M1 G3 M1 D2 N3 S'", "S' N3 D2 M1 G3 R3 S"],
    ['Dheerahindolam', 35, "S G3 M1 D2 N3 S'", "S' N3 D2 P M1 G3 R3 S"],
    ['Devanattai', 36, "S G3 M1 P S'", "S' N3 D3 P M1 G3 R3 S"],
    ['Ganaranjani', 36, "S R3 G3 M1 P M1 D3 N3 S'", "S' N3 D3 P M1 P M1 R3 S"],
    ['Sowgandhini', 37, "S R1 M2 P D1 S'", "S' N1 D1 P M2 G1 R1 S"],
    ['Bhoopalapanchamam', 39, "S G1 R1 G1 P M2 D1 S'", "S' P D1 M2 G1 R1 S"],
    ['Jalasugandhi', 39, "S R1 G1 M2 P D1 S'", "S' D1 P M2 G1 R1 S"],
    ['Nabhomani', 40, "S G1 R1 G1 M2 P S'", "S' N2 D2 P M2 G1 R1 S"],
    ['Kumbhini', 41, "S G1 R1 G1 M2 P N3 D2 N3 S'", "S' N3 D2 P M2 G1 R1 S"],
    ['Chandrajyothi', 41, "S R1 G1 M2 P D2 S'", "S' D2 P M2 G1 R1 S"],
    ['Prabhavali', 41, "S R1 M2 P D2 N3 S'", "S' N3 D2 M2 P M2 R1 G1 R1 S"],
    ['Ravi Kriya', 42, "S G1 R1 G1 M2 P D3 N3 S'", "S' N3 P M2 G1 R1 S"],
    ['Suvarnadeepakam', 43, "S R1 G2 M2 P D1 S'", "S' D1 P M2 G2 R1 S"],
    ['Kanchanavathi', 44, "S R1 G2 M2 P N2 S'", "S' N2 P M2 G2 R1 S"],
    ['Bhavani', 44, "S R1 G2 M2 P D1 P N2 S'", "S' N2 D1 P M2 G2 R1 S"],
    ['Bhanukeeravani', 45, "S R1 G2 M2 P D1 N3 S'", "S' N3 D1 M2 G2 R1 S"],
    ['Jalakesari', 45, "S R1 M2 P D1 N3 S'", "S' D1 P M2 R1 S"],
    ['Chayaranjani', 45, "S G2 M2 P N3 S'", "S' N3 D1 P M2 G2 S"],
    ['Sthavarajam', 46, "S R1 M2 P D2 S'", "S' N2 D2 M2 G2 S"],
    ['Shreekanti', 46, "S G2 M2 P D2 N2 S'", "S' N2 D2 P M2 G2 S"],
    ['Indhudhanyasi', 46, "S G2 M2 D2 N2 S'", "S' N2 D2 P D2 M2 G2 R1 S"],
    ['Abhiru', 47, "S R1 G2 R1 M2 P N3 S'", "S' D2 P M2 G2 R1 G2 S"],
    ['Rathika', 47, "S M2 G2 M2 P D2 N3 S'", "S' N3 D2 P M2 G2 R1 S"],
    ['Jeevanthika', 48, "S M2 P D3 N3 S'", "S' N3 P M2 G2 S"],
    ['Deshamukhari', 48, "S R1 G2 M2 P D3 N3 D3 S'", "S' D3 N3 D3 P M2 G2 R1 S"],
    ['Dundubi', 48, "S R1 G2 M2 P D3 N3 S'", "S' N3 P M2 G2 R1 S"],
    ['Dhavalangam', 49, "S R1 G3 M2 P D1 S'", "S' N1 D1 P M2 G3 R1 S"],
    ['Dharmini', 49, "S R1 G3 M2 D1 N1 S'", "S' N1 D1 M2 G3 R1 S"],
    ['Narmada', 50, "S R1 G3 M2 D1 N2 S'", "S' N2 D1 M2 P M2 G3 R1 S"],
    ['Neelanjana', 50, "S R1 G3 P N2 S'", "S' N2 P M2 G3 R1 S"],
    ['Swaramanjari', 50, "S G3 M2 P D1 S'", "S' N2 D1 P M2 G3 S"],
    ['Gamakapriya', 51, "S R1 G3 M2 P N3 D1 S'", "S' D1 P M2 G3 R1 S"],
    ['Hamsanarayani', 51, "S R1 G3 M2 P S'", "S' N3 P M2 G3 R1 S"],
    ['Bhogavasantha', 51, "S R1 G3 M2 D1 N3 S'", "S' N3 D1 M2 G3 R1 S"],
    ['Ramamanohari', 52, "S R1 G3 M2 P D2 S'", "S' N2 D2 P M2 G3 R1 S"],
    ['Chintaramani', 52, "S G3 M2 P D2 N2 S'", "S' D2 P M2 G3 R1 S"],
    ['Hamsagamini', 52, "S G3 M2 P D2 N2 S'", "S' N2 D2 P M2 D2 P M2 G3 R1 S"],
    ['Gamakakriya', 53, "S R1 G3 M2 P D2 S'", "S' N3 D2 P M2 G3 R1 S"],
    ['Alankari', 53, "S G3 M2 D2 N3 D2 S'", "S' N3 D2 M2 G3 S"],
    ['Sharabadhvaja', 53, "S R1 G3 M2 P D2 S'", "S' D2 P G3 R1 S"],
    ['Hemangi', 54, "S R1 G3 M2 D3 S'", "S' D3 M2 G3 R1 S"],
    ['Sharadhyuthi', 54, "S R1 G3 M2 P D3 N3 D3 S'", "S' N3 D3 P M2 G3 R1 S"],
    ['Sundarangi', 54, "S R1 G3 P D3 N3 S'", "S' N3 D3 P G3 R1 S"],
    ['Shyamalam', 55, "S R2 G2 M2 P D1 N1 S'", "S' N1 D1 P M2 G2 R2 S"],
    ['Deshavali', 55, "S R2 G2 M2 D1 N1 D1 S'", "S' N1 D1 M2 G2 R2 S"],
    ['Vijayamalavi', 55, "S R2 M2 P D1 S'", "S' N1 D1 P M2 R2 S"],
    ['Chamaram', 56, "S R2 M2 P D1 N2 S'", "S' N2 D1 P M2 G2 R2 S"],
    ['Gopikathilakam', 56, "S R2 G2 M2 P N2 S'", "S' N2 P M2 G2 R2 S"],
    ['Ghantana', 57, "S R2 G2 M2 D1 N3 S'", "S' N3 D1 M2 G2 R2 S"],
    ['Anandavalli', 57, "S G2 M2 P N3 S'", "S' N3 P M2 G2 S"],
    ['Jayachoodamani', 57, "S G2 M2 P D1 S'", "S' N3 D1 P M2 G2 R2 S"],
    ['Hamsabhramari', 58, "S R2 G2 M2 P D2 S'", "S' N2 D2 P M2 G2 R2 S"],
    ['Chandrarekha', 58, "S R2 G2 M2 P D2 S'", "S' N2 D2 M2 G2 R2 S"],
    ['Hemambari', 58, "S R2 G2 M2 P D2 N2 S'", "S' P M2 G2 R2 S"],
    ['Dhamavathi', 59, "S R2 G2 M2 P D2 N3 S'", "S' N3 D2 P M2 G2 R2 S"],
    ['Karpoora Bharani', 59, "S R2 G2 P M2 P D2 S'", "S' D2 P M2 P G2 R2 S"],
    ['Moharanjani', 59, "S R2 G2 P D2 S'", "S' N3 D2 M2 G2 S"],
    ['Hamsanadam', 60, "S R2 M2 P D3 N3 S'", "S' N3 D3 P M2 R2 S"],
    ['Kaikavashi', 60, "S R2 G2 M2 P D3 N3 S'", "S' N3 P M2 G2 R2 S"],
    ['Rathnasaranga', 60, "S R2 G2 M2 P N3 S'", "S' N3 D3 P M2 G2 R2 S"],
    ['Kunthalam', 61, "S R2 G3 M2 P D1 S'", "S' N1 D1 P M2 G3 R2 S"],
    ['Poornasaveri', 62, "S R2 M2 P D1 S'", "S' N2 D1 P M2 G3 R2 S"],
    ['Gopriya', 62, "S R2 G3 M2 D1 N2 S'", "S' N2 D1 M2 G3 R2 S"],
    ['Rathnabhanu', 62, "S R2 M2 P N2 D1 N2 S'", "S' N2 D1 P M2 G3 R2 S"],
    ['Hamsalatha', 63, "S R2 G3 P N3 S'", "S' N3 D1 P M2 G3 R2 S"],
    ['Kananapriya', 63, "S R2 G3 M2 P M2 D1 N3 S'", "S' D1 N3 P M2 G3 R2 S"],
    ['Ramani', 63, "S G3 M2 P N3 S'", "S' N3 D1 P M2 G3 S"],
    ['Gaganamohini', 64, "S G3 P D2 N2 S'", "S' N2 P M2 G3 S"],
    ['Gurupriya', 64, "S R2 G3 M2 D2 N2 S'", "S' N2 D2 M2 G3 R2 S"],
    ['Bhagavataranjana', 64, "S R2 M2 P D2 N2 S'", "S' N2 D2 P M2 G3 R2 S"],
    ['Shanthakalyani', 65, "S R2 G3 M2 P D2 N3 S'", "S' N3 D2 P M2 G3 R2 S"],
    ['Amritha Kalyani', 65, "S G3 M2 P N3 S'", "S' N3 D2 P M2 G3 R2 S"],
    ['Bhoopkalyani', 65, "S R2 G3 P D2 S'", "S' N3 D2 P M2 G3 R2 S"],
    ['Chaturangini', 66, "S R2 G3 M2 P N3 S'", "S' N3 D3 N3 P G3 M2 G3 R2 S"],
    ['Chitrasindhu', 66, "S G3 M2 P N3 S'", "S' N3 D3 P M2 G3 R2 S"],
    ['Churnikavinodhini', 66, "S R2 G3 M2 P D3 N3 S'", "S' N3 D3 N3 P M2 G3 R2 S"],
    ['Santhana Manjari', 67, "S R3 G3 M2 P D1 S'", "S' N1 D1 P M2 R3 S"],
    ['Jyothi', 68, "S R3 G3 M2 P D1 N2 S'", "S' N2 D1 P M2 G3 S"],
    ['Deepavarali', 68, "S R3 M2 P N2 S'", "S' N2 P M2 G3 R3 S"],
    ['Ramagiri', 68, "S R3 M2 G3 M2 P D1 N2 S'", "S' D1 N2 D1 P M2 G3 R3 S"],
    ['Tavapriya', 69, "S R3 M2 P N3 S'", "S' N3 D1 P M2 G3 R3 S"],
    ['Sumukham', 69, "S R3 M2 N3 S'", "S' N3 M2 R3 S"],
    ['Dhowtha Panchamam', 69, "S R3 G3 M2 P N3 P S'", "S' N3 D1 P M2 R3 G3 M2 R3 S"],
    ['Nasamani', 70, "S R3 S M2 P D2 N2 S'", "S' N2 D2 P M2 G3 R3 S"],
    ['Marakathagowla', 70, "S R3 M2 P D2 N2 S'", "S' N2 D2 P M2 G3 R3 S"],
    ['Thilakamandari', 70, "S R3 M2 P D2 S'", "S' D2 P M2 G3 R3 S"],
    ['Kusumakaram', 71, "S R3 G3 M2 P D2 N3 S'", "S' N3 D2 P M2 G3 R3 S"],
    ['Ayodhya', 71, "S G3 M2 P N3 S'", "S' D2 P M2 G3 M2 R3 S"],
    ['Rasamanjari', 72, "S R3 G3 M2 P D3 N3 S'", "S' N3 D3 P M2 G3 R3 S"],
    ['Hamsagiri', 72, "S R3 G3 M2 P D3 N3 S'", "S' N3 P D3 N3 P M2 G3 S"],
    ['Ishtarangini', 72, "S R3 M2 P N3 S'", "S' N3 D3 P M2 G3 R3 S"],
  ];

  // Carnatic pitch numbering (kattai), Sa in the octave starting at C3.
  const KATTAI = ['1', '1½', '2', '2½', '3', '4', '4½', '5', '5½', '6', '6½', '7'].map((k, st) => ({
    k, note: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][st],
    hz: 130.8128 * Math.pow(2, st / 12),
  }));

  function parseToken(t) {
    const m = /^([SRGMPDN])([123])?(['.])?$/.exec(t);
    if (!m) throw new Error('Bad swara token ' + t);
    const name = m[1] + (m[2] || '');
    const oct = m[3] === "'" ? 1 : m[3] === '.' ? -1 : 0;
    const st = SEMI[name];
    return { name, letter: m[1], num: m[2] || '', oct, st, cents: CENTS[st] + 1200 * oct };
  }
  function tokObj(name, oct = 0) {
    return { name, letter: name[0], num: name.slice(1), oct, st: SEMI[name], cents: CENTS[SEMI[name]] + 1200 * oct };
  }
  const centsOf = (name, oct = 0) => CENTS[SEMI[name]] + 1200 * oct;

  function melaInfo(n) {
    const k0 = n - 1;
    const madhyama = k0 < 36 ? 'M1' : 'M2';
    const k = k0 % 36;
    const c = Math.floor(k / 6), p = k % 6;
    const [R, G] = RG[c], [D, N] = DN[p];
    const swaras = ['S', R, G, madhyama, 'P', D, N];
    return {
      id: 'm' + n, kind: 'mela', n, parent: n, name: MELA_NAMES[k0], alias: ALIASES[n] || '',
      madhyama, chakra: Math.floor(k0 / 6), chakraInHalf: c, pos: p, swaras,
      aro: [...swaras, "S'"], ava: ["S'", ...swaras.slice().reverse()],
    };
  }
  const MELAS = Array.from({ length: 72 }, (_, i) => melaInfo(i + 1));
  const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, '-');
  const JANYAS = JANYA_DATA.map(([name, parent, a, v, extra = {}]) => ({
    id: 'j-' + slug(name), kind: 'janya', name, alias: '', parent, aro: a.split(' '), ava: v.split(' '),
    anya: extra.anya || [],
  }));
  const ALL = [...MELAS, ...JANYAS];
  const byId = Object.fromEntries(ALL.map((r) => [r.id, r]));
  const find = (name) => ALL.find((r) => r.name === name || r.alias === name);

  const namesIn = (toks) => new Set(toks.map((t) => parseToken(t).name));
  function swaraSet(r) { return new Set([...namesIn(r.aro), ...namesIn(r.ava)]); }
  function sortedNames(r) { return [...swaraSet(r)].sort((a, b) => SEMI[a] - SEMI[b]); }
  // The raga's own swaras: everything it uses except borrowed anya swaras.
  function ownSwaras(r) { const a = new Set(r.anya || []); return new Set([...swaraSet(r)].filter((x) => !a.has(x))); }

  function classify(r) {
    const label = { 5: 'Audava', 6: 'Shadava', 7: 'Sampurna' };
    const anya = new Set(r.anya || []);
    const cnt = (t) => { const n = [...namesIn(t)].filter((x) => !anya.has(x)).length; return label[n] || n + ' swaras'; };
    const mono = (toks, dir) => toks.map(parseToken).every((x, i, a) => i === 0 || (dir > 0 ? x.cents > a[i - 1].cents : x.cents < a[i - 1].cents));
    const vakra = !mono(r.aro, 1) || !mono(r.ava, -1);
    return { type: `${cnt(r.aro)}–${cnt(r.ava)}`, vakra, bhashanga: anya.size > 0 };
  }
  // Melakartas that contain every one of the raga's own swaras (anya swaras don't count).
  function consistentMelas(r) {
    const s = [...ownSwaras(r)];
    return MELAS.filter((m) => s.every((x) => m.swaras.includes(x)));
  }
  function varjya(r) {
    const s = swaraSet(r);
    return MELAS[r.parent - 1].swaras.filter((x) => !s.has(x));
  }

  // Nearest swarasthana to a pitch given in cents above Sa. `allowed` limits to a set of semitone indices.
  function nearest(cents, allowed) {
    const oct = Math.floor(cents / 1200);
    const within = cents - oct * 1200;
    let best = -1, bd = Infinity;
    for (let i = 0; i <= 12; i++) {
      const st = i % 12;
      if (allowed && !allowed.has(st)) continue;
      const c = i < 12 ? CENTS[i] : 1200;
      const d = within - c;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = i; }
    }
    // Also check the top of the previous octave for allowed sets that skip Sa's neighbours.
    let o = oct, st = best;
    if (best === 12) { st = 0; o = oct + 1; }
    if (allowed && within < 600) {
      for (const s of allowed) {
        const d = within - (CENTS[s] - 1200);
        if (Math.abs(d) < Math.abs(bd)) { bd = d; st = s; o = oct - 1; }
      }
    }
    return { st, oct: o, dev: bd, target: CENTS[st] + 1200 * o };
  }

  // The one name each position goes by in everyday teaching. In two-form
  // numbering this reads S R1 R2 G1 G2 M1 M2 P D1 D2 N1 N2.
  const COMMON = ['S', 'R1', 'R2', 'G2', 'G3', 'M1', 'M2', 'P', 'D1', 'D2', 'N2', 'N3'];
  const commonName = (st) => COMMON[((st % 12) + 12) % 12];

  // Name to use for a semitone within a raga (R2 vs G1 etc.); outside a raga, the everyday name.
  function nameFor(r, st) {
    if (r) for (const n of swaraSet(r)) if (SEMI[n] === st) return n;
    return commonName(st);
  }

  // ---- how swara names are written ----
  // Internally every swara keeps its melakarta name (G1 G2 G3, N1 N2 N3). What learners see
  // depends on the numbering scheme:
  //   practical (default): the two forms used in practice are numbered 1 and 2:
  //     sadharana gandharam G1, antara gandharam G2, kaisiki nishadam N1, kakali nishadam N2.
  //     The rare shuddha gandharam and shuddha nishadam (needed by some melakartas) show as Gs, Ns.
  //   melakarta: three forms each, G1–G3 and N1–N3, as in the 72-mela system.
  const PRACTICAL = { G1: 's', G2: '1', G3: '2', N1: 's', N2: '1', N3: '2' };
  let scheme = 'practical';
  try { const v = JSON.parse(localStorage.getItem('rs.numbering')); if (v === 'practical' || v === 'melakarta') scheme = v; } catch { /* default */ }
  const numOf = (name) => (scheme === 'practical' && PRACTICAL[name] ? PRACTICAL[name] : name.slice(1));
  const label = (name) => name[0] + numOf(name);   // display name without octave marks, e.g. "N2"

  function swaraHTML(tok, cls = '') {
    const t = typeof tok === 'string' ? parseToken(tok) : tok;
    const dot = t.oct > 0 ? '\u0307'.repeat(t.oct) : t.oct < 0 ? '\u0323'.repeat(-t.oct) : '';
    const num = t.num ? numOf(t.name) : '';
    return `<span class="sw ${cls}">${t.letter}${dot}${num ? `<sub>${num}</sub>` : ''}</span>`;
  }
  function swaraText(name, oct = 0) {
    const dot = oct > 0 ? '\u0307'.repeat(oct) : oct < 0 ? '\u0323'.repeat(-oct) : '';
    return name[0] + dot + numOf(name);
  }
  // A swara token ("N3", "S'", "P.") as display text.
  const tokText = (t) => { const p = parseToken(t); return swaraText(p.name, p.oct); };
  function seqHTML(toks, mark) {
    return `<span class="seq">${toks.map((x) => swaraHTML(x, mark && mark(parseToken(x)) ? 'diff' : '')).join('')}</span>`;
  }
  const melaLabel = (m) => `${m.n} · ${m.name}`;

  // Step-by-step explanation of how a mela's swaras give its number.
  function derivation(m) {
    const [R, G] = RG[m.chakraInHalf], [D, N] = DN[m.pos];
    const base = m.madhyama === 'M1' ? 0 : 36;
    return `${swaraHTML(R)} ${swaraHTML(G)} means chakra ${m.chakraInHalf + 1} of its half; ${swaraHTML(D)} ${swaraHTML(N)} means position ${m.pos + 1} (${PA[m.pos]}); ${swaraHTML(m.madhyama)} puts it in melas ${base + 1}–${base + 36}. So ${base} + 6×${m.chakraInHalf} + ${m.pos + 1} = <b>${m.n}</b>, ${m.name}, in ${CHAKRAS[m.chakra]} chakra.`;
  }

  return {
    RATIOS, CENTS, SEMI, POSITIONS, FULL_NAME, CHAKRAS, RG, DN, PA, KATTAI,
    MELAS, JANYAS, ALL, byId, find,
    parseToken, tokObj, centsOf, swaraSet, ownSwaras, sortedNames, classify, consistentMelas, varjya,
    nearest, nameFor, commonName, COMMON, swaraHTML, swaraText, tokText, label, seqHTML, melaLabel, derivation,
    getNumbering: () => scheme,
    setNumbering(v) {
      if (v !== 'practical' && v !== 'melakarta') return;
      scheme = v;
      try { localStorage.setItem('rs.numbering', JSON.stringify(v)); } catch { /* not saved */ }
    },
  };
})();
