/**
 * Tarot Handler Module - Tama Bot v2.0
 * 
 * Complete 78-card Tarot deck with accurate meanings.
 * Includes Major Arcana (22 cards) and Minor Arcana (56 cards).
 * All meanings are based on traditional Rider-Waite-Smith interpretations.
 * 
 * @author Tama (el-pablos)
 * @version 1.0.0
 */

const axios = require('axios');

// Load environment variables  
const COPILOT_API_URL = process.env.COPILOT_API_URL || 'http://localhost:4141';
const COPILOT_API_MODEL = process.env.COPILOT_API_MODEL || 'claude-sonnet-4.5';

/**
 * MAJOR ARCANA - 22 Cards (0-21)
 * Traditional Rider-Waite-Smith meanings
 */
const MAJOR_ARCANA = [
    {
        id: 0,
        name: 'The Fool',
        nameId: 'Si Bodoh',
        emoji: '🃏',
        upright: {
            keywords: ['Awal baru', 'Spontanitas', 'Kepolosan', 'Petualangan', 'Potensi'],
            meaning: 'Awal perjalanan baru, mengambil lompatan keimanan. Waktu untuk percaya pada semesta dan mengikuti arus. Kepolosan dan kebebasan dari ketakutan. Potensi tak terbatas menunggu.',
            love: 'Hubungan baru yang exciting, cinta yang spontan dan bebas. Mungkin perlu lebih hati-hati dalam memilih pasangan.',
            career: 'Peluang karir baru, memulai bisnis, keluar dari zona nyaman. Waktu untuk mengambil risiko.',
            advice: 'Percaya pada intuisi dan jangan takut memulai sesuatu yang baru.'
        },
        reversed: {
            keywords: ['Keceroboan', 'Risiko berlebihan', 'Naif', 'Takut perubahan'],
            meaning: 'Terlalu gegabah atau justru terlalu takut mengambil langkah. Keputusan yang tidak matang, naif, atau menolak peluang karena ketakutan.',
            love: 'Hubungan yang tidak stabil, terlalu cepat masuk ke hubungan tanpa berpikir.',
            career: 'Keputusan karir yang tergesa-gesa, risiko yang tidak perlu.',
            advice: 'Pikirkan konsekuensi sebelum bertindak, tapi jangan biarkan ketakutan menghentikanmu.'
        }
    },
    {
        id: 1,
        name: 'The Magician',
        nameId: 'Sang Pesulap',
        emoji: '🎩',
        upright: {
            keywords: ['Manifestasi', 'Kekuatan', 'Kreativitas', 'Keterampilan', 'Konsentrasi'],
            meaning: 'Kamu punya semua yang dibutuhkan untuk sukses. Kekuatan manifestasi, kreativitas tinggi. Waktu untuk menggunakan talenta dan sumber daya yang ada.',
            love: 'Pesona tinggi, menarik perhatian. Hubungan yang penuh semangat dan kreativitas.',
            career: 'Kemampuan untuk mewujudkan goals, keterampilan komunikasi yang kuat.',
            advice: 'Gunakan semua kemampuanmu sekarang, fokus dan manifestasikan impianmu.'
        },
        reversed: {
            keywords: ['Manipulasi', 'Tipu daya', 'Potensi terbuang', 'Kurang fokus'],
            meaning: 'Potensi yang tidak digunakan atau disalahgunakan. Hati-hati terhadap manipulasi. Kurang fokus atau menggunakan kemampuan untuk tujuan salah.',
            love: 'Waspada terhadap pasangan yang manipulatif atau tidak jujur.',
            career: 'Keterampilan tidak digunakan dengan benar, mungkin ada penipuan.',
            advice: 'Jujurlah pada diri sendiri dan orang lain. Fokuskan energimu pada hal positif.'
        }
    },
    {
        id: 2,
        name: 'The High Priestess',
        nameId: 'Pendeta Tinggi Wanita',
        emoji: '🌙',
        upright: {
            keywords: ['Intuisi', 'Misteri', 'Kebijaksanaan batin', 'Ketidaksadaran', 'Rahasia'],
            meaning: 'Dengarkan suara hatimu. Kebijaksanaan tersembunyi, pengetahuan intuitif. Ada hal yang belum terungkap, percaya pada perasaanmu.',
            love: 'Hubungan yang dalam dan misterius. Perlu mendengarkan intuisi tentang pasangan.',
            career: 'Pengetahuan tersembunyi akan terungkap. Percaya pada gut feeling.',
            advice: 'Diam sejenak dan dengarkan intuisimu. Jawabannya ada di dalam dirimu.'
        },
        reversed: {
            keywords: ['Rahasia', 'Informasi tersembunyi', 'Mengabaikan intuisi', 'Kebingungan'],
            meaning: 'Mengabaikan intuisi, rahasia yang merusak. Informasi penting disembunyikan. Perlu lebih memperhatikan tanda-tanda.',
            love: 'Ada rahasia dalam hubungan, kurang komunikasi emosional.',
            career: 'Informasi penting tidak diungkapkan. Jangan mengabaikan firasat.',
            advice: 'Perhatikan apa yang tidak dikatakan. Ada yang tersembunyi.'
        }
    },
    {
        id: 3,
        name: 'The Empress',
        nameId: 'Sang Permaisuri',
        emoji: '👑',
        upright: {
            keywords: ['Kesuburan', 'Kelimpahan', 'Keindahan', 'Alam', 'Pengasuhan'],
            meaning: 'Kelimpahan dan kemakmuran datang. Kreativitas mengalir, waktu untuk menciptakan dan memelihara. Hubungan dengan alam dan sensualitas.',
            love: 'Hubungan yang subur dan penuh kasih. Mungkin pertanda kehamilan atau pertumbuhan hubungan.',
            career: 'Proyek kreatif akan sukses, kelimpahan finansial.',
            advice: 'Nikmati keindahan hidup, rawat dirimu dan hubunganmu.'
        },
        reversed: {
            keywords: ['Blokade kreatif', 'Ketergantungan', 'Mengabaikan diri', 'Kurang percaya diri'],
            meaning: 'Kreativitas terblokir, mengabaikan kebutuhan diri sendiri. Terlalu bergantung pada orang lain atau kurang self-care.',
            love: 'Masalah kesuburan, hubungan yang tidak seimbang.',
            career: 'Proyek kreatif terhambat, kurang apresiasi.',
            advice: 'Rawat dirimu dulu sebelum merawat orang lain.'
        }
    },
    {
        id: 4,
        name: 'The Emperor',
        nameId: 'Sang Kaisar',
        emoji: '🏛️',
        upright: {
            keywords: ['Otoritas', 'Struktur', 'Stabilitas', 'Kepemimpinan', 'Figur ayah'],
            meaning: 'Struktur dan disiplin membawa kesuksesan. Otoritas yang bijaksana, kepemimpinan yang kuat. Waktu untuk mengambil kendali.',
            love: 'Hubungan yang stabil dan komitmen kuat. Mungkin bertemu sosok yang protektif.',
            career: 'Kesuksesan melalui disiplin, posisi kepemimpinan.',
            advice: 'Ambil kendali atas hidupmu dengan disiplin dan tanggung jawab.'
        },
        reversed: {
            keywords: ['Dominasi', 'Kekakuan', 'Kurang disiplin', 'Penyalahgunaan kekuasaan'],
            meaning: 'Kontrol berlebihan atau justru kehilangan kontrol. Otoritas yang kejam, kekakuan. Masalah dengan figur otoritas.',
            love: 'Hubungan yang terlalu mengontrol atau tidak stabil.',
            career: 'Bos yang tiran, kurang struktur dalam pekerjaan.',
            advice: 'Temukan keseimbangan antara kontrol dan fleksibilitas.'
        }
    },
    {
        id: 5,
        name: 'The Hierophant',
        nameId: 'Sang Hierofan',
        emoji: '⛪',
        upright: {
            keywords: ['Tradisi', 'Institusi', 'Kepercayaan', 'Pembelajaran', 'Mentor'],
            meaning: 'Ikuti jalan tradisional, belajar dari yang lebih bijak. Institusi dan kepercayaan memberikan panduan. Waktu untuk belajar dari mentor.',
            love: 'Hubungan tradisional, mungkin pernikahan atau komitmen formal.',
            career: 'Belajar dari mentor, mengikuti prosedur yang sudah teruji.',
            advice: 'Hormati tradisi dan belajarlah dari orang yang lebih berpengalaman.'
        },
        reversed: {
            keywords: ['Pemberontakan', 'Non-konformitas', 'Pendekatan baru', 'Mengabaikan tradisi'],
            meaning: 'Menolak tradisi, mencari jalan sendiri. Mempertanyakan otoritas dan kepercayaan lama.',
            love: 'Hubungan non-tradisional, menolak norma sosial.',
            career: 'Memilih jalan karir yang tidak konvensional.',
            advice: 'Tidak apa-apa mencari jalanmu sendiri, tapi hargai kebijaksanaan masa lalu.'
        }
    },
    {
        id: 6,
        name: 'The Lovers',
        nameId: 'Para Kekasih',
        emoji: '💕',
        upright: {
            keywords: ['Cinta', 'Harmoni', 'Pilihan', 'Hubungan', 'Keselarasan nilai'],
            meaning: 'Cinta sejati dan keharmonisan. Pilihan penting dalam hubungan. Keselarasan nilai dan keputusan dari hati.',
            love: 'Hubungan yang harmonis dan penuh cinta. Soulmate atau pilihan penting dalam percintaan.',
            career: 'Kemitraan yang sukses, keputusan karir yang selaras dengan nilai.',
            advice: 'Ikuti hatimu dalam membuat pilihan, selaraskan dengan nilaimu.'
        },
        reversed: {
            keywords: ['Ketidakharmonisan', 'Ketidakseimbangan', 'Pilihan buruk', 'Konflik nilai'],
            meaning: 'Ketidakharmonisan dalam hubungan, pilihan yang sulit. Konflik antara kepala dan hati.',
            love: 'Masalah hubungan, ketidakcocokan nilai.',
            career: 'Konflik dengan rekan kerja, keputusan yang tidak selaras.',
            advice: 'Evaluasi kembali pilihanmu, pastikan selaras dengan nilai sejatimu.'
        }
    },
    {
        id: 7,
        name: 'The Chariot',
        nameId: 'Kereta Perang',
        emoji: '🏇',
        upright: {
            keywords: ['Kemenangan', 'Tekad', 'Kontrol', 'Aksi', 'Determinasi'],
            meaning: 'Kemenangan melalui tekad dan kerja keras. Kontrol diri dan fokus membawa sukses. Bergerak maju dengan percaya diri.',
            love: 'Mengejar cinta dengan determinasi, hubungan yang maju.',
            career: 'Kesuksesan melalui kerja keras, promosi atau pencapaian.',
            advice: 'Tetap fokus pada tujuanmu, kemenangan akan datang.'
        },
        reversed: {
            keywords: ['Kurang kontrol', 'Agresi', 'Hambatan', 'Kehilangan arah'],
            meaning: 'Kehilangan kontrol atau arah. Terlalu agresif atau justru tidak ada drive. Hambatan dalam perjalanan.',
            love: 'Hubungan yang kehilangan arah, terlalu mengontrol.',
            career: 'Proyek terhambat, kurang fokus.',
            advice: 'Rebut kembali kontrolmu, tapi jangan memaksakan kehendak.'
        }
    },
    {
        id: 8,
        name: 'Strength',
        nameId: 'Kekuatan',
        emoji: '🦁',
        upright: {
            keywords: ['Keberanian', 'Kekuatan batin', 'Kesabaran', 'Pengendalian diri', 'Kasih sayang'],
            meaning: 'Kekuatan sejati datang dari dalam. Keberanian dan kasih sayang berjalan bersama. Kendalikan dorongan dengan kelembutan.',
            love: 'Hubungan yang kuat melalui kesabaran dan pengertian.',
            career: 'Mengatasi tantangan dengan grace, kepemimpinan yang lemah lembut tapi kuat.',
            advice: 'Gunakan kelembutanmu sebagai kekuatan, bukan kekerasan.'
        },
        reversed: {
            keywords: ['Keraguan diri', 'Kelemahan', 'Kurang kendali', 'Menggunakan kekuatan salah'],
            meaning: 'Keraguan diri, merasa lemah. Mungkin menggunakan kekuatan secara kasar atau justru takut menggunakannya.',
            love: 'Kurang percaya diri dalam hubungan, mungkin ada penindasan.',
            career: 'Keraguan diri menghambat kemajuan.',
            advice: 'Temukan kembali kekuatan batinmu, percaya pada dirimu.'
        }
    },
    {
        id: 9,
        name: 'The Hermit',
        nameId: 'Sang Pertapa',
        emoji: '🔦',
        upright: {
            keywords: ['Introspeksi', 'Pencarian dalam', 'Kebijaksanaan', 'Kesendirian', 'Bimbingan'],
            meaning: 'Waktu untuk menyendiri dan merefleksi. Mencari kebijaksanaan dari dalam. Pencerahan melalui introspeksi.',
            love: 'Waktu untuk memahami apa yang kamu inginkan dalam hubungan.',
            career: 'Refleksi karir, mungkin perlu break untuk menemukan arah.',
            advice: 'Ambil waktu untuk dirimu sendiri, jawaban akan datang dalam ketenangan.'
        },
        reversed: {
            keywords: ['Isolasi', 'Kesepian', 'Menolak introspeksi', 'Terlalu tertutup'],
            meaning: 'Isolasi yang tidak sehat, menolak untuk merefleksi. Kesepian atau justru takut sendirian.',
            love: 'Menarik diri dari hubungan, takut intimasi.',
            career: 'Tidak mau belajar dari pengalaman, terisolasi dari rekan.',
            advice: 'Kesendirian sehat berbeda dengan isolasi. Temukan keseimbangan.'
        }
    },
    {
        id: 10,
        name: 'Wheel of Fortune',
        nameId: 'Roda Keberuntungan',
        emoji: '🎡',
        upright: {
            keywords: ['Nasib', 'Perubahan', 'Siklus', 'Keberuntungan', 'Karma'],
            meaning: 'Perubahan besar sedang datang. Roda kehidupan berputar, keberuntungan berubah. Terima siklus alamiah.',
            love: 'Perubahan dalam hubungan, mungkin bertemu seseorang secara tak terduga.',
            career: 'Peluang tak terduga, perubahan karir yang menguntungkan.',
            advice: 'Terima perubahan dengan tangan terbuka, ini bagian dari siklus kehidupan.'
        },
        reversed: {
            keywords: ['Nasib buruk', 'Resistensi terhadap perubahan', 'Siklus negatif', 'Kurang kontrol'],
            meaning: 'Merasa tidak beruntung, menolak perubahan yang perlu. Terjebak dalam siklus negatif.',
            love: 'Pola hubungan yang berulang dan tidak sehat.',
            career: 'Nasib buruk dalam karir, perlu memutus siklus negatif.',
            advice: 'Jangan melawan arus, tapi juga jangan pasrah. Ambil kendali yang bisa kamu kontrol.'
        }
    },
    {
        id: 11,
        name: 'Justice',
        nameId: 'Keadilan',
        emoji: '⚖️',
        upright: {
            keywords: ['Keadilan', 'Kebenaran', 'Hukum', 'Keseimbangan', 'Tanggung jawab'],
            meaning: 'Keadilan akan ditegakkan. Kebenaran terungkap, keputusan yang adil. Tanggung jawab atas tindakan.',
            love: 'Keseimbangan dalam hubungan, keputusan penting yang adil.',
            career: 'Masalah hukum atau kontrak terselesaikan dengan adil.',
            advice: 'Bersikaplah adil dan jujur, karma akan membalas.'
        },
        reversed: {
            keywords: ['Ketidakadilan', 'Ketidakjujuran', 'Menghindari tanggung jawab', 'Bias'],
            meaning: 'Ketidakadilan, keputusan yang tidak fair. Menghindari konsekuensi atau tidak bertanggung jawab.',
            love: 'Hubungan yang tidak seimbang atau tidak adil.',
            career: 'Keputusan tidak adil, masalah hukum.',
            advice: 'Evaluasi apakah kamu bersikap adil pada diri sendiri dan orang lain.'
        }
    },
    {
        id: 12,
        name: 'The Hanged Man',
        nameId: 'Orang yang Digantung',
        emoji: '🙃',
        upright: {
            keywords: ['Pengorbanan', 'Perspektif baru', 'Menyerah', 'Kebuntuan', 'Kesabaran'],
            meaning: 'Waktu untuk berhenti dan melihat dari sudut berbeda. Pengorbanan untuk tujuan lebih tinggi. Kesabaran dalam ketidakpastian.',
            love: 'Melihat hubungan dari perspektif baru, mungkin perlu pengorbanan.',
            career: 'Proyek tertunda tapi untuk kebaikan, lihat dari sudut berbeda.',
            advice: 'Kadang berhenti adalah langkah maju. Lihat situasi dari perspektif baru.'
        },
        reversed: {
            keywords: ['Menolak berubah', 'Ketidaksabaran', 'Pengorbanan sia-sia', 'Terjebak'],
            meaning: 'Menolak melihat hal berbeda, ketidaksabaran. Pengorbanan yang tidak perlu atau merasa terjebak.',
            love: 'Terjebak dalam hubungan, tidak mau melihat masalah.',
            career: 'Menolak adaptasi, frustasi karena keterlambatan.',
            advice: 'Jangan keras kepala. Cobalah melihat situasi dari sisi lain.'
        }
    },
    {
        id: 13,
        name: 'Death',
        nameId: 'Kematian',
        emoji: '💀',
        upright: {
            keywords: ['Transformasi', 'Akhir', 'Perubahan', 'Transisi', 'Pelepasan'],
            meaning: 'Akhir dari sesuatu untuk awal yang baru. Transformasi besar, lepaskan yang lama. BUKAN kematian literal, tapi perubahan mendalam.',
            love: 'Transformasi hubungan, akhir dari fase untuk memulai yang baru.',
            career: 'Perubahan karir besar, meninggalkan pekerjaan lama.',
            advice: 'Lepaskan apa yang sudah tidak melayanimu. Transformasi adalah hadiah.'
        },
        reversed: {
            keywords: ['Menolak perubahan', 'Takut berakhir', 'Stagnan', 'Menahan yang lama'],
            meaning: 'Menolak perubahan yang perlu, takut pada akhir. Terjebak karena tidak mau melepaskan.',
            love: 'Bertahan di hubungan yang sudah mati, takut sendirian.',
            career: 'Menolak perubahan karir yang diperlukan.',
            advice: 'Apa yang kamu takuti lepaskan? Perubahan adalah bagian dari kehidupan.'
        }
    },
    {
        id: 14,
        name: 'Temperance',
        nameId: 'Kesederhanaan',
        emoji: '⚗️',
        upright: {
            keywords: ['Keseimbangan', 'Kesabaran', 'Moderasi', 'Harmoni', 'Integrasi'],
            meaning: 'Keseimbangan dan harmoni. Kesabaran membawa hasil. Mengintegrasikan berbagai aspek kehidupan.',
            love: 'Hubungan yang seimbang dan harmonis.',
            career: 'Work-life balance, kesabaran dalam proyek.',
            advice: 'Temukan jalan tengah, keseimbangan adalah kunci.'
        },
        reversed: {
            keywords: ['Ketidakseimbangan', 'Ekstrem', 'Ketidaksabaran', 'Tidak harmonis'],
            meaning: 'Kehilangan keseimbangan, terlalu ekstrem. Ketidaksabaran dan kurang harmoni.',
            love: 'Hubungan tidak seimbang, salah satu pihak memberi terlalu banyak.',
            career: 'Work-life tidak seimbang, burnout.',
            advice: 'Kembalilah ke keseimbangan, hindari ekstrem.'
        }
    },
    {
        id: 15,
        name: 'The Devil',
        nameId: 'Iblis',
        emoji: '😈',
        upright: {
            keywords: ['Belenggu', 'Godaan', 'Ketergantungan', 'Materialisme', 'Shadow self'],
            meaning: 'Terikat oleh hal-hal material atau kecanduan. Belenggu yang sebenarnya bisa dilepas. Hadapi sisi gelapmu.',
            love: 'Hubungan yang toxic atau obsesif.',
            career: 'Terlalu fokus pada uang, mungkin pekerjaan yang tidak etis.',
            advice: 'Sadari apa yang membelenggumu. Kamu punya kekuatan untuk membebaskan diri.'
        },
        reversed: {
            keywords: ['Pembebasan', 'Melepas kecanduan', 'Menghadapi ketakutan', 'Pencerahan'],
            meaning: 'Membebaskan diri dari belenggu, mengatasi kecanduan. Menghadapi sisi gelap dan mengatasinya.',
            love: 'Keluar dari hubungan toxic, membebaskan diri.',
            career: 'Meninggalkan situasi kerja yang tidak sehat.',
            advice: 'Kamu sedang dalam proses pembebasan. Terus maju!'
        }
    },
    {
        id: 16,
        name: 'The Tower',
        nameId: 'Menara',
        emoji: '🗼',
        upright: {
            keywords: ['Kehancuran', 'Perubahan mendadak', 'Wahyu', 'Kekacauan', 'Pembebasan'],
            meaning: 'Perubahan mendadak dan dramatis. Fondasi yang rapuh runtuh. Menyakitkan tapi diperlukan untuk membangun kembali.',
            love: 'Putus hubungan mendadak, wahyu yang mengubah segalanya.',
            career: 'Kehilangan pekerjaan mendadak, perubahan dramatis.',
            advice: 'Terima kehancuran ini sebagai pembebasan. Dari reruntuhan akan muncul yang lebih kuat.'
        },
        reversed: {
            keywords: ['Menghindari bencana', 'Menunda kehancuran', 'Perubahan internal', 'Ketakutan'],
            meaning: 'Mencoba menghindari perubahan yang tak terhindarkan. Atau sudah melewati masa terburuk.',
            love: 'Mencoba menyelamatkan hubungan yang sudah rusak.',
            career: 'Menunda perubahan yang diperlukan.',
            advice: 'Jangan terlalu takut pada perubahan. Kadang lebih baik membiarkan yang rapuh runtuh.'
        }
    },
    {
        id: 17,
        name: 'The Star',
        nameId: 'Bintang',
        emoji: '⭐',
        upright: {
            keywords: ['Harapan', 'Inspirasi', 'Penyembuhan', 'Ketenangan', 'Pembaruan'],
            meaning: 'Harapan dan inspirasi setelah masa sulit. Penyembuhan dan pembaruan. Optimisme untuk masa depan.',
            love: 'Hubungan yang menyembuhkan, harapan untuk cinta.',
            career: 'Inspirasi baru, arah yang menjanjikan.',
            advice: 'Percayalah, hal-hal baik sedang datang. Kamu sudah melewati yang terburuk.'
        },
        reversed: {
            keywords: ['Kehilangan harapan', 'Pesimis', 'Disconnected', 'Kekecewaan'],
            meaning: 'Kehilangan harapan dan kepercayaan. Merasa disconnected dari diri sendiri.',
            love: 'Kekecewaan dalam cinta, kehilangan harapan.',
            career: 'Kehilangan inspirasi, tidak ada arah.',
            advice: 'Temukan kembali harapanmu. Cahaya masih ada meski kamu tidak melihatnya sekarang.'
        }
    },
    {
        id: 18,
        name: 'The Moon',
        nameId: 'Bulan',
        emoji: '🌕',
        upright: {
            keywords: ['Ilusi', 'Intuisi', 'Ketakutan', 'Ketidakpastian', 'Mimpi'],
            meaning: 'Tidak semua seperti yang terlihat. Dengarkan intuisi di tengah ketidakpastian. Hadapi ketakutan bawah sadar.',
            love: 'Ketidakjelasan dalam hubungan, perlu mendengarkan intuisi.',
            career: 'Situasi tidak jelas, hati-hati dengan penipuan.',
            advice: 'Jangan percaya semua yang kamu lihat. Dengarkan intuisimu.'
        },
        reversed: {
            keywords: ['Kejelasan', 'Kebohongan terungkap', 'Mengatasi ketakutan', 'Kebenaran'],
            meaning: 'Kebenaran mulai terungkap, kebingungan berkurang. Mengatasi ketakutan dan ilusi.',
            love: 'Kejelasan dalam hubungan, kebenaran terungkap.',
            career: 'Situasi menjadi lebih jelas, penipuan terungkap.',
            advice: 'Kebenaran sedang terungkap. Terima dengan grace.'
        }
    },
    {
        id: 19,
        name: 'The Sun',
        nameId: 'Matahari',
        emoji: '☀️',
        upright: {
            keywords: ['Kebahagiaan', 'Kesuksesan', 'Vitalitas', 'Optimisme', 'Kegembiraan'],
            meaning: 'Kebahagiaan dan kesuksesan datang. Vitalitas, energi positif, dan kegembiraan. Masa-masa baik!',
            love: 'Hubungan yang bahagia dan cerah, mungkin kehamilan.',
            career: 'Kesuksesan besar, pengakuan, kebahagiaan dalam pekerjaan.',
            advice: 'Nikmati momen ini! Kamu layak mendapatkan kebahagiaan ini.'
        },
        reversed: {
            keywords: ['Kebahagiaan tertunda', 'Pesimis berlebihan', 'Kurang semangat', 'Kesuksesan terhambat'],
            meaning: 'Kebahagiaan tertunda tapi akan datang. Mungkin terlalu pesimis atau kurang menikmati hidup.',
            love: 'Kebahagiaan hubungan terhambat sementara.',
            career: 'Kesuksesan tertunda, perlu lebih optimis.',
            advice: 'Kebahagiaan sedang menuju padamu, jangan menyerah.'
        }
    },
    {
        id: 20,
        name: 'Judgement',
        nameId: 'Pengadilan',
        emoji: '📯',
        upright: {
            keywords: ['Kebangkitan', 'Refleksi', 'Panggilan', 'Evaluasi', 'Pembaruan'],
            meaning: 'Waktu evaluasi dan kebangkitan. Panggilan untuk tujuan yang lebih tinggi. Lepaskan masa lalu dan bangkit.',
            love: 'Evaluasi hubungan, memutuskan apakah akan melanjutkan.',
            career: 'Dipanggil untuk tujuan karir yang lebih tinggi.',
            advice: 'Evaluasi hidupmu dengan jujur. Ini waktu untuk kebangkitan.'
        },
        reversed: {
            keywords: ['Keraguan diri', 'Menolak panggilan', 'Self-criticism', 'Tidak belajar dari masa lalu'],
            meaning: 'Keraguan diri, tidak mau mendengar panggilan. Terlalu keras pada diri sendiri.',
            love: 'Tidak belajar dari hubungan masa lalu.',
            career: 'Mengabaikan panggilan karir sejati.',
            advice: 'Jangan terlalu keras pada dirimu. Dengarkan panggilan hatimu.'
        }
    },
    {
        id: 21,
        name: 'The World',
        nameId: 'Dunia',
        emoji: '🌍',
        upright: {
            keywords: ['Penyelesaian', 'Pencapaian', 'Perjalanan', 'Integrasi', 'Kepuasan'],
            meaning: 'Satu siklus selesai dengan sempurna. Pencapaian besar, kepuasan total. Kamu sudah sampai di tujuan!',
            love: 'Hubungan mencapai level commitment yang dalam.',
            career: 'Pencapaian karir besar, proyek selesai dengan sukses.',
            advice: 'Rayakan pencapaianmu! Kamu sudah menyelesaikan perjalanan ini.'
        },
        reversed: {
            keywords: ['Belum selesai', 'Kurang closure', 'Tertunda', 'Pencapaian parsial'],
            meaning: 'Hampir sampai tapi belum selesai. Kurang closure atau kepuasan.',
            love: 'Hubungan belum mencapai potensi penuhnya.',
            career: 'Proyek belum selesai, perlu langkah terakhir.',
            advice: 'Kamu hampir di sana. Selesaikan apa yang perlu diselesaikan.'
        }
    }
];

