import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {formatDuration} from '../components/TimerDisplay';
import type {SessionSummary} from '../domain/session';
import {
  createTranslator,
  getIntlLocale,
  type AppLocale,
} from '../i18n/localization';
import {useAppState} from '../state/AppState';

type Translator = ReturnType<typeof createTranslator>;

function formatSessionDate(value: string, locale: AppLocale) {
  return new Date(value).toLocaleString(getIntlLocale(locale), {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
}

function HistoryItem({
  session,
  locale,
  t,
}: {
  session: SessionSummary;
  locale: AppLocale;
  t: Translator;
}) {
  return (
    <View style={styles.item}>
      <View>
        <Text style={styles.itemTitle}>
          {t('history.focusLabel')} {formatDuration(session.focusDurationMs)}
        </Text>
        <Text style={styles.itemMeta}>
          {formatSessionDate(session.startedAt, locale)}
        </Text>
      </View>
      <View style={styles.itemStats}>
        <Text style={styles.itemStatLabel}>{t('history.pauseLabel')}</Text>
        <Text style={styles.itemStatValue}>
          {session.lookPauseCount}
          {t('history.countUnit')}
        </Text>
      </View>
    </View>
  );
}

export function HistoryScreen() {
  const {locale, repository, sessions, setScreen, setSessions} = useAppState();
  const t = createTranslator(locale);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    setHistoryError(false);
    repository
      .list()
      .then(items => {
        if (isMounted) {
          setSessions(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHistoryError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [repository, setSessions]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('history.title')}</Text>
        <PrimaryButton
          label={t('common.back')}
          onPress={() => {
            setScreen('timer');
          }}
          variant="secondary"
          style={styles.returnButton}
        />
      </View>

      {historyError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('history.error')}</Text>
          <Text style={styles.emptyCopy}>{t('history.errorCopy')}</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('history.emptyTitle')}</Text>
          <Text style={styles.emptyCopy}>{t('history.emptyCopy')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {sessions.map(session => (
            <HistoryItem
              key={session.id}
              locale={locale}
              session={session}
              t={t}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    color: '#121A14',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  returnButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#121A14',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
  },
  emptyCopy: {
    color: '#5D6A62',
    fontSize: 16,
    lineHeight: 24,
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  item: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  itemTitle: {
    color: '#121A14',
    fontSize: 18,
    fontWeight: '800',
  },
  itemMeta: {
    color: '#5D6A62',
    fontSize: 14,
    marginTop: 4,
  },
  itemStats: {
    alignItems: 'flex-end',
  },
  itemStatLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  itemStatValue: {
    color: '#121A14',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    marginTop: 4,
  },
});
