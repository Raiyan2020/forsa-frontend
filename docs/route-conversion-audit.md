# React to Next route conversion audit

Audit basis: every `path` entry in `fursa_frontend/src/routes/index.tsx` was matched to an App Router page in `fursa-next/app` and then traced to the rendered component. A **stub** is a route whose component still renders only a loading placeholder (including the loader-only `VolunteerProfile`).

Summary after the event-details conversion:

- 68 React route entries reviewed.
- 30 routes have substantive Next implementations.
- 38 routes still resolve to 36 placeholder components (two components are shared by route aliases/variants).
- All React route patterns now have a Next counterpart.
- All dynamic App Router pages now await the Next 16 `params` promise.

| # | React route | Next route | Status |
|---:|---|---|---|
| 1 | `/` | `/` | Converted |
| 2 | `/partner` | `/partner` | Converted |
| 3 | `/sponsorship-form` | `/sponsorship-form` | Converted |
| 4 | `/volunteer-profile` | `/volunteer-profile` | **Stub — `VolunteerProfile` is loader-only** |
| 5 | `/entities-profile` | `/entities-profile` | **Stub — `OrganizerProfile`** |
| 6 | `/volunteer-private-profile/:id` | `/volunteer-private-profile/[id]` | **Stub — `VolunteerPrivateProfile`** |
| 7 | `/notification` | `/notification` | **Stub — `Notification`** |
| 8 | `/joinus` | `/joinus` | Converted |
| 9 | `/individual-form` | `/individual-form` | Converted |
| 10 | `/entities-form` | `/entities-form` | Converted |
| 11 | `/login` | `/login` | Converted; return-to handling added for event registration |
| 12 | `/forgot-password` | `/forgot-password` | Converted |
| 13 | `/reset-password` | `/reset-password` | Converted |
| 14 | `/email-verification` | `/email-verification` | Converted |
| 15 | `/volunteer-mandate-details` | `/volunteer-mandate-details` | **Stub — `VolunteerMandateDetails`** |
| 16 | `/account-information` | `/account-information` | **Stub — `AccountInformation`** |
| 17 | `/complete-details` | `/complete-details` | **Stub — `CompleteDetails`** |
| 18 | `/volunteer-qr-code` | `/volunteer-qr-code` | **Stub — `QRCode`** |
| 19 | `/thankyou` | `/thankyou` | Converted |
| 20 | `/about-us` | `/about-us` | Converted |
| 21 | `/opportunities` | `/opportunities` | Converted |
| 22 | `/volunteer-opportunities-list` | `/volunteer-opportunities-list` | Converted |
| 23 | `/learn-and-share-list` | `/learn-and-share-list` | Converted |
| 24 | `/volunteer-form` | `/volunteer-form` | **Stub — `VolunteerForm`** |
| 25 | `/learn-and-share-form` | `/learn-and-share-form` | **Stub — `LearnServeForm`** |
| 26 | `/volunteer-event-detail/:opportunityId` | `/volunteer-event-detail/[opportunityId]` | **Stub — `VolunteerEvent`** |
| 27 | `/volunteer-event-detail/:opportunityId/:organizationId` | `/volunteer-event-detail/[opportunityId]/[organizationId]` | **Stub — `VolunteerEvent`; missing Next route pattern restored** |
| 28 | `/learn-share-event-detail/:opportunityId` | `/learn-share-event-detail/[opportunityId]` | **Stub — `LearnServeDetails`** |
| 29 | `/volunteerlist` | `/volunteerlist` | **Stub — `VolunteerList`** |
| 30 | `/scan-permission` | `/scan-permission` | **Stub — `ScanPermission`** |
| 31 | `/register-now` | `/register-now` | **Stub — `RegisterNow`** |
| 32 | `/posting-thankyou` | `/posting-thankyou` | **Stub — `PostingThankyou`** |
| 33 | `/event-post-thankyou` | `/event-post-thankyou` | **Stub — `EventPostThankyou`** |
| 34 | `/event-thankyou` | `/event-thankyou` | **Stub — `EventThankyou`** |
| 35 | `/more-profile` | `/more-profile` | Converted |
| 36 | `/faq` | `/faq` | Converted |
| 37 | `/privacy-policy` | `/privacy-policy` | Converted |
| 38 | `/contact-us` | `/contact-us` | Converted |
| 39 | `/leran-share-register-list` | `/leran-share-register-list` | **Stub — `RegisterListForLearnandServe`** |
| 40 | `/learn-share-register-list` | `/learn-share-register-list` | **Stub — `RegisterList`** |
| 41 | `/events-and-activities` | `/events-and-activities` | Converted |
| 42 | `/event-form` | `/event-form` | **Stub — `EventForm`** |
| 43 | `/event-seminar-list` | `/event-seminar-list` | **Stub — `EventSeminarList`** |
| 44 | `/event-exhibition-list` | `/event-exhibition-list` | **Stub — `EventExhibitionList`** |
| 45 | `/event-sports-list` | `/event-sports-list` | **Stub — `EventSportsList`** |
| 46 | `/event-camps-list` | `/event-camps-list` | **Stub — `EventCampsList`** |
| 47 | `/volunteer-profiles-list` | `/volunteer-profiles-list` | **Stub — `VolunteerProfilesList`** |
| 48 | `/entities-profiles-list` | `/entities-profiles-list` | **Stub — `OrganizationProfilesList`** |
| 49 | `/volunteer-team-profiles-list` | `/volunteer-team-profiles-list` | **Stub — `VolunteerteamProfilesList`** |
| 50 | `/event-thankyoupage` | `/event-thankyoupage` | **Stub — aliases `EventThankyou`** |
| 51 | `/event-details/:eventId` | `/event-details/[eventId]` | **Converted in this change** |
| 52 | `/event-register-list` | `/event-register-list` | **Stub — `EventRegisterList`** |
| 53 | `/achievements` | `/achievements` | Converted |
| 54 | `/public-profile/:id` | `/public-profile/[id]` | **Converted — organization and volunteer public profiles** |
| 55 | `/community` | `/community` | Converted |
| 56 | `/community-detail/:id` | `/community-detail/[id]` | **Stub — `CommunityDetailPage`** |
| 57 | `/community/:postId/reply/:replyId` | `/community/[postId]/reply/[replyId]` | **Stub — `ReplyDetailPage`** |
| 58 | `/calendar` | `/calendar` | **Stub — `Calendar`** |
| 59 | `/Community-List` | `/Community-List` | **Stub — `CommunityList`** |
| 60 | `/termsofuse` | `/termsofuse` | Converted |
| 61 | `/volunteer-scan-qr` | `/volunteer-scan-qr` | **Stub — `OrganizerQRCode`** |
| 62 | `/linkedin/callback` | `/linkedin/callback` | **Stub — `LinkedinCallback`** |
| 63 | `/404` | `/404` | Converted |
| 64 | `*` | `app/not-found.tsx` | Converted |
| 65 | `/scan-qr/:opportunityId?/:eventId?` | `/scan-qr/[[...params]]` | **Stub — `ScanQR`** |
| 66 | `/achievement-reports` | `/achievement-reports` | Converted; missing volunteer-only guard restored |
| 67 | `/certificate` | `/certificate` | Converted |
| 68 | `/verify-report/:uuid` | `/verify-report/[uuid]` | Converted |

## Recommended conversion order

The remaining pages should be converted by dependency group so each route can be verified before work moves to the next group:

1. Event flow: event form, thank-you pages, category lists, registration list.
2. Opportunity flow: volunteer and learn/share details, forms, registration and attendance pages.
3. Profile flow: volunteer/organizer profiles, private profiles, profile lists, QR pages.
4. Community detail flow: topic list, post detail, reply detail.
5. Account/auth completion: mandate details, complete details, account information, LinkedIn callback.
6. Calendar and notifications.

This order follows the user-visible navigation dependencies; for example, the newly converted event-details edit and registration paths currently lead to event-flow pages that are still placeholders.