/**
 * MINOR ARCANA - 56 Cards
 * Four suits: Wands (Api), Cups (Air), Swords (Angin), Pentacles (Tanah)
 */
const SUITS = {
    wands: {
        name: 'Wands',
        nameId: 'Tongkat',
        element: 'Api',
        emoji: '🪄',
        domain: 'Aksi, Kreativitas, Semangat, Energi',
        cards: generateSuitCards('wands')
    },
    cups: {
        name: 'Cups',
        nameId: 'Cawan',
        element: 'Air',
        emoji: '🏆',
        domain: 'Emosi, Hubungan, Perasaan, Intuisi',
        cards: generateSuitCards('cups')
    },
    swords: {
        name: 'Swords',
        nameId: 'Pedang',
        element: 'Angin',
        emoji: '⚔️',
        domain: 'Pikiran, Komunikasi, Konflik, Kebenaran',
        cards: generateSuitCards('swords')
    },
    pentacles: {
        name: 'Pentacles',
        nameId: 'Koin',
        element: 'Tanah',
        emoji: '🪙',
        domain: 'Material, Karir, Uang, Kesehatan',
        cards: generateSuitCards('pentacles')
    }
};

/**
 * Generate cards for each suit (Ace through King)
 */
function generateSuitCards(suit) {
    const suitMeanings = getSuitMeanings(suit);
    return suitMeanings;
}

