import React from 'react';
import {ScrollView, StyleSheet, Switch, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import type {Sensitivity} from '../domain/detection';
import {useAppState} from '../state/AppState';

const sensitivityOptions: Array<{label: string; value: Sensitivity}> = [
  {label: '느슨', value: 'loose'},
  {label: '보통', value: 'normal'},
  {label: '엄격', value: 'strict'},
];

export function SettingsScreen() {
  const {
    sensitivity,
    setSensitivity,
    statusDisplayMode,
    setStatusDisplayMode,
    normalTimerMode,
    setNormalTimerMode,
    setScreen,
  } = useAppState();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
        <PrimaryButton
          label="돌아가기"
          onPress={() => {
            setScreen('timer');
          }}
          variant="secondary"
          style={styles.returnButton}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>민감도</Text>
        <View style={styles.segment}>
          {sensitivityOptions.map(option => (
            <PrimaryButton
              key={option.value}
              label={option.label}
              onPress={() => {
                setSensitivity(option.value);
              }}
              variant={sensitivity === option.value ? 'primary' : 'secondary'}
              style={styles.segmentButton}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.sectionTitle}>상태 텍스트 표시</Text>
            <Text style={styles.description}>
              타이머 화면의 감지 상태를 글자로 함께 보여줍니다.
            </Text>
          </View>
          <Switch
            value={statusDisplayMode === 'text'}
            onValueChange={enabled => {
              setStatusDisplayMode(enabled ? 'text' : 'minimal');
            }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.sectionTitle}>일반 타이머 모드</Text>
            <Text style={styles.description}>
              감지 상태를 무시하고 집중 시간이 계속 흐르게 합니다.
            </Text>
          </View>
          <Switch
            value={normalTimerMode}
            onValueChange={setNormalTimerMode}
          />
        </View>
      </View>

      <Text style={styles.note}>
        실제 카메라 감지는 이후 빌드에서 연결됩니다. 현재는 타이머 흐름과
        기록 저장을 검증하기 위한 mock 상태 버튼을 사용합니다.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  section: {
    borderColor: '#DCE2DE',
    borderTopWidth: 1,
    paddingVertical: 20,
  },
  sectionTitle: {
    color: '#121A14',
    fontSize: 17,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  segmentButton: {
    flex: 1,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  settingCopy: {
    flex: 1,
    gap: 6,
  },
  description: {
    color: '#5D6A62',
    fontSize: 14,
    lineHeight: 20,
  },
  note: {
    color: '#5D6A62',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
});
