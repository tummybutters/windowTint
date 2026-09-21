# Quote priorities and timing

Approved sequence: vehicle, main priority, window coverage, preferred installation timing, contact. Model-specific Tesla pages retain their preselected vehicle. Removal pages ask about clearer windows, bubbles, appearance, or preparation for new tint and retain removal as the service.

New choices are one-tap illustrated cards in the existing charcoal, silver, and coral palette. No extra typing, helper subtitles, or appointment-availability promises. Inputs remain grouped on the final card. Back navigation preserves all selections and contact values. Reduced-motion behavior is retained.

Store priority and timing as nullable dedicated columns. Existing cached clients and already queued leads remain supported. Include supplied values in the idempotency hash. The callback SMS uses blank-line-separated sections: name/phone, vehicle, requested work/priority, timing, service address. Do not add tracking IDs, provider metadata, or internal staff names to the customer UI.

Analytics include a non-personal flow version and logical step name/position. Contact details remain excluded. This launch is not a randomized experiment; added steps are not evidence of improved conversion.

Verification: quote API/storage/notification tests, tracking suite, 18-route preservation contracts, desktop and 390px mobile UI, back-navigation retention, Tesla prefill, and removal wording. Apply the additive schema before promoting a release. Production sensitive database values cannot be exported through env pull; run the migration in an authenticated, non-promoted deployment and remove it afterward. Preserve the zero-config static build.