/**
 * Complete meanings for all Minor Arcana cards
 */
function getSuitMeanings(suit) {
    const meanings = {
        wands: [
            { rank: 'Ace', upright: 'Inspirasi, ide baru, potensi kreatif, awal yang berapi-api', reversed: 'Delay, kurang motivasi, ide yang tidak terwujud' },
            { rank: 'Two', upright: 'Perencanaan, keputusan, menatap masa depan', reversed: 'Takut mengambil keputusan, planning yang buruk' },
            { rank: 'Three', upright: 'Ekspansi, visi jangka panjang, kapal berlayar', reversed: 'Hambatan, delay dalam rencana' },
            { rank: 'Four', upright: 'Perayaan, harmoni, homecoming, pencapaian', reversed: 'Kurang stabilitas, transisi yang tidak nyaman' },
            { rank: 'Five', upright: 'Kompetisi, konflik, ego clash, persaingan', reversed: 'Menghindari konflik, resolusi' },
            { rank: 'Six', upright: 'Kemenangan, pengakuan publik, kemajuan', reversed: 'Kurang pengakuan, ego, arogan' },
            { rank: 'Seven', upright: 'Pertahanan, mempertahankan posisi, tantangan', reversed: 'Kewalahan, menyerah, terlalu defensif' },
            { rank: 'Eight', upright: 'Pergerakan cepat, aksi, perjalanan udara, momentum', reversed: 'Delay, frustasi, resistensi' },
            { rank: 'Nine', upright: 'Ketahanan, kegigihan, hampir sampai, boundaries', reversed: 'Kewalahan, burnout, paranoid' },
            { rank: 'Ten', upright: 'Beban berlebihan, tanggung jawab besar, kewalahan', reversed: 'Delegasi, melepas beban, burnout' },
            { rank: 'Page', upright: 'Eksplorasi, penemuan, antusias, pesan', reversed: 'Setback, kurang ide, bad news' },
            { rank: 'Knight', upright: 'Aksi, petualangan, energi, impulsif', reversed: 'Terlalu impulsif, delay, frustrasi' },
            { rank: 'Queen', upright: 'Keberanian, determinasi, independen, karismatik', reversed: 'Demanding, manipulatif, jealous' },
            { rank: 'King', upright: 'Visi, pemimpin, entrepreneur, bold', reversed: 'Impulsif, tirani, high expectations' }
        ],
        cups: [
            { rank: 'Ace', upright: 'Cinta baru, emosi mendalam, intuisi, spiritual', reversed: 'Emosi tertekan, blokade emosional' },
            { rank: 'Two', upright: 'Kemitraan, cinta, keharmonisan, koneksi', reversed: 'Ketidakseimbangan, kurang komunikasi' },
            { rank: 'Three', upright: 'Perayaan, persahabatan, kreativitas, komunitas', reversed: 'Overindulgence, gossip, isolasi' },
            { rank: 'Four', upright: 'Apatis, kontemplasi, disconnected, bosan', reversed: 'Motivasi baru, awareness, aksi' },
            { rank: 'Five', upright: 'Kehilangan, duka, penyesalan, fokus negatif', reversed: 'Penerimaan, move on, forgiveness' },
            { rank: 'Six', upright: 'Nostalgia, kenangan masa kecil, innocence', reversed: 'Terjebak masa lalu, unrealistic' },
            { rank: 'Seven', upright: 'Pilihan, ilusi, wishful thinking, fantasy', reversed: 'Kejelasan, pilihan yang realistis' },
            { rank: 'Eight', upright: 'Meninggalkan, withdrawal, mencari kebenaran', reversed: 'Takut meninggalkan, stagnasi' },
            { rank: 'Nine', upright: 'Kepuasan, wish granted, kenikmatan', reversed: 'Ketidakpuasan, materialisme' },
            { rank: 'Ten', upright: 'Kebahagiaan keluarga, harmoni, fulfillment', reversed: 'Disfungsi, nilai yang tidak selaras' },
            { rank: 'Page', upright: 'Pesan cinta, kreativitas, intuisi', reversed: 'Imaturitas emosional, blokade kreatif' },
            { rank: 'Knight', upright: 'Romantis, charm, mengikuti hati, idealis', reversed: 'Moody, unrealistic, jealous' },
            { rank: 'Queen', upright: 'Kasih sayang, care, empati, intuisi', reversed: 'Martyr, codependent, emosi tidak stabil' },
            { rank: 'King', upright: 'Emotional balance, diplomasi, bijak', reversed: 'Manipulatif, moody, emosi tertekan' }
        ],
        swords: [
            { rank: 'Ace', upright: 'Kejelasan, kebenaran, breakthrough, ide', reversed: 'Kebingungan, chaos, misinformasi' },
            { rank: 'Two', upright: 'Keputusan sulit, stalemate, avoidance', reversed: 'Keputusan dibuat, overwhelm, lies' },
            { rank: 'Three', upright: 'Sakit hati, kesedihan, patah hati, grief', reversed: 'Recovery, forgiveness, move on' },
            { rank: 'Four', upright: 'Istirahat, pemulihan, kontemplasi, retreat', reversed: 'Burnout, restless, isolation' },
            { rank: 'Five', upright: 'Konflik, kekalahan, kehilangan, ego', reversed: 'Rekonsiliasi, move on, letting go' },
            { rank: 'Six', upright: 'Transisi, perubahan, meninggalkan kesulitan', reversed: 'Terjebak, unfinished business' },
            { rank: 'Seven', upright: 'Strategi, taktik, sneaky, tidak langsung', reversed: 'Tertangkap, confession, conscience' },
            { rank: 'Eight', upright: 'Terjebak, victim mentality, pembatasan', reversed: 'Pembebasan, empowerment, new perspective' },
            { rank: 'Nine', upright: 'Kecemasan, nightmare, worry, despair', reversed: 'Harapan, bantuan datang, recovery' },
            { rank: 'Ten', upright: 'Akhir yang menyakitkan, betrayal, rock bottom', reversed: 'Recovery, survival, resilience' },
            { rank: 'Page', upright: 'Ide, curiosity, komunikasi, waspada', reversed: 'Gossip, hasty, scattered mind' },
            { rank: 'Knight', upright: 'Ambisius, action-oriented, langsung, tegas', reversed: 'Impulsif, aggresif, tanpa pikir' },
            { rank: 'Queen', upright: 'Independen, tegas, perceptive, langsung', reversed: 'Cold, cruel, bitter' },
            { rank: 'King', upright: 'Logis, authoritative, fair, intellectual', reversed: 'Manipulatif, dictator, harsh' }
        ],
        pentacles: [
            { rank: 'Ace', upright: 'Peluang, kemakmuran, manifestasi, awal material', reversed: 'Peluang terlewat, kurang planning' },
            { rank: 'Two', upright: 'Multitasking, balance, adaptasi, prioritas', reversed: 'Overwhelm, disorganized, reprioritize' },
            { rank: 'Three', upright: 'Teamwork, kolaborasi, belajar, skill', reversed: 'Kurang teamwork, mediokritas' },
            { rank: 'Four', upright: 'Keamanan, konservasi, kontrol, menabung', reversed: 'Pelit, materialistis, takut kehilangan' },
            { rank: 'Five', upright: 'Kesulitan finansial, kehilangan, isolation', reversed: 'Recovery, spiritual wealth, bantuan' },
            { rank: 'Six', upright: 'Kemurahan hati, charity, memberi-menerima', reversed: 'Utang, selfishness, strings attached' },
            { rank: 'Seven', upright: 'Investasi jangka panjang, kesabaran, hasil', reversed: 'Impatience, bad investments' },
            { rank: 'Eight', upright: 'Dedikasi, craftsmanship, fokus, repetisi', reversed: 'Perfectionism, kurang fokus' },
            { rank: 'Nine', upright: 'Kemakmuran, luxury, self-sufficiency, sukses', reversed: 'Financial setback, hustle culture' },
            { rank: 'Ten', upright: 'Kekayaan, warisan, keluarga, legacy', reversed: 'Financial failure, loss, instability' },
            { rank: 'Page', upright: 'Manifestasi, peluang finansial, skill baru', reversed: 'Kurang fokus, bad news finansial' },
            { rank: 'Knight', upright: 'Hard work, routine, konservatif, reliable', reversed: 'Workaholic, bored, stagnant' },
            { rank: 'Queen', upright: 'Nurturing, practical, provider, abundance', reversed: 'Self-care kurang, workaholic' },
            { rank: 'King', upright: 'Wealth, bisnis sukses, security, discipline', reversed: 'Materialistis, korup, bad investments' }
        ]
    };
    
    return meanings[suit].map((card, idx) => ({
        rank: card.rank,
        number: idx + 1,
        upright: card.upright,
        reversed: card.reversed
    }));
}

