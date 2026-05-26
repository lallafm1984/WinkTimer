import {NativeModules} from 'react-native';
import {
  DEFAULT_APP_LOCALE,
  appLanguageOptions,
  createTranslator,
  getDeviceAppLocale,
  getLocalizedModeActionSummary,
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
    expect(english('settings.title')).toBe('SETTINGS');
  });

  it('uses Korean smile terminology as 미소 in smile mode labels', () => {
    const korean = createTranslator('ko-KR');

    expect(korean('calibration.smilePrompt')).toBe('3번 미소 지어 주세요');
    expect(korean('gesture.Smile')).toBe('미소');
    expect(korean('mode.smileMode.title')).toBe('미소 모드');
    expect(korean('settings.smileSetting')).toBe('미소 설정');
    expect(korean('timer.smileDetected')).toBe('미소 감지됨');
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
