import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {useAppState} from '../state/AppState';

export function OnboardingScreen() {
  const {setScreen} = useAppState();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Timewatch MVP</Text>
        <Text style={styles.title}>집중 시간을 조용히 지켜봅니다.</Text>
      </View>

      <View style={styles.copyBlock}>
        <Text style={styles.copy}>
          타임워치는 화면을 보는 시간을 감지해 집중 타이머를 자동으로
          멈추는 앱입니다.
        </Text>
        <Text style={styles.copy}>
          이 기초 버전에서는 실제 카메라 대신 상태 버튼으로 흐름을 확인합니다.
          세션 기록은 이 기기에만 저장됩니다.
        </Text>
        <Text style={styles.copy}>
          영상, 이미지, 얼굴 데이터는 저장하거나 업로드하지 않습니다.
        </Text>
        <Text style={styles.copy}>
          카메라 기능이 연결되더라도 시선 처리와 타이머 판단은 기기 안에서
          다루는 방향으로 설계합니다.
        </Text>
      </View>

      <PrimaryButton
        label="시작하기"
        onPress={() => {
          setScreen('timer');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    gap: 12,
    marginBottom: 28,
  },
  kicker: {
    color: '#406455',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: '#121A14',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 42,
  },
  copyBlock: {
    gap: 12,
    marginBottom: 32,
  },
  copy: {
    color: '#3D4942',
    fontSize: 16,
    lineHeight: 24,
  },
});