/**
 * Get all 78 cards combined
 */
const getAllCards = () => {
    const allCards = [];
    
    // Add Major Arcana
    MAJOR_ARCANA.forEach(card => {
        allCards.push({
            type: 'major',
            ...card
        });
    });
    
    // Add Minor Arcana
    Object.entries(SUITS).forEach(([suitKey, suit]) => {
        suit.cards.forEach(card => {
            allCards.push({
                type: 'minor',
                suit: suitKey,
                suitName: suit.name,
                suitNameId: suit.nameId,
                suitEmoji: suit.emoji,
                element: suit.element,
                domain: suit.domain,
                ...card,
                name: `${card.rank} of ${suit.name}`,
                nameId: `${card.rank} ${suit.nameId}`
            });
        });
    });
    
    return allCards;
};

/**
 * Draw random cards from deck
 * 
 * @param {number} count - Number of cards to draw
 * @param {boolean} allowReversed - Whether to include reversed cards
 * @returns {Array} - Drawn cards with reversed state
 */
const drawCards = (count = 1, allowReversed = true) => {
    const deck = getAllCards();
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const drawn = shuffled.slice(0, count);
    
    return drawn.map(card => ({
        ...card,
        isReversed: allowReversed ? Math.random() > 0.5 : false
    }));
};

