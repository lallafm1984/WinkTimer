# AdMob Banner Operations

## Automatic refresh

Use the AdMob console setting for banner refresh instead of adding an app-side
manual retry loop.

Recommended console state:

- App: Wink Timer
- Ad unit: banner ad unit
- Advanced settings: Automatic refresh
- Value: Google optimized

Google optimized refresh lets AdMob manage the banner refresh rate from
historical data. Custom refresh is available, but app-side retry loops can make
request quality harder to interpret when diagnosing no-fill.

References:

- https://support.google.com/admob/answer/3245199
- https://support.google.com/admob/answer/7311346
