# Architecture rules
- ParentDashboard reuses one invitation section for the focused empty-family entry and the children tab, keeping invitation actions identical in both views.
- ParentDashboard waits for its initial family load before selecting the empty-family entry; deferral is account-scoped local UI state, not authentication state.

- Landing motion is progressive enhancement managed by useLandingMotion; text stays visible without JavaScript for prerendering.
- Landing LoopVideo uses replaceable /videos files and only loads and plays while visible with reduced motion disabled.