/**
 * Tarot Spreads (layouts)
 */
const SPREADS = {
    single: {
        name: 'Single Card',
        nameId: 'Satu Kartu',
        description: 'Satu kartu untuk insight cepat',
        positions: ['Insight/Pesan']
    },
    threeCard: {
        name: 'Three Card Spread',
        nameId: 'Tiga Kartu',
        description: 'Past - Present - Future',
        positions: ['Masa Lalu', 'Masa Kini', 'Masa Depan']
    },
    loveSpread: {
        name: 'Love Spread',
        nameId: 'Spread Cinta',
        description: 'Untuk pertanyaan cinta dan hubungan',
        positions: ['Kamu', 'Dia', 'Hubungan', 'Tantangan', 'Outcome']
    },
    celticCross: {
        name: 'Celtic Cross',
        nameId: 'Salib Celtic',
        description: 'Reading mendalam 10 kartu',
        positions: [
            'Situasi Saat Ini',
            'Tantangan',
            'Masa Lalu',
            'Masa Depan Dekat',
            'Tujuan/Aspirasi',
            'Fondasi',
            'Saran',
            'Pengaruh Eksternal',
            'Harapan/Ketakutan',
            'Outcome'
        ]
    },
    yesNo: {
        name: 'Yes/No',
        nameId: 'Ya/Tidak',
        description: 'Jawaban Ya atau Tidak',
        positions: ['Jawaban']
    }
};

