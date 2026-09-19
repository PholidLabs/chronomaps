/** Prose for the landing page, in both languages the demo ships.
 *  Kept out of i18n.ts, which is the app shell's short chrome labels. */
export interface LandingStrings {
  docTitle: string; docDesc: string;
  heroTitle: string; heroLede: string; heroCta: string; heroAlt: string;
  howTitle: string; howLede: string; diagramCaption: string;
  steps: { title: string; body: string }[];
  fileTitle: string; fileBody: string; fileNote: string;
  timeTitle: string; timeBody: string; timeNote: string;
  enginesTitle: string; enginesBody: string; enginesNote: string;
  offlineTitle: string; offlineBody: string;
  aboutTitle: string; aboutBody: string; aboutLicence: string;
}

export const LANDING: Record<string, LandingStrings> = {
  en: {
    docTitle: 'ChronoMap Engine — scrollytelling historical maps from one JSON file',
    docDesc: 'A local-first engine for scrollytelling historical maps. One JSON file describes a campaign; the engine plays it, sources and uncertainty included.',
    heroTitle: 'One JSON file. A map that tells its story.',
    heroLede: 'ChronoMap is a local-first engine for scrollytelling historical maps. Describe a campaign — places, forces, events, chapters — and the engine plays it: units move along their routes, forts change hands, the camera follows the story as you scroll, and every claim can carry its source and its uncertainty.',
    heroCta: 'Open the map',
    heroAlt: 'How it works',
    howTitle: 'How it works',
    howLede: 'Four stages, and only the last one knows what a map is. The engine itself has no DOM and no renderer: give it a campaign and a moment in time, and it hands back a frame.',
    diagramCaption: 'Only the final stage knows what a map is.',
    steps: [
      { title: 'The campaign file', body: 'One JSON document holds everything: factions, places, entities and their tracks, events, chapters and sources. No paint properties, no camera coordinates to guess at — the file describes history, not a drawing.' },
      { title: 'Loader and diagnostics', body: 'The loader validates and normalises, emitting numbered diagnostics. Errors mean it will not play. Warnings catch the things that render but lie: a unit whose track jumps 400 km in a day, a chapter whose window runs backwards, an event outside the timeline.' },
      { title: 'Frame resolution', body: 'Given a tick — signed seconds since 1970 — resolveFrame interpolates every unit along its track, settles each fort’s status, and selects the events in view. Pure arithmetic: same input, same output, on any platform.' },
      { title: 'The renderer', body: 'MapLibre GL draws the frame. Static geometry is installed once per campaign; each frame touches only the small dynamic sources. Labels are DOM, decluttered by priority, so they never collide with the cartouche or the timeline.' },
    ],
    fileTitle: 'Anatomy of a campaign file',
    fileBody: 'Everything shares one ID namespace, so an entity may not take the same id as a place or an event. Keys prefixed with x- are yours; the engine carries them through untouched.',
    fileNote: 'Positions that are guesses must say so. Mark one conjectural and the renderer draws that uncertainty as a real circle on the ground, rather than quietly pretending to precision.',
    timeTitle: 'Time is a first-class problem',
    timeBody: 'Dates are an EDTF (ISO 8601-2) subset: 1825, 1825-07, 1825-07-20, 1826-10-12~ for approximate, 1830-02? for uncertain, 1825-07/1830-03 for an interval, 1825-07/.. for an open end. Negative years work, for campaigns before the common era.',
    timeNote: 'Internally a tick is signed seconds since 1970-01-01 in the proleptic Gregorian calendar. Every campaign in this repository is negative — which is exactly why the type is signed.',
    enginesTitle: 'Two implementations, one set of vectors',
    enginesBody: 'The TypeScript engine is the executable spec. A Rust port lives beside it and is verified against the same golden vectors — diagnostics compared code by code and path by path, every frame field to 1e-6. Neither is allowed to drift.',
    enginesNote: 'An honest note on WASM: on these datasets resolveFrame costs about 0.02 ms per frame against roughly 8 ms of drawing. The renderer is the bottleneck, not the engine. Compile the core because you want one memory-safe implementation of the semantics — not because it will make this demo faster.',
    offlineTitle: 'Local-first, no accounts',
    offlineBody: 'No API keys. No tile server. No sign-up. The basemap is Natural Earth GeoJSON served from the repository itself, so the whole thing runs offline. Drop your own campaign file onto the page and it plays immediately — no rebuild, no code changes.',
    aboutTitle: 'About',
    aboutBody: 'The format is the product. The Java War (Perang Diponegoro, 1825–1830) is the flagship dataset; Napoleon’s Russian campaign of 1812 sits in the same repository, in the same format, loaded by the same code with nothing changed but the file.',
    aboutLicence: 'Code MIT. The Java War dataset is CC-BY-4.0, with its sources listed in the file itself. Basemap from Natural Earth (public domain).',
  },
  id: {
    docTitle: 'ChronoMap Engine — peta sejarah bergulir dari satu berkas JSON',
    docDesc: 'Mesin lokal-dulu untuk peta sejarah bergulir. Satu berkas JSON menjelaskan sebuah kampanye; mesin memainkannya, lengkap dengan sumber dan ketidakpastian.',
    heroTitle: 'Satu berkas JSON. Peta yang menceritakan kisahnya.',
    heroLede: 'ChronoMap adalah mesin lokal-dulu untuk peta sejarah bergulir. Jelaskan sebuah kampanye — tempat, pasukan, peristiwa, bab — dan mesin ini memainkannya: pasukan bergerak di sepanjang rutenya, benteng berpindah tangan, kamera mengikuti cerita saat Anda menggulir, dan setiap klaim dapat membawa sumber serta ketidakpastiannya.',
    heroCta: 'Buka peta',
    heroAlt: 'Cara kerjanya',
    howTitle: 'Cara kerjanya',
    howLede: 'Empat tahap, dan hanya tahap terakhir yang tahu apa itu peta. Mesinnya sendiri tidak mengenal DOM maupun penggambar: beri ia sebuah kampanye dan satu titik waktu, ia mengembalikan satu frame.',
    diagramCaption: 'Hanya tahap terakhir yang tahu apa itu peta.',
    steps: [
      { title: 'Berkas kampanye', body: 'Satu dokumen JSON memuat semuanya: faksi, tempat, entitas beserta jejaknya, peristiwa, bab, dan sumber. Tidak ada properti gambar, tidak ada koordinat yang harus ditebak kamera — berkas ini menjelaskan sejarah, bukan gambar.' },
      { title: 'Pemuat dan diagnostik', body: 'Pemuat memvalidasi dan menormalkan, lalu mengeluarkan diagnostik bernomor. Galat berarti berkas tidak akan dimainkan. Peringatan menangkap hal yang tetap tergambar tetapi menyesatkan: jejak pasukan yang melompat 400 km dalam sehari, bab yang jendela waktunya mundur, peristiwa di luar rentang waktu.' },
      { title: 'Penghitungan frame', body: 'Diberi satu tick — detik bertanda sejak 1970 — resolveFrame menginterpolasi posisi tiap pasukan di sepanjang jejaknya, menetapkan status tiap benteng, dan memilih peristiwa yang sedang tampak. Murni aritmetika: masukan sama, keluaran sama, di platform mana pun.' },
      { title: 'Penggambar', body: 'MapLibre GL menggambar frame itu. Geometri statis dipasang sekali per kampanye; tiap frame hanya menyentuh sumber dinamis yang kecil. Label berupa DOM yang ditata menurut prioritas, sehingga tidak pernah bertabrakan dengan kartus atau garis waktu.' },
    ],
    fileTitle: 'Anatomi berkas kampanye',
    fileBody: 'Semua id berada dalam satu ruang nama, sehingga sebuah entitas tidak boleh memakai id yang sama dengan tempat atau peristiwa. Kunci berawalan x- adalah milik Anda; mesin meneruskannya tanpa mengubah apa pun.',
    fileNote: 'Posisi yang masih dugaan harus dinyatakan demikian. Tandai sebagai conjectural, dan penggambar menggambar ketidakpastian itu sebagai lingkaran nyata di atas tanah, alih-alih diam-diam berlagak presisi.',
    timeTitle: 'Waktu adalah persoalan utama',
    timeBody: 'Tanggal memakai subset EDTF (ISO 8601-2): 1825, 1825-07, 1825-07-20, 1826-10-12~ untuk perkiraan, 1830-02? untuk yang tidak pasti, 1825-07/1830-03 untuk rentang, dan 1825-07/.. untuk ujung terbuka. Tahun negatif didukung, untuk kampanye sebelum era umum.',
    timeNote: 'Di dalamnya, satu tick adalah detik bertanda sejak 1970-01-01 dalam kalender Gregorian proleptik. Semua kampanye di repositori ini bernilai negatif — justru itulah sebabnya tipenya bertanda.',
    enginesTitle: 'Dua implementasi, satu set vektor',
    enginesBody: 'Mesin TypeScript adalah spesifikasi yang dapat dijalankan. Port Rust berdiri di sampingnya dan diuji terhadap vektor emas yang sama — diagnostik dibandingkan kode demi kode dan jalur demi jalur, setiap medan frame hingga 1e-6. Keduanya tidak boleh menyimpang.',
    enginesNote: 'Catatan jujur soal WASM: pada data ini resolveFrame memakan sekitar 0,02 ms per frame, berbanding sekitar 8 ms waktu menggambar. Penghambatnya adalah penggambar, bukan mesin. Kompilasilah inti itu karena Anda ingin satu implementasi semantik yang aman-memori — bukan karena itu akan mempercepat demo ini.',
    offlineTitle: 'Lokal-dulu, tanpa akun',
    offlineBody: 'Tanpa kunci API. Tanpa server ubin. Tanpa pendaftaran. Peta dasar berupa GeoJSON Natural Earth yang disajikan dari repositori itu sendiri, sehingga semuanya berjalan luring. Jatuhkan berkas kampanye Anda ke halaman dan ia langsung dimainkan — tanpa build ulang, tanpa ubah kode.',
    aboutTitle: 'Tentang',
    aboutBody: 'Formatnya adalah produknya. Perang Jawa (Perang Diponegoro, 1825–1830) adalah data unggulan; kampanye Napoleon di Rusia tahun 1812 berada di repositori yang sama, dalam format yang sama, dimuat oleh kode yang sama tanpa ada yang berubah selain berkasnya.',
    aboutLicence: 'Kode MIT. Data Perang Jawa CC-BY-4.0, dengan sumber tercantum di dalam berkasnya. Peta dasar dari Natural Earth (domain publik).',
  },
};

/** The pipeline's node labels are code and product names, so they stay put in both languages. */
export const PIPELINE = ['campaign.json', 'loader + diagnostics', 'resolveFrame', 'MapLibre GL'];

/** Shown verbatim under "Anatomy of a campaign file". */
export const FILE_SNIPPET = `{
  "chronomap": "1.0",
  "meta": {
    "id": "java-war-1825",
    "timeline": { "extent": "1825-07/1830-03" }
  },
  "factions": [
    { "id": "diponegoro", "color": "#8B1E1E" }
  ],
  "places": [
    { "id": "tegalrejo", "coordinates": [110.35, -7.78],
      "certainty": "exact" }
  ],
  "entities": [
    { "id": "diponegoro-hq", "kind": "unit", "track": [ … ] }
  ],
  "events": [
    { "id": "battle-of-gawok", "when": "1826-10-15",
      "at": "gawok" }
  ],
  "chapters": [
    { "id": "ch-06", "when": "1825-07-20", "camera": { … } }
  ]
}`;
