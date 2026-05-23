import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import type {Sensitivity} from '../domain/detection';
import {
  type DetectionFrameIntervalLevel,
  type DetectionResolutionLevel,
  type LookAngleLevel,
  type WinkDistanceLevel,
  type WinkMinTimeLevel,
  type WinkSensitivityLevel,
  type WinkTimeLevel,
  detectionFrameIntervalMsByLevel,
  detectionFrameIntervalLevels,
  detectionResolutionByLevel,
  detectionResolutionLevels,
  lookAngleLevels,
  winkDistanceLevels,
  winkMinTimeLevels,
  winkSensitivityLevels,
  winkTimeLevels,
} from '../domain/detection';
import {useAppState} from '../state/AppState';

const sensitivityOptions: Array<{label: string; value: Sensitivity}> = [
  {label: 'LOOSE', value: 'loose'},
  {label: 'NORMAL', value: 'normal'},
  {label: 'STRICT', value: 'strict'},
];

type LevelControlProps = {
  title: string;
  value: number;
  valueLabel: string;
  levels: readonly number[];
  testID: string;
  onChange(value: number): void;
};

type SettingsGroupProps = {
  title: string;
  children: React.ReactNode;
};

function SettingsGroup({title, children}: SettingsGroupProps) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

function LevelControl({
  title,
  value,
  valueLabel,
  levels,
  testID,
  onChange,
}: LevelControlProps) {
  return (
    <View style={styles.section}>
      <View style={styles.settingCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.description}>{valueLabel}</Text>
      </View>
      <View style={styles.levelGrid} testID={testID}>
        {levels.map(level => (
          <PrimaryButton
            key={level}
            label={`${level}`}
            onPress={() => {
              onChange(level);
            }}
            variant={value === level ? 'primary' : 'secondary'}
            style={styles.levelButton}
          />
        ))}
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const {
    sensitivity,
    setSensitivity,
    winkSensitivityLevel,
    setWinkSensitivityLevel,
    winkDistanceLevel,
    setWinkDistanceLevel,
    lookAngleLevel,
    setLookAngleLevel,
    winkTimeLevel,
    setWinkTimeLevel,
    winkMinTimeLevel,
    setWinkMinTimeLevel,
    detectionResolutionLevel,
    setDetectionResolutionLevel,
    detectionFrameIntervalLevel,
    setDetectionFrameIntervalLevel,
    setScreen,
  } = useAppState();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SETTINGS</Text>
        <PrimaryButton
          label="BACK"
          onPress={() => {
            setScreen('timer');
          }}
          variant="secondary"
          style={styles.returnButton}
        />
      </View>

      <SettingsGroup title="LOOK DETECTION">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SENSITIVITY</Text>
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

        <LevelControl
          title="LOOK ANGLE"
          value={lookAngleLevel}
          valueLabel={`${lookAngleLevel} / 3`}
          levels={lookAngleLevels}
          testID="look-angle-levels"
          onChange={level => {
            setLookAngleLevel(level as LookAngleLevel);
          }}
        />
      </SettingsGroup>

      <SettingsGroup title="WINK DETECTION">
        <LevelControl
          title="WINK SENSITIVITY"
          value={winkSensitivityLevel}
          valueLabel={`${winkSensitivityLevel} / 5`}
          levels={winkSensitivityLevels}
          testID="wink-sensitivity-levels"
          onChange={level => {
            setWinkSensitivityLevel(level as WinkSensitivityLevel);
          }}
        />

        <LevelControl
          title="WINK MAX TIME"
          value={winkTimeLevel}
          valueLabel={`${winkTimeLevel} / 3`}
          levels={winkTimeLevels}
          testID="wink-time-levels"
          onChange={level => {
            setWinkTimeLevel(level as WinkTimeLevel);
          }}
        />

        <LevelControl
          title="WINK MIN TIME"
          value={winkMinTimeLevel}
          valueLabel={`${winkMinTimeLevel} / 3`}
          levels={winkMinTimeLevels}
          testID="wink-min-time-levels"
          onChange={level => {
            setWinkMinTimeLevel(level as WinkMinTimeLevel);
          }}
        />

        <LevelControl
          title="WINK DISTANCE"
          value={winkDistanceLevel}
          valueLabel={`${winkDistanceLevel} / 5`}
          levels={winkDistanceLevels}
          testID="wink-distance-levels"
          onChange={level => {
            setWinkDistanceLevel(level as WinkDistanceLevel);
          }}
        />
      </SettingsGroup>

      <SettingsGroup title="CAMERA ANALYSIS">
        <LevelControl
          title="CAMERA RESOLUTION"
          value={detectionResolutionLevel}
          valueLabel={`${
            detectionResolutionByLevel[detectionResolutionLevel].width
          } x ${detectionResolutionByLevel[detectionResolutionLevel].height}`}
          levels={detectionResolutionLevels}
          testID="detection-resolution-levels"
          onChange={level => {
            setDetectionResolutionLevel(level as DetectionResolutionLevel);
          }}
        />

        <LevelControl
          title="ML KIT INTERVAL"
          value={detectionFrameIntervalLevel}
          valueLabel={
            detectionFrameIntervalMsByLevel[detectionFrameIntervalLevel] === 0
              ? 'Realtime'
              : `${
                  detectionFrameIntervalMsByLevel[
                    detectionFrameIntervalLevel
                  ]
                } ms`
          }
          levels={detectionFrameIntervalLevels}
          testID="detection-frame-interval-levels"
          onChange={level => {
            setDetectionFrameIntervalLevel(level as DetectionFrameIntervalLevel);
          }}
        />
      </SettingsGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  group: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  groupTitle: {
    color: '#5D6A62',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
  },
  groupBody: {
    gap: 14,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#121A14',
    fontSize: 17,
    fontWeight: '800',
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelButton: {
    flexBasis: '18%',
    flexGrow: 1,
    minHeight: 40,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  settingCopy: {
    gap: 6,
  },
  description: {
    color: '#5D6A62',
    fontSize: 14,
    lineHeight: 20,
  },
});
