import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {formatDuration} from '../components/TimerDisplay';
import type {SessionSummary} from '../domain/session';
import {useAppState} from '../state/AppState';

const HISTORY_ERROR_MESSAGE = '기록을 불러오지 못했습니다.';

function formatSessionDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
}

function HistoryItem({session}: {session: SessionSummary}) {
  return (
    <View style={styles.item}>
      <View>
        <Text style={styles.itemTitle}>
          집중 {formatDuration(session.focusDurationMs)}
        </Text>
        <Text style={styles.itemMeta}>{formatSessionDate(session.startedAt)}</Text>
      </View>
      <View style={styles.itemStats}>
        <Text style={styles.itemStatLabel}>멈춤</Text>
        <Text style={styles.itemStatValue}>{session.lookPauseCount}회</Text>
      </View>
    </View>
  );
}

export function HistoryScreen() {
  const {repository, sessions, setScreen, setSessions} = useAppState();
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    setHistoryError(null);
    repository
      .list()
      .then(items => {
        if (isMounted) {
          setSessions(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setHistoryError(HISTORY_ERROR_MESSAGE);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [repository, setSessions]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>기록</Text>
        <PrimaryButton
          label="돌아가기"
          onPress={() => {
            setScreen('timer');
          }}
          variant="secondary"
          style={styles.returnButton}
        />
      </View>

      {historyError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{historyError}</Text>
          <Text style={styles.emptyCopy}>
            잠시 후 다시 돌아오면 저장된 기록을 다시 불러옵니다.
          </Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>아직 저장된 세션이 없습니다.</Text>
          <Text style={styles.emptyCopy}>
            타이머를 완료하면 이곳에서 최근 기록부터 확인할 수 있습니다.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {sessions.map(session => (
            <HistoryItem key={session.id} session={session} />
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
