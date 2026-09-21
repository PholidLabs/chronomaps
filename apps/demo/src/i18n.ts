/** UI strings for the demo shell. Campaign text comes from the file itself. */
export interface UIStrings {
  campaign: string; story: string; explore: string; load: string; chapter: string; of: string;
  scrollCue: string; contentNote: string; period: string; languages: string; licence: string;
  inThisFile: string; checked: string; errors: string; warnings: string; notes: string;
  chapters: string; events: string; places: string; forces: string; sources: string; note: string;
  eventsHere: string; notMapped: string; viewSource: string; imageNote: string; end: string; exploreFreely: string;
  exploreLede: string; play: string; pause: string; jump: string; now: string; happening: string;
  strongholds: string; engine: string; loadYours: string; loadHelp: string; loadFailed: string; dismiss: string;
  nothing: string; moving: string; men: string; sides: string; lines: string; routeDoc: string; routeConj: string;
  routeSea: string; uncertainty: string; basemap: string; terrain: string;
  week: string; month: string; year: string; fiveyear: string;
  exact: string; approximate: string; conjectural: string; legend: string; aboutPreview: string; aboutText: string; tagline: string;
  theme: string; themeAuto: string; themeLight: string; themeDark: string; dropHere: string;
  mountains: string; rivers: string; cities: string; marchActive: string;
}

export const UI: Record<string, UIStrings> = {
  en: {
    campaign: 'Campaign', story: 'Story', explore: 'Explore', load: 'Load JSON…', chapter: 'Chapter', of: 'of',
    scrollCue: 'Scroll to begin ↓', contentNote: 'Content note', period: 'Period', languages: 'Languages', licence: 'Licence',
    inThisFile: 'In this file', checked: 'Reference loader', errors: 'errors', warnings: 'warnings', notes: 'notes',
    chapters: 'chapters', events: 'events', places: 'places', forces: 'forces', sources: 'Sources', note: 'Note',
    eventsHere: 'Events in this chapter', notMapped: 'not on the map', viewSource: 'View at source',
    imageNote: 'Image could not be loaded here', end: 'End of the campaign', exploreFreely: 'Explore freely →',
    exploreLede: 'Drag the timeline or press play. Pan, zoom and tilt the map, and click anything for its sources and uncertainty.',
    play: 'Play', pause: 'Pause', jump: 'Jump to chapter', now: 'On the map now', happening: 'Happening',
    strongholds: 'Strongholds', engine: 'Engine', loadYours: 'Load your own campaign',
    loadHelp: 'Drop a ChronoMap campaign JSON anywhere on this page. If it passes the loader it plays here with no code changes.',
    loadFailed: 'That file could not be loaded', dismiss: 'Dismiss', nothing: 'nothing', moving: 'on the move',
    men: 'men', sides: 'Sides', lines: 'Lines', routeDoc: 'documented route', routeConj: 'conjectural route',
    routeSea: 'by sea', uncertainty: 'location uncertainty', basemap: 'Basemap: Natural Earth, self-hosted.',
    terrain: '3D terrain', week: '1 week/s', month: '1 month/s', year: '1 year/s', fiveyear: '5 years/s',
    exact: 'exact site', approximate: 'approximate', conjectural: 'conjectural', legend: 'Legend',
    aboutPreview: 'About this demo',
    aboutText: 'MapLibre GL renders the map; @chronomap/engine parses, validates and resolves every frame. Same code the Rust core must match, and the same JSON any other campaign would use.',
    tagline: 'engine demo · contract 1.0',
    theme: 'Theme', themeAuto: 'Auto', themeLight: 'Light', themeDark: 'Dark',
    dropHere: 'Drop to load campaign',
    mountains: 'Mountains & Volcanoes', rivers: 'Rivers & Waterways', cities: 'Historic Settlements', marchActive: 'Troops on the march',
  },
  id: {
    campaign: 'Kampanye', story: 'Cerita', explore: 'Jelajah', load: 'Muat JSON…', chapter: 'Bab', of: 'dari',
    scrollCue: 'Gulir untuk mulai ↓', contentNote: 'Catatan isi', period: 'Periode', languages: 'Bahasa', licence: 'Lisensi',
    inThisFile: 'Isi berkas ini', checked: 'Pemeriksa acuan', errors: 'galat', warnings: 'peringatan', notes: 'catatan',
    chapters: 'bab', events: 'peristiwa', places: 'tempat', forces: 'pasukan', sources: 'Sumber', note: 'Catatan',
    eventsHere: 'Peristiwa dalam bab ini', notMapped: 'tidak dipetakan', viewSource: 'Lihat di sumber',
    imageNote: 'Gambar tidak dapat dimuat di sini', end: 'Akhir kampanye', exploreFreely: 'Jelajah bebas →',
    exploreLede: 'Geser garis waktu atau tekan putar. Geser, perbesar, dan miringkan peta, lalu klik objek untuk melihat sumber dan tingkat kepastiannya.',
    play: 'Putar', pause: 'Jeda', jump: 'Lompat ke bab', now: 'Di peta saat ini', happening: 'Sedang terjadi',
    strongholds: 'Benteng', engine: 'Mesin', loadYours: 'Muat kampanye Anda',
    loadHelp: 'Jatuhkan berkas JSON kampanye ChronoMap ke halaman ini. Jika lolos pemeriksaan, berkas langsung dimainkan tanpa ubah kode.',
    loadFailed: 'Berkas itu tidak dapat dimuat', dismiss: 'Tutup', nothing: 'tidak ada', moving: 'sedang bergerak',
    men: 'orang', sides: 'Pihak', lines: 'Garis', routeDoc: 'rute terdokumentasi', routeConj: 'rute dugaan',
    routeSea: 'lewat laut', uncertainty: 'ketidakpastian lokasi', basemap: 'Peta dasar: Natural Earth, dihosting sendiri.',
    terrain: 'Relief 3D', week: '1 minggu/dtk', month: '1 bulan/dtk', year: '1 tahun/dtk', fiveyear: '5 tahun/dtk',
    exact: 'lokasi pasti', approximate: 'perkiraan', conjectural: 'dugaan', legend: 'Legenda',
    aboutPreview: 'Tentang demo ini',
    aboutText: 'MapLibre GL menggambar peta; @chronomap/engine mengurai, memvalidasi, dan menghitung setiap frame. Kode yang sama yang harus disamai inti Rust, dan JSON yang sama untuk kampanye mana pun.',
    tagline: 'demo mesin · kontrak 1.0',
    theme: 'Tema', themeAuto: 'Otomatis', themeLight: 'Terang', themeDark: 'Gelap',
    dropHere: 'Jatuhkan berkas untuk memuat kampanye',
    mountains: 'Gunung & Gunung Api', rivers: 'Sungai & Saluran Air', cities: 'Permukiman Sejarah', marchActive: 'Pergerakan pasukan',
  },
};