/**
 * Format single card for display
 */
const formatCard = (card, position = null) => {
    const reversedText = card.isReversed ? ' (Terbalik)' : '';
    const emoji = card.type === 'major' ? card.emoji : card.suitEmoji;
    
    let text = '';
    
    if (position) {
        text += `📍 *${position}*\n`;
    }
    
    if (card.type === 'major') {
        text += `${emoji} *${card.name}*${reversedText}\n`;
        text += `🇮🇩 ${card.nameId}\n\n`;
        
        const meaning = card.isReversed ? card.reversed : card.upright;
        text += `📖 *Keywords:* ${meaning.keywords.join(', ')}\n\n`;
        text += `💭 *Makna:*\n${meaning.meaning}\n\n`;
        text += `💕 *Cinta:* ${meaning.love}\n`;
        text += `💼 *Karir:* ${meaning.career}\n`;
        text += `💡 *Saran:* ${meaning.advice}`;
    } else {
        text += `${emoji} *${card.name}*${reversedText}\n`;
        text += `🇮🇩 ${card.nameId}\n`;
        text += `🔥 Element: ${card.element} | Domain: ${card.domain}\n\n`;
        
        const meaning = card.isReversed ? card.reversed : card.upright;
        text += `💭 *Makna:* ${meaning}`;
    }
    
    return text;
};

