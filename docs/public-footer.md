# Public footer and SWMO Facebook link

The home, downloads, delete-account, Explore, and public report-detail routes use the same `PublicFooter`. It retains the office information, navigation, photo credits, and contact form. The footer stays available after the account-deletion success screen. Explore keeps its viewport-sized map with the footer below it.

Administrators configure the link in **System settings → Contact & office → SWMO Facebook page URL**, then choose **Save changes**. The CMS key is `contact_swmo_facebook_url`; its default is `https://www.facebook.com/profile.php?id=61583154152189`. A blank value hides the link. Existing city/PIO social settings are preserved independently. The public CMS endpoint supplies the saved value; the backend's existing one-minute CMS cache applies.

Only HTTPS Facebook URLs without embedded credentials are accepted by the backend, and the footer checks the URL before rendering it. The link opens a new tab with `noopener noreferrer`. Shared guide links point to the home page anchors, and Android App links to downloads, so navigation works from every public route.

Browser checks cover the shared footer on all five routes in light/dark themes, admin save/reload, the blank-link setting, widths 320/768/1024/1440, and contact-form failure recovery and successful reset. Contact requests in tests are intercepted and do not send real messages. Backend checks cover defaults, persistence, preserving other office settings, and rejecting unsafe links.