export const STATUS: Record<string, Record<string, string>> = {
  en: { planned: 'planned', active: 'held', besieged: 'under siege', captured: 'captured', destroyed: 'destroyed', abandoned: 'abandoned', encamped: 'encamped', captive: 'captive', surrendered: 'surrendered', disbanded: 'disbanded', exiled: 'in exile', dead: 'dead' },
  id: { planned: 'direncanakan', active: 'dikuasai', besieged: 'dikepung', captured: 'direbut', destroyed: 'dihancurkan', abandoned: 'ditinggalkan', encamped: 'berkemah', captive: 'ditawan', surrendered: 'menyerah', disbanded: 'dibubarkan', exiled: 'diasingkan', dead: 'meninggal' },
};
export const KINDS: Record<string, Record<string, string>> = {
  en: { battle: 'Battle', siege: 'Siege', skirmish: 'Skirmish', raid: 'Raid', massacre: 'Massacre', capture: 'Capture', surrender: 'Surrender', negotiation: 'Negotiation', treaty: 'Treaty', proclamation: 'Proclamation', decree: 'Decree', uprising: 'Uprising', appointment: 'Appointment', arrest: 'Arrest', exile: 'Exile', birth: 'Birth', death: 'Death', political: 'Political event', other: 'Event' },
  id: { battle: 'Pertempuran', siege: 'Pengepungan', skirmish: 'Pertempuran kecil', raid: 'Serangan', massacre: 'Pembantaian', capture: 'Penangkapan', surrender: 'Penyerahan diri', negotiation: 'Perundingan', treaty: 'Perjanjian', proclamation: 'Proklamasi', decree: 'Dekret', uprising: 'Perlawanan', appointment: 'Pengangkatan', arrest: 'Penangkapan', exile: 'Pengasingan', birth: 'Kelahiran', death: 'Kematian', political: 'Peristiwa politik', other: 'Peristiwa' },
};
export const ROLES: Record<string, Record<string, string>> = {
  en: { attacker: 'attacking', defender: 'defending', belligerent: 'fighting', negotiator: 'negotiating', mediator: 'mediating', perpetrator: 'perpetrators', victim: 'victims', party: 'involved' },
  id: { attacker: 'menyerang', defender: 'bertahan', belligerent: 'bertempur', negotiator: 'berunding', mediator: 'menengahi', perpetrator: 'pelaku', victim: 'korban', party: 'terlibat' },
};