/**
 * Perform a tarot reading with AI interpretation
 */
const performReading = async (spreadType, question = '', conversationHistory = []) => {
    const spread = SPREADS[spreadType] || SPREADS.single;
    const cards = drawCards(spread.positions.length);
    
    // Format cards for display
    let readingText = `🔮 *TAROT READING*\n`;
    readingText += `📜 *Spread:* ${spread.nameId}\n`;
    if (question) {
        readingText += `❓ *Pertanyaan:* ${question}\n`;
    }
    readingText += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    cards.forEach((card, idx) => {
        readingText += formatCard(card, spread.positions[idx]);
        readingText += '\n\n━━━━━━━━━━━━━━━━━━━━━\n\n';
    });
    
    // Get AI interpretation
    const interpretation = await getAIInterpretation(cards, spread, question, conversationHistory);
    
    readingText += `🌟 *INTERPRETASI TAMA:*\n${interpretation}`;
    
    return {
        spread: spread,
        cards: cards,
        question: question,
        reading: readingText,
        interpretation: interpretation
    };
};

/**
 * Get AI interpretation of the reading
 */
const getAIInterpretation = async (cards, spread, question, conversationHistory) => {
    try {
        const cardsDescription = cards.map((card, idx) => {
            const pos = spread.positions[idx];
            const state = card.isReversed ? 'TERBALIK' : 'TEGAK';
            const meaning = card.type === 'major' 
                ? (card.isReversed ? card.reversed.meaning : card.upright.meaning)
                : (card.isReversed ? card.reversed : card.upright);
            return `${pos}: ${card.name} (${state}) - ${meaning}`;
        }).join('\n');
        
        const prompt = `Kamu adalah pembaca tarot yang bijak dengan gaya casual Tama.
        
Spread: ${spread.nameId}
Pertanyaan user: ${question || 'Tidak ada pertanyaan spesifik'}

Kartu yang keluar:
${cardsDescription}

Berikan interpretasi yang:
1. Menghubungkan semua kartu dalam satu narasi
2. Menjawab pertanyaan user jika ada
3. Memberikan saran praktis
4. Menggunakan gaya bahasa Tama (w, gw, bro, dll)
5. Empathetic tapi tetap fun

Interpretasi (dalam bahasa Indonesia casual):`;

        const response = await axios.post(
            `${COPILOT_API_URL}/v1/chat/completions`,
            {
                model: COPILOT_API_MODEL,
                messages: [
                    { role: 'system', content: 'Kamu adalah pembaca tarot yang bijak dengan gaya santai.' },
                    ...conversationHistory.slice(-3),
                    { role: 'user', content: prompt }
                ],
                temperature: 0.85,
                max_tokens: 600
            },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 45000
            }
        );
        
        if (response.data?.choices?.[0]?.message?.content) {
            return response.data.choices[0].message.content;
        }
        
        return 'hmm w lagi gabisa baca kartunya nih, coba lagi ya bro 🔮';
        
    } catch (error) {
        console.error('[Tarot] AI interpretation error:', error.message);
        return 'duh error pas interpretasi 😅 tapi kartu nya udah keluar, coba baca sendiri dulu ya';
    }
};

