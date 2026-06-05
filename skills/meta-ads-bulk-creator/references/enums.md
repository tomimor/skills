# Quick enum reference

The full list of every column's valid values lives in [columns.md](columns.md) (auto-generated). This file just covers the enums you'll touch most often when writing a brief.

## Campaign Objective (column F)

The 2026 Outcome Driven Ad Experiences (ODAX) values:

- `Outcome Awareness`
- `Outcome Engagement`
- `Outcome Leads`
- `Outcome Sales`
- `App Promotion`

Legacy objectives (still accepted but Meta is migrating them):
`App Installs`, `Brand Awareness`, `Clicks to Website`, `Catalog Sales`, `Traffic`, `Conversions`, `Lead Generation`, `Reach`, `Video Views`, `Page Likes`, `Post Engagement`, `Messages`, `Store Visits`, `Store Traffic`, `Event Responses`, `Offer Claims`, `Page Post Engagement`, `Local Awareness`, `Mobile App Engagement`, `Mobile App Installs`, `Desktop App Engagement`, `Desktop App Installs`, `Product Catalog Sales`, `Website Conversions`.

## Buying Type (column G)

`AUCTION` (default), `FIXED_PRICE`, `RESERVED`, `MIXED`.

## Status (columns C, Q, CM)

`ACTIVE`, `PAUSED`, `ARCHIVED`, `DELETED`. The skill defaults all three to `PAUSED`.

## Special Ad Categories (column D)

Comma-separated list of any of:
`none`, `financial_products_services`, `employment`, `housing`, `issues_elections_politics`.

If anything other than `none`, narrow targeting (custom audiences, lookalikes, ZIP, narrow age) is automatically dropped by Meta. The skill drops it pre-emptively and warns.

## Bid strategy (columns K, BH)

`Highest volume or value` (default), `Bid cap`, `ROAS goal`.

For Outcome Sales with purchase value tracking, `ROAS goal` (also exposed as `VALUE` optimization goal) often outperforms.

## Optimization Goal (column BE)

Common 2026 values by objective:

| Objective | Recommended |
|-----------|-------------|
| Outcome Sales | `OFFSITE_CONVERSIONS` (purchase event) or `VALUE` |
| Outcome Leads | `LEAD_GENERATION` (in-platform form), `CONVERSATIONS` (Click-to-Message), `OFFSITE_CONVERSIONS` (Lead pixel event) |
| Outcome Awareness | `REACH`, `IMPRESSIONS`, `AD_RECALL_LIFT` |
| Outcome Engagement | `POST_ENGAGEMENT`, `THRUPLAY`, `LINK_CLICKS`, `CONVERSATIONS` |
| Outcome Traffic | `LINK_CLICKS`, `LANDING_PAGE_VIEWS` |
| App Promotion | `APP_INSTALLS`, `OFFSITE_CONVERSIONS`, `IN_APP_VALUE` |

The full enum has 60+ values — see `columns.md` for the complete list under `Optimization Goal`.

## Billing Event (column BF)

`IMPRESSIONS` (default for most objectives), `LINK_CLICKS`, `APP_INSTALLS`, `PAGE_LIKES`, `POST_ENGAGEMENT`, `OFFER_CLAIMS`, `VIDEO_VIEWS`, `THRUPLAY`. Tied to your optimization goal.

## Publisher Platforms (column AW)

Comma-separated list of: `facebook`, `instagram`, `audience_network`, `messenger`, `whatsapp`.

For Advantage+ Auto placements (skill default), leave this blank.

## Positions (columns AY–BD)

| Column | Common values |
|--------|---------------|
| Facebook Positions | `feed`, `right_hand_column`, `instant_article`, `instream_video`, `marketplace`, `story`, `search`, `video_feeds`, `groups_feed` |
| Instagram Positions | `stream`, `story`, `explore`, `reels`, `shop`, `profile_feed`, `ig_search` |
| Messenger Positions | `messenger_home`, `story`, `sponsored_messages` |
| Audience Network Positions | `classic`, `rewarded_video` |

For Advantage+ Auto placements, leave all blank.

## Call to Action (column DM)

The most-used 2026 CTAs:

- General: `LEARN_MORE`, `SHOP_NOW`, `SIGN_UP`, `SUBSCRIBE`, `DOWNLOAD`, `BOOK_NOW`, `SEE_MORE`
- Sales: `BUY_NOW`, `BUY_TICKETS`, `ORDER_NOW`, `ADD_TO_CART`, `GET_OFFER`, `BUY_VIA_MESSAGE`
- Leads / messaging: `WHATSAPP_MESSAGE`, `MESSAGE_PAGE`, `CONTACT_US`, `GET_QUOTE`, `GET_A_QUOTE`, `INQUIRE_NOW`, `SEND_TIP`
- Apps: `INSTALL_MOBILE_APP`, `USE_APP`, `PLAY_GAME`, `TRY_NOW`
- Engagement: `LIKE_PAGE`, `WATCH_VIDEO`, `WATCH_MORE`, `LISTEN_NOW`, `INTERESTED`
- Travel / events: `BOOK_TRAVEL`, `GET_DIRECTIONS`, `GET_SHOWTIMES`, `GET_EVENT_TICKETS`, `CHECK_AVAILABILITY`

The full enum has 100+ values — see `columns.md`.

## Creative Type (column CT)

`Page post ad` (most common — links the ad to a Page post), `Standard` (right-column-only), or leave blank.

When using `Page post ad`, populate `Link Object ID` (column W) with the Page ID and optionally `Story ID` (column DN) with an existing post ID for social-proof preservation.
