import {NativeModules} from 'react-native';
import {
  DEFAULT_APP_LOCALE,
  appLanguageOptions,
  createTranslator,
  getDeviceAppLocale,
  getLocalizedModeActionSummary,
  getLocalizedTimerModeMenuDescription,
  getMissingTranslationKeys,
  normalizeAppLocale,
  translationKeys,
} from '../localization';
import {getTimerModePreset} from '../../domain/timerMode';

type MutableNativeModules = typeof NativeModules & {
  I18nManager?: {localeIdentifier?: string};
  SettingsManager?: {
    settings?: {
      AppleLocale?: string;
      AppleLanguages?: string[];
    };
  };
};

const nativeModules = NativeModules as MutableNativeModules;
const originalI18nManager = nativeModules.I18nManager;
const originalSettingsManager = nativeModules.SettingsManager;

describe('localization', () => {
  afterEach(() => {
    if (originalI18nManager) {
      nativeModules.I18nManager = originalI18nManager;
    } else {
      delete nativeModules.I18nManager;
    }

    if (originalSettingsManager) {
      nativeModules.SettingsManager = originalSettingsManager;
    } else {
      delete nativeModules.SettingsManager;
    }
  });

  it('supports every requested market language option', () => {
    expect(appLanguageOptions.map(option => option.locale)).toEqual([
      'en-US',
      'ko-KR',
      'es-MX',
      'pt-BR',
      'hi-IN',
      'id-ID',
      'ja-JP',
      'de-DE',
      'fr-FR',
      'ar-SA',
      'tr-TR',
      'vi-VN',
      'th-TH',
      'fil-PH',
      'it-IT',
      'nl-NL',
      'pl-PL',
      'bn-BD',
      'ur-PK',
    ]);
  });

  it('maps device language identifiers to supported app locales', () => {
    nativeModules.I18nManager = {localeIdentifier: 'pt_BR'};
    expect(getDeviceAppLocale()).toBe('pt-BR');

    nativeModules.I18nManager = {localeIdentifier: 'es_US'};
    expect(getDeviceAppLocale()).toBe('es-MX');

    nativeModules.I18nManager = {localeIdentifier: 'tl_PH'};
    expect(getDeviceAppLocale()).toBe('fil-PH');

    nativeModules.I18nManager = {localeIdentifier: 'zz_ZZ'};
    expect(getDeviceAppLocale()).toBe(DEFAULT_APP_LOCALE);
  });

  it('uses iOS language settings before generic native locale identifiers', () => {
    nativeModules.SettingsManager = {
      settings: {
        AppleLanguages: ['ur-PK', 'en-US'],
      },
    };
    nativeModules.I18nManager = {localeIdentifier: 'ko_KR'};

    expect(getDeviceAppLocale()).toBe('ur-PK');
  });

  it('normalizes stored locale values and falls back safely', () => {
    expect(normalizeAppLocale('de-DE')).toBe('de-DE');
    expect(normalizeAppLocale('de_DE')).toBe('de-DE');
    expect(normalizeAppLocale('unsupported')).toBe(DEFAULT_APP_LOCALE);
  });

  it('returns localized strings with English fallback', () => {
    const korean = createTranslator('ko-KR');
    const english = createTranslator('en-US');

    expect(korean('settings.title')).toBe('설정');
    expect(korean('alarm.setupTitle')).toBe('알람 설정');
    expect(korean('alarm.snoozeOn')).toBe('다시 울림 켜짐');
    expect(english('settings.title')).toBe('SETTINGS');
    expect(english('alarm.setupTitle')).toBe('ALARM SETUP');
  });

  it('uses clear rewarded ad opt-in popup wording', () => {
    const english = createTranslator('en-US');
    const korean = createTranslator('ko-KR');

    expect(english('rewarded.unlockTitle')).toBe('Mode access');
    expect(english('rewarded.unlockMessage')).toBe(
      'Watch an ad to use all modes for 3 hours.',
    );
    expect(english('rewarded.watchAdAction')).toBe('Watch ad');
    expect(english('rewarded.noFillOneTimeMessage')).toBe(
      'No ad is available right now. This mode opened one time only.',
    );
    expect(korean('rewarded.unlockTitle')).toBe('모드 이용');
    expect(korean('rewarded.unlockMessage')).toBe(
      '광고를 보면 모든 모드를 3시간 이용할 수 있어요.',
    );
    expect(korean('rewarded.watchAdAction')).toBe('광고 보기');
    expect(korean('rewarded.noFillOneTimeMessage')).toBe(
      '지금은 볼 수 있는 광고가 없어 이 모드를 1회만 이용할 수 있어요.',
    );
  });

  it('uses Korean smile terminology while keeping the mode title as 스마일 모드', () => {
    const korean = createTranslator('ko-KR');

    expect(korean('calibration.smilePrompt')).toBe('3번 미소 지어 주세요');
    expect(korean('gesture.Smile')).toBe('미소');
    expect(korean('mode.smileMode.title')).toBe('스마일 모드');
    expect(korean('settings.smileSetting')).toBe('미소 설정');
    expect(korean('timer.smileDetected')).toBe('미소 감지됨');
  });

  it('localizes the camera settings heat and battery warning', () => {
    expect(createTranslator('en-US')('settings.camera.warning')).toBe(
      'Higher settings can increase heat and battery use.',
    );
    expect(createTranslator('ko-KR')('settings.camera.warning')).toBe(
      '설정값에 따라 발열 및 배터리 사용량 차이가 생깁니다.',
    );

    appLanguageOptions
      .filter(option => option.locale !== 'en-US')
      .forEach(option => {
        expect(
          createTranslator(option.locale)('settings.camera.warning'),
        ).not.toBe(createTranslator('en-US')('settings.camera.warning'));
      });
  });

  it('uses locale-specific mode names based on the Korean mode wording', () => {
    const expectedModeTitles = {
      'en-US': {
        'mode.basicTimer.title': 'BASIC MODE',
        'mode.flipTimer.title': 'FLIP MODE',
        'mode.lookPause.title': 'LOOK MODE',
        'mode.smileMode.title': 'SMILE MODE',
        'mode.winkControl.title': 'WINK MODE',
      },
      'ko-KR': {
        'mode.basicTimer.title': '기본 모드',
        'mode.flipTimer.title': '플립 모드',
        'mode.lookPause.title': '시선 모드',
        'mode.smileMode.title': '스마일 모드',
        'mode.winkControl.title': '윙크 모드',
      },
      'es-MX': {
        'mode.basicTimer.title': 'MODO BÁSICO',
        'mode.flipTimer.title': 'MODO FLIP',
        'mode.lookPause.title': 'MODO LOOK',
        'mode.smileMode.title': 'MODO SONRISA',
        'mode.winkControl.title': 'MODO GUIÑO',
      },
      'pt-BR': {
        'mode.basicTimer.title': 'MODO BÁSICO',
        'mode.flipTimer.title': 'MODO VIRAR',
        'mode.lookPause.title': 'MODO DE LOOK',
        'mode.smileMode.title': 'MODO SORRISO',
        'mode.winkControl.title': 'MODO PISCADA',
      },
      'hi-IN': {
        'mode.basicTimer.title': 'बेसिक मोड',
        'mode.flipTimer.title': 'फ्लिप मोड',
        'mode.lookPause.title': 'लुक मोड',
        'mode.smileMode.title': 'मुस्कान मोड',
        'mode.winkControl.title': 'विंक मोड',
      },
      'id-ID': {
        'mode.basicTimer.title': 'MODE DASAR',
        'mode.flipTimer.title': 'MODE BALIK',
        'mode.lookPause.title': 'MODE LOOK',
        'mode.smileMode.title': 'MODE SENYUM',
        'mode.winkControl.title': 'MODE KEDIP',
      },
      'ja-JP': {
        'mode.basicTimer.title': '基本モード',
        'mode.flipTimer.title': 'フリップモード',
        'mode.lookPause.title': 'ルックモード',
        'mode.smileMode.title': 'スマイルモード',
        'mode.winkControl.title': 'ウインクモード',
      },
      'de-DE': {
        'mode.basicTimer.title': 'BASISMODUS',
        'mode.flipTimer.title': 'FLIP-MODUS',
        'mode.lookPause.title': 'LOOK-MODUS',
        'mode.smileMode.title': 'LÄCHELMODUS',
        'mode.winkControl.title': 'ZWINKERMODUS',
      },
      'fr-FR': {
        'mode.basicTimer.title': 'MODE BASIQUE',
        'mode.flipTimer.title': 'MODE FLIP',
        'mode.lookPause.title': 'MODE LOOK',
        'mode.smileMode.title': 'MODE SOURIRE',
        'mode.winkControl.title': 'MODE CLIN D’ŒIL',
      },
      'ar-SA': {
        'mode.basicTimer.title': 'الوضع الأساسي',
        'mode.flipTimer.title': 'وضع القلب',
        'mode.lookPause.title': 'وضع لوك',
        'mode.smileMode.title': 'وضع الابتسامة',
        'mode.winkControl.title': 'وضع الغمزة',
      },
      'tr-TR': {
        'mode.basicTimer.title': 'TEMEL MOD',
        'mode.flipTimer.title': 'ÇEVİRME MODU',
        'mode.lookPause.title': 'LOOK MODU',
        'mode.smileMode.title': 'GÜLÜMSEME MODU',
        'mode.winkControl.title': 'GÖZ KIRPMA MODU',
      },
      'vi-VN': {
        'mode.basicTimer.title': 'CHẾ ĐỘ CƠ BẢN',
        'mode.flipTimer.title': 'CHẾ ĐỘ LẬT',
        'mode.lookPause.title': 'CHẾ ĐỘ LOOK',
        'mode.smileMode.title': 'CHẾ ĐỘ NỤ CƯỜI',
        'mode.winkControl.title': 'CHẾ ĐỘ NHÁY MẮT',
      },
      'th-TH': {
        'mode.basicTimer.title': 'โหมดพื้นฐาน',
        'mode.flipTimer.title': 'โหมดพลิก',
        'mode.lookPause.title': 'โหมดลุค',
        'mode.smileMode.title': 'โหมดยิ้ม',
        'mode.winkControl.title': 'โหมดขยิบตา',
      },
      'fil-PH': {
        'mode.basicTimer.title': 'BATAYANG MODE',
        'mode.flipTimer.title': 'MODE NG BALIGTAD',
        'mode.lookPause.title': 'MODE LOOK',
        'mode.smileMode.title': 'MODE NG NGITI',
        'mode.winkControl.title': 'MODE NG KINDAT',
      },
      'it-IT': {
        'mode.basicTimer.title': 'MODALITÀ BASE',
        'mode.flipTimer.title': 'MODALITÀ FLIP',
        'mode.lookPause.title': 'MODALITÀ LOOK',
        'mode.smileMode.title': 'MODALITÀ SORRISO',
        'mode.winkControl.title': 'MODALITÀ OCCHIOLINO',
      },
      'nl-NL': {
        'mode.basicTimer.title': 'BASISMODUS',
        'mode.flipTimer.title': 'FLIPMODUS',
        'mode.lookPause.title': 'LOOKMODUS',
        'mode.smileMode.title': 'GLIMLACHMODUS',
        'mode.winkControl.title': 'KNIPOOGMODUS',
      },
      'pl-PL': {
        'mode.basicTimer.title': 'TRYB PODSTAWOWY',
        'mode.flipTimer.title': 'TRYB ODWRÓCENIA',
        'mode.lookPause.title': 'TRYB LOOK',
        'mode.smileMode.title': 'TRYB UŚMIECHU',
        'mode.winkControl.title': 'TRYB MRUGNIĘCIA',
      },
      'bn-BD': {
        'mode.basicTimer.title': 'বেসিক মোড',
        'mode.flipTimer.title': 'ফ্লিপ মোড',
        'mode.lookPause.title': 'লুক মোড',
        'mode.smileMode.title': 'হাসি মোড',
        'mode.winkControl.title': 'উইঙ্ক মোড',
      },
      'ur-PK': {
        'mode.basicTimer.title': 'بنیادی موڈ',
        'mode.flipTimer.title': 'فلپ موڈ',
        'mode.lookPause.title': 'لک موڈ',
        'mode.smileMode.title': 'مسکراہٹ موڈ',
        'mode.winkControl.title': 'ونک موڈ',
      },
    } as const;

    Object.entries(expectedModeTitles).forEach(([locale, expectedValues]) => {
      const t = createTranslator(
        locale as (typeof appLanguageOptions)[number]['locale'],
      );

      Object.entries(expectedValues).forEach(([key, expected]) => {
        expect(t(key as (typeof translationKeys)[number])).toBe(expected);
      });
    });
  });

  it('uses colon-separated localized action summaries for grouped mode gestures', () => {
    const smileMode = getTimerModePreset('smileMode');

    expect(getLocalizedModeActionSummary('en-US', smileMode)).toContain(
      'START/PAUSE/RESUME: Smile',
    );
    expect(getLocalizedModeActionSummary('ko-KR', smileMode)).toContain(
      '시작/일시정지/계속: 미소',
    );
  });

  it('uses localized short mode menu descriptions in every supported locale', () => {
    const winkMode = getTimerModePreset('winkControl');
    const modeIds = [
      'basicTimer',
      'flipTimer',
      'lookPause',
      'smileMode',
      'winkControl',
    ] as const;
    const expectedModeMenuDescriptions = {
      'en-US': {
        basicTimer: 'Use buttons only',
        flipTimer: 'Flip to keep time running',
        lookPause: 'Pause when you look',
        smileMode: 'Smile to control it',
        winkControl: 'Control with a wink',
      },
      'ko-KR': {
        basicTimer: '버튼으로만 사용해요',
        flipTimer: '뒤집으면 시간이 흘러요',
        lookPause: '쳐다보면 멈춰요',
        smileMode: '웃어보세요',
        winkControl: '윙크로 제어하세요',
      },
      'es-MX': {
        basicTimer: 'Usa solo botones',
        flipTimer: 'Voltea para seguir el tiempo',
        lookPause: 'Pausa al mirar',
        smileMode: 'Controla con una sonrisa',
        winkControl: 'Controla con un guiño',
      },
      'pt-BR': {
        basicTimer: 'Use apenas botões',
        flipTimer: 'Vire para o tempo correr',
        lookPause: 'Pause ao olhar',
        smileMode: 'Controle com um sorriso',
        winkControl: 'Controle com uma piscada',
      },
      'hi-IN': {
        basicTimer: 'सिर्फ बटन से चलाएं',
        flipTimer: 'पलटें तो समय चले',
        lookPause: 'देखने पर विराम',
        smileMode: 'मुस्कान से चलाएं',
        winkControl: 'पलक झपकाकर नियंत्रित करें',
      },
      'id-ID': {
        basicTimer: 'Pakai tombol saja',
        flipTimer: 'Balik agar waktu berjalan',
        lookPause: 'Jeda saat melihat',
        smileMode: 'Kontrol dengan senyum',
        winkControl: 'Kontrol dengan kedipan',
      },
      'ja-JP': {
        basicTimer: 'ボタンだけで使えます',
        flipTimer: '裏返すと時間が進みます',
        lookPause: '見ると一時停止します',
        smileMode: '笑顔で操作できます',
        winkControl: 'ウインクで操作できます',
      },
      'de-DE': {
        basicTimer: 'Nur mit Tasten bedienen',
        flipTimer: 'Umdrehen lässt die Zeit laufen',
        lookPause: 'Pausiert beim Hinsehen',
        smileMode: 'Mit Lächeln steuern',
        winkControl: 'Mit Zwinkern steuern',
      },
      'fr-FR': {
        basicTimer: 'Utilisez seulement les boutons',
        flipTimer: 'Retournez pour lancer le temps',
        lookPause: 'Pause quand vous regardez',
        smileMode: 'Contrôlez avec un sourire',
        winkControl: 'Contrôlez avec un clin d’œil',
      },
      'ar-SA': {
        basicTimer: 'استخدم الأزرار فقط',
        flipTimer: 'اقلب الجهاز ليعمل الوقت',
        lookPause: 'يتوقف عند النظر',
        smileMode: 'تحكم بالابتسامة',
        winkControl: 'تحكم بالغمزة',
      },
      'tr-TR': {
        basicTimer: 'Yalnızca düğmeleri kullanın',
        flipTimer: 'Çevirince süre ilerler',
        lookPause: 'Bakınca duraklar',
        smileMode: 'Gülümseyerek kontrol edin',
        winkControl: 'Göz kırparak kontrol edin',
      },
      'vi-VN': {
        basicTimer: 'Chỉ dùng nút bấm',
        flipTimer: 'Lật để thời gian chạy',
        lookPause: 'Tạm dừng khi nhìn',
        smileMode: 'Điều khiển bằng nụ cười',
        winkControl: 'Điều khiển bằng nháy mắt',
      },
      'th-TH': {
        basicTimer: 'ใช้ปุ่มเท่านั้น',
        flipTimer: 'พลิกเครื่องเพื่อให้เวลาวิ่ง',
        lookPause: 'หยุดเมื่อมอง',
        smileMode: 'ควบคุมด้วยรอยยิ้ม',
        winkControl: 'ควบคุมด้วยการขยิบตา',
      },
      'fil-PH': {
        basicTimer: 'Gamitin lang ang mga button',
        flipTimer: 'Baligtarin para tumakbo ang oras',
        lookPause: 'Humihinto kapag tumingin',
        smileMode: 'Kontrolin gamit ang ngiti',
        winkControl: 'Kontrolin gamit ang kindat',
      },
      'it-IT': {
        basicTimer: 'Usa solo i pulsanti',
        flipTimer: 'Capovolgi per far scorrere il tempo',
        lookPause: 'Si mette in pausa quando guardi',
        smileMode: 'Controlla con un sorriso',
        winkControl: 'Controlla con un occhiolino',
      },
      'nl-NL': {
        basicTimer: 'Gebruik alleen knoppen',
        flipTimer: 'Draai om zodat de tijd loopt',
        lookPause: 'Pauzeert wanneer je kijkt',
        smileMode: 'Bedien met een glimlach',
        winkControl: 'Bedien met een knipoog',
      },
      'pl-PL': {
        basicTimer: 'Używaj tylko przycisków',
        flipTimer: 'Odwróć, aby czas płynął',
        lookPause: 'Pauza, gdy patrzysz',
        smileMode: 'Steruj uśmiechem',
        winkControl: 'Steruj mrugnięciem',
      },
      'bn-BD': {
        basicTimer: 'শুধু বোতাম ব্যবহার করুন',
        flipTimer: 'উল্টালে সময় চলবে',
        lookPause: 'তাকালে বিরতি নেয়',
        smileMode: 'হাসি দিয়ে নিয়ন্ত্রণ করুন',
        winkControl: 'চোখ টিপে নিয়ন্ত্রণ করুন',
      },
      'ur-PK': {
        basicTimer: 'صرف بٹن استعمال کریں',
        flipTimer: 'پلٹائیں تو وقت چلے گا',
        lookPause: 'دیکھنے پر وقفہ',
        smileMode: 'مسکراہٹ سے کنٹرول کریں',
        winkControl: 'آنکھ جھپکاکر کنٹرول کریں',
      },
    } as const;

    appLanguageOptions.forEach(option => {
      modeIds.forEach(modeId => {
        const description = getLocalizedTimerModeMenuDescription(
          option.locale,
          modeId,
        );

        expect(description).toBe(
          expectedModeMenuDescriptions[option.locale][modeId],
        );
        expect(description.trim()).not.toBe('');
      });
    });

    expect(getLocalizedModeActionSummary('en-US', winkMode)).toContain(
      'START/PAUSE/RESUME: Right Wink',
    );
  });

  it('uses look-elsewhere wording for the look-away gesture in every locale', () => {
    const expectedLookAwayLabels = {
      'en-US': 'Look elsewhere',
      'ko-KR': '다른곳 보기',
      'es-MX': 'Mirar a otro lado',
      'pt-BR': 'Olhar para outro lugar',
      'hi-IN': 'दूसरी जगह देखें',
      'id-ID': 'Lihat tempat lain',
      'ja-JP': '別の場所を見る',
      'de-DE': 'Woanders hinschauen',
      'fr-FR': 'Regarder ailleurs',
      'ar-SA': 'انظر إلى مكان آخر',
      'tr-TR': 'Başka yere bak',
      'vi-VN': 'Nhìn chỗ khác',
      'th-TH': 'มองไปที่อื่น',
      'fil-PH': 'Tumingin sa ibang lugar',
      'it-IT': 'Guarda altrove',
      'nl-NL': 'Kijk ergens anders',
      'pl-PL': 'Spójrz gdzie indziej',
      'bn-BD': 'অন্য জায়গায় দেখুন',
      'ur-PK': 'کسی اور جگہ دیکھیں',
    } as const;

    Object.entries(expectedLookAwayLabels).forEach(([locale, expected]) => {
      expect(
        createTranslator(locale as (typeof appLanguageOptions)[number]['locale'])(
          'gesture.Look Away',
        ),
      ).toBe(expected);
    });
  });

  it('has explicit translations for every UI key in every supported locale', () => {
    expect(translationKeys.length).toBeGreaterThan(100);

    appLanguageOptions.forEach(option => {
      expect(getMissingTranslationKeys(option.locale)).toEqual([]);
    });
  });

  it('does not fall back to English for common non-English settings labels', () => {
    expect(createTranslator('ko-KR')('settings.timer.title')).toBe('타이머');
    expect(createTranslator('de-DE')('timer.timeline')).toBe('ZEITLEISTE');
    expect(createTranslator('ar-SA')('settings.timer.summary')).toBe(
      'عناصر تنبيه الانتهاء',
    );
  });

  it('uses locale-specific representative strings for every requested language', () => {
    const samples = {
      'ko-KR': {
        'settings.title': '설정',
        'common.start': '시작',
        'timer.timeline': '타임라인',
      },
      'es-MX': {
        'settings.title': 'AJUSTES',
        'common.start': 'INICIAR',
        'timer.timeline': 'LÍNEA DE TIEMPO',
      },
      'pt-BR': {
        'settings.title': 'CONFIGURAÇÕES',
        'common.start': 'COMEÇAR',
        'timer.timeline': 'LINHA DO TEMPO',
      },
      'hi-IN': {
        'settings.title': 'सेटिंग्स',
        'common.start': 'शुरू',
        'timer.timeline': 'समयरेखा',
      },
      'id-ID': {
        'settings.title': 'PENGATURAN',
        'common.start': 'MULAI',
        'timer.timeline': 'LINIMASA',
      },
      'ja-JP': {
        'settings.title': '設定',
        'common.start': '開始',
        'timer.timeline': 'タイムライン',
      },
      'de-DE': {
        'settings.title': 'EINSTELLUNGEN',
        'common.start': 'STARTEN',
        'timer.timeline': 'ZEITLEISTE',
      },
      'fr-FR': {
        'settings.title': 'RÉGLAGES',
        'common.start': 'DÉMARRER',
        'timer.timeline': 'CHRONOLOGIE',
      },
      'ar-SA': {
        'settings.title': 'الإعدادات',
        'common.start': 'ابدأ',
        'timer.timeline': 'الخط الزمني',
      },
      'tr-TR': {
        'settings.title': 'AYARLAR',
        'common.start': 'BAŞLAT',
        'timer.timeline': 'ZAMAN ÇİZELGESİ',
      },
      'vi-VN': {
        'settings.title': 'CÀI ĐẶT',
        'common.start': 'BẮT ĐẦU',
        'timer.timeline': 'DÒNG THỜI GIAN',
      },
      'th-TH': {
        'settings.title': 'การตั้งค่า',
        'common.start': 'เริ่ม',
        'timer.timeline': 'ไทม์ไลน์',
      },
      'fil-PH': {
        'settings.title': 'MGA SETTING',
        'common.start': 'SIMULAN',
        'timer.timeline': 'TALA NG ORAS',
      },
      'it-IT': {
        'settings.title': 'IMPOSTAZIONI',
        'common.start': 'AVVIA',
        'timer.timeline': 'CRONOLOGIA',
      },
      'nl-NL': {
        'settings.title': 'INSTELLINGEN',
        'common.start': 'STARTEN',
        'timer.timeline': 'TIJDLIJN',
      },
      'pl-PL': {
        'settings.title': 'USTAWIENIA',
        'common.start': 'ROZPOCZNIJ',
        'timer.timeline': 'OŚ CZASU',
      },
      'bn-BD': {
        'settings.title': 'সেটিংস',
        'common.start': 'শুরু',
        'timer.timeline': 'সময়রেখা',
      },
      'ur-PK': {
        'settings.title': 'ترتیبات',
        'common.start': 'شروع کریں',
        'timer.timeline': 'ٹائم لائن',
      },
    } as const;

    Object.entries(samples).forEach(([locale, expectedValues]) => {
      const t = createTranslator(
        locale as (typeof appLanguageOptions)[number]['locale'],
      );

      Object.entries(expectedValues).forEach(([key, expected]) => {
        expect(t(key as (typeof translationKeys)[number])).toBe(expected);
      });
    });
  });

  it('does not reuse English strings for translated locale UI keys', () => {
    const allowedSameAsEnglish = new Set(['settings.selectedLanguage']);
    const english = createTranslator('en-US');

    appLanguageOptions
      .filter(option => option.locale !== 'en-US')
      .forEach(option => {
        const t = createTranslator(option.locale);
        const sameAsEnglish = translationKeys.filter(
          key => !allowedSameAsEnglish.has(key) && t(key) === english(key),
        );

        expect(sameAsEnglish).toEqual([]);
      });
  });

  it('does not copy another non-English locale table wholesale', () => {
    const copiedLocalePairs = [
      ['pt-BR', 'es-MX'],
      ['id-ID', 'es-MX'],
      ['fr-FR', 'es-MX'],
      ['fil-PH', 'es-MX'],
      ['it-IT', 'es-MX'],
      ['vi-VN', 'es-MX'],
      ['hi-IN', 'ko-KR'],
      ['ja-JP', 'ko-KR'],
      ['ar-SA', 'ko-KR'],
      ['th-TH', 'ko-KR'],
      ['bn-BD', 'ko-KR'],
      ['ur-PK', 'ko-KR'],
      ['tr-TR', 'de-DE'],
      ['nl-NL', 'de-DE'],
      ['pl-PL', 'de-DE'],
    ] as const;

    copiedLocalePairs.forEach(([locale, sourceLocale]) => {
      const t = createTranslator(locale);
      const source = createTranslator(sourceLocale);
      const copiedKeys = translationKeys.filter(key => t(key) === source(key));

      expect(copiedKeys.length).toBeLessThan(12);
    });
  });
});