/**
 * Yes/No reading dengan kartu
 */
const yesNoReading = (question) => {
    const card = drawCards(1, true)[0];
    
    // Determine Yes/No based on card
    let answer = 'MUNGKIN';
    let confidence = 50;
    
    if (card.type === 'major') {
        // Major Arcana has stronger influence
        const positiveCards = [1, 3, 6, 9, 10, 11, 14, 17, 19, 21]; // Magician, Empress, Lovers, etc.
        const negativeCards = [13, 15, 16, 18]; // Death, Devil, Tower, Moon
        
        if (positiveCards.includes(card.id) && !card.isReversed) {
            answer = 'YA';
            confidence = 80;
        } else if (negativeCards.includes(card.id) || card.isReversed) {
            answer = 'TIDAK';
            confidence = 75;
        }
    } else {
        // Minor Arcana
        if (card.suit === 'cups' || card.suit === 'wands') {
            answer = card.isReversed ? 'TIDAK' : 'YA';
            confidence = 65;
        } else {
            answer = card.isReversed ? 'YA' : 'TIDAK';
            confidence = 60;
        }
    }
    
    return {
        question: question,
        card: card,
        answer: answer,
        confidence: confidence,
        text: formatYesNoReading(card, question, answer, confidence)
    };
};

/**
 * Format Yes/No reading
 */
const formatYesNoReading = (card, question, answer, confidence) => {
    const emoji = answer === 'YA' ? '✅' : (answer === 'TIDAK' ? '❌' : '🤔');
    const cardEmoji = card.type === 'major' ? card.emoji : card.suitEmoji;
    const reversedText = card.isReversed ? ' (Terbalik)' : '';
    
    let text = `🎴 *TAROT YES/NO*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `❓ *Pertanyaan:*\n${question}\n\n`;
    text += `${cardEmoji} *Kartu:* ${card.name}${reversedText}\n\n`;
    text += `${emoji} *JAWABAN: ${answer}*\n`;
    text += `📊 *Confidence:* ${confidence}%\n\n`;
    text += `💭 *Penjelasan:*\n`;
    
    if (card.type === 'major') {
        const meaning = card.isReversed ? card.reversed : card.upright;
        text += meaning.meaning;
    } else {
        text += card.isReversed ? card.reversed : card.upright;
    }
    
    return text;
};

/**
 * Check if message is asking for tarot
 */
const isTarotRequest = (message) => {
    const lowerMsg = message.toLowerCase();
    const tarotKeywords = [
        'tarot', 'kartu tarot', 'baca tarot', 'main tarot',
        'ramal', 'ramalan', 'nasib', 'fortune',
        'tarik kartu', 'ambil kartu'
    ];
    
    return tarotKeywords.some(keyword => lowerMsg.includes(keyword));
};

/**
 * Check if message is Yes/No question
 */
const isYesNoQuestion = (message) => {
    const lowerMsg = message.toLowerCase();
    const yesNoIndicators = [
        'apakah', 'apa dia', 'apa w', 'apa gw', 'apa aku',
        'apakah dia', 'apakah w', 'apakah gw', 'apakah aku',
        'kira-kira', 'kira2', 'mungkin ga', 'bisa ga',
        'bakal', 'akan', 'yes no', 'ya tidak'
    ];
    
    return yesNoIndicators.some(indicator => lowerMsg.includes(indicator));
};

/**
 * Get spread type from message
 */
const getSpreadFromMessage = (message) => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('celtic') || lowerMsg.includes('lengkap') || lowerMsg.includes('10 kartu')) {
        return 'celticCross';
    }
    if (lowerMsg.includes('cinta') || lowerMsg.includes('love') || lowerMsg.includes('hubungan') || lowerMsg.includes('pacar')) {
        return 'loveSpread';
    }
    if (lowerMsg.includes('3 kartu') || lowerMsg.includes('tiga kartu') || lowerMsg.includes('past present future')) {
        return 'threeCard';
    }
    if (lowerMsg.includes('yes') || lowerMsg.includes('no') || lowerMsg.includes('ya tidak')) {
        return 'yesNo';
    }
    
    return 'single';
};

module.exports = {
    MAJOR_ARCANA,
    SUITS,
    SPREADS,
    getAllCards,
    drawCards,
    formatCard,
    performReading,
    yesNoReading,
    isTarotRequest,
    isYesNoQuestion,
    getSpreadFromMessage,
    getAIInterpretation
};
