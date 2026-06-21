import analytics from '@react-native-firebase/analytics';

export type FunnelEventName =
  | 'wt_alarm_fire'
  | 'wt_banner_load_result'
  | 'wt_camera_mode_start'
  | 'wt_camera_permission_result'
  | 'wt_interstitial_show_result'
  | 'wt_mode_enter'
  | 'wt_mode_menu_open'
  | 'wt_mode_selection_interstitial_result'
  | 'wt_mode_select_attempt'
  | 'wt_review_prompt_action'
  | 'wt_reward_access_result'
  | 'wt_reward_prompt_cancel'
  | 'wt_reward_prompt_confirm'
  | 'wt_reward_prompt_show'
  | 'wt_timer_start';

export type FunnelEventValue = string | number | boolean | null | undefined;
export type FunnelEventParams = Record<string, FunnelEventValue>;

type FunnelEventOptions = {
  oncePerSessionKey?: string;
};

const loggedOncePerSessionKeys = new Set<string>();

function normalizeFunnelParams(params: FunnelEventParams) {
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => {
      if (value === undefined || value === null) {
        return [];
      }

      if (typeof value === 'boolean') {
        return [[key, value ? 1 : 0]];
      }

      return [[key, value]];
    }),
  );
}

export async function recordFunnelEvent(
  eventName: FunnelEventName,
  params: FunnelEventParams = {},
  options: FunnelEventOptions = {},
) {
  const onceKey = options.oncePerSessionKey;
  if (onceKey !== undefined) {
    if (loggedOncePerSessionKeys.has(onceKey)) {
      return;
    }

    loggedOncePerSessionKeys.add(onceKey);
  }

  try {
    await analytics().logEvent(eventName, normalizeFunnelParams(params));
  } catch (error) {
    console.warn('[WinkTimerFunnel]', `${eventName} failed`, error);
  }
}

export function resetFunnelEventSessionForTests() {
  loggedOncePerSessionKeys.clear();
}
