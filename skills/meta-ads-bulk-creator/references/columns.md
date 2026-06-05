# Columns reference

Generated from `assets/AdsManagerTemplate_v2.3.xltx` by `scripts/extract_columns.py`.
Total columns: **143** (sheet `Ads Manager Template`, range A1:EM1).

Re-run `python scripts/extract_columns.py` whenever the bundled template changes.

## Campaign (15 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| A | Campaign ID | Standard numbering format, not in scientific notation, no decimals or commas | Required for edits |  |
| B | Campaign Name | 35 character limit. | Recommended |  |
| C | Campaign Status | Active, paused | Recommended | ACTIVE, ARCHIVED, DELETED, PAUSED |
| D | Special Ad Categories | List one or more of the following, separated by comma: none, financial_products_services, employment, housing, issues_elections_politics. | Required for all advertisers. Input 'none' if none of the categories apply. |  |
| E | Special Ad Category Country | Two digit ISO country abbreviation | Required for political ads. |  |
| F | Campaign Objective |  | Required | App Installs, Brand Awareness, Clicks to Website, Catalog Sales, Traffic, Desktop App Engagement, Desktop App Installs, Event Responses, Local Awareness, Messages, Mobile App Engagement, Mobile App In … |
| G | Buying Type |  |  | AUCTION, FIXED_PRICE, RESERVED, MIXED |
| H | Campaign Spend Limit | Standard numbering format, decimals up to 2 points, currency symbol not needed. | Optional |  |
| I | Campaign Daily Budget | Standard numbering format, decimals up to 2 points, currency symbol not needed. | Optional |  |
| J | Campaign Lifetime Budget | Standard numbering format, decimals up to 2 points, currency symbol not needed. | Optional |  |
| K | Campaign Bid Strategy |  | Optional | Bid cap, ROAS goal, Highest volume or value |
| L | Tags | Comma-separated | Optional |  |
| M | Campaign Is Using L3 Schedule | Standard boolean format. | Recommended |  |
| N | Campaign Start Time | MM/DD/YY HH:MM | Recommended |  |
| O | Campaign Stop Time | MM/DD/YY HH:MM | Recommended |  |

## Ad Set (10 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| P | Ad Set ID | Standard numbering format, not in scientific notation, no decimals or commas | Required for edits |  |
| Q | Ad Set Run Status | Active, paused | Recommended | PAUSED, ACTIVE |
| R | Ad Set Name | 35 character limit. | Recommended |  |
| S | Ad Set Time Start | MM/DD/YY HH:MM | Recommended |  |
| T | Ad Set Time Stop | MM/DD/YY HH:MM | Recommended |  |
| U | Ad Set Daily Budget | Standard numbering format, decimals up to 2 points, currency symbol not needed. | Required (if on daily budget and not using campaign budget optimization) |  |
| V | Ad Set Lifetime Budget | Standard numbering format, decimals up to 2 points, currency symbol not needed. | Required (if on lifetime budget and not using campaign budget optimization) |  |
| BH | Ad Set Bid Strategy |  | Required if Advantage campaign budget is disabled. | Bid cap, Highest volume or value, Highest Value |
| BR | Ad Set Minimum Spend Limit | Standard numbering format, decimals up to 2 points, currency symbol not needed. | Optional |  |
| BS | Ad Set Maximum Spend Limit | Standard numbering format, decimals up to 2 points, currency symbol not needed. | Optional |  |

## Targeting (37 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| Z | Countries | ISO country code (ex. US) | Required |  |
| AA | Global Regions | Country group code (ex. europe, north_america, eea) | Optional |  |
| AB | Excluded Global Regions | Country group code (ex. europe, north_america, eea) | Optional |  |
| AC | Cities | eg. Palo Alto, CA; New York, NY. | Optional |  |
| AD | Regions | Delimit multiple options with a ",". Please only enter valid states or regions for the country specified. | Optional |  |
| AE | Zip | Delimit multiple options with a ",". Please only enter valid zip codes for the country specified. | Optional |  |
| AF | Gender | Men, women | Optional |  |
| AG | Age Min | Standard numbering format. | Optional |  |
| AH | Age Max | Standard numbering format | Optional |  |
| AI | Education Status | College, alumni, high school | Optional |  |
| AJ | College Start Year | YYYY (ex. 2002) | Optional |  |
| AK | College End Year | YYYY (ex. 2006) | Optional |  |
| AL | Interested In | Men, women | Optional |  |
| AM | Relationship | Single, relationship, engaged, married | Optional |  |
| AN | Connections |  | Optional |  |
| AO | Excluded Connections |  | Optional |  |
| AP | Friends of Connections |  | Optional |  |
| AQ | Locales |  | Optional |  |
| AR | Broad Category Clusters | [ID]:[Cluster Name] | Optional (populated from asset sheet) |  |
| AS | Custom Audiences | [ID]:[Audience Name], separated by commas. For example: 12345:customers, 12346:other audience | Optional |  |
| AT | Excluded Custom Audiences | [ID]:[Audience Name], separated by commas. For example: 12345:customers, 12346:other audience | Optional |  |
| AU | Location Cluster IDs |  | Optional |  |
| AV | Excluded Location Cluster IDs |  | Optional |  |
| BX | Large Geo Areas |  | Optional |  |
| BY | Excluded Large Geo Areas |  | Optional |  |
| BZ | Medium Geo Areas |  | Optional |  |
| CA | Excluded Medium Geo Areas |  | Optional |  |
| CB | Small Geo Areas |  | Optional |  |
| CC | Excluded Small Geo Areas |  | Optional |  |
| CD | Metro Areas |  | Optional |  |
| CE | Excluded Metro Areas |  | Optional |  |
| CF | Subcities |  | Optional |  |
| CG | Excluded Subcities |  | Optional |  |
| CH | Neighborhoods |  | Optional |  |
| CI | Excluded Neighborhoods |  | Optional |  |
| CJ | Subneighborhoods |  | Optional |  |
| CK | Excluded Subneighborhoods |  | Optional |  |

## Placements (8 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| AW | Publisher Platforms | Any combination of facebook, instagram, audience_network, messenger or whatsapp | Optional | facebook, instagram, audience_network, messenger, whatsapp |
| AX | Device Platforms | Any combination of mobile or desktop | Required |  |
| AY | Facebook Positions | Any combination of feed, right_hand_column, instant_article, instream_video or group | Optional | feed, right_hand_column, instant_article, instream_video, group |
| AZ | Instagram Positions | Any combination of stream or story | Optional | stream, story |
| BA | Messenger Positions | Any combination of sponsored_messages or messenger_home | Optional | sponsored_messages |
| BB | Oculus Positions | Any combination of vr_apps, twilight_feed or vr_rewarded_video | Optional | vr_apps, twilight_feed, vr_rewarded_video |
| BC | Audience Network Positions | Any combination of classic, instream_video or rewarded_video | Optional | classic, instream_video, rewarded_video |
| BD | WhatsApp Positions | Any combination of marketing_messages | Optional | marketing_messages |

## Delivery (4 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| BE | Optimization Goal |  | Required | NONE, APP_INSTALLS, BRAND_AWARENESS, AD_RECALL_LIFT, CLICKS, ENGAGED_USERS, DWELLS, EVENT_RESPONSES, IMPRESSIONS, LEAD_GENERATION, QUALITY_LEAD, LINK_CLICKS, MEDIA_DOWNLOADS, OFFER_CLAIMS, OFFSITE_CON … |
| BF | Billing Event |  | Required | APP_INSTALLS, IMPRESSIONS, LINK_CLICKS, OFFER_CLAIMS, PAGE_LIKES, POST_ENGAGEMENT, VIDEO_VIEWS, TWO_SECOND_CONTINUOUS_VIDEO_VIEWS, COMPLETED_VIDEO_VIEWS, THRUPLAY, PURCHASE, LISTING_INTERACTION, SIX_S … |
| BG | Bid Amount | X.XX | Required |  |
| BQ | Minimum ROAS |  | Optional |  |

## Compliance (12 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| BI | Beneficiary (financial ads in Taiwan) |  | Required for new, edited, or duplicated ad sets about financial products and services, with audiences in Taiwan. |  |
| BJ | Payer (financial ads in Taiwan) |  | Required for new, edited, or duplicated ad sets about financial products and services, with audiences in Taiwan. |  |
| BK | Advertiser (Taiwan) |  | Required for ad sets that include locations in Taiwan. |  |
| BL | Payer (Taiwan) |  | Required for ad sets that include locations in Taiwan. |  |
| BM | Advertiser (financial ads in Australia) |  | Required for new, edited, or duplicated ad sets about financial products and services, with audiences in Australia. |  |
| BN | Payer (financial ads in Australia) |  | Required for new, edited, or duplicated ad sets about financial products and services, with audiences in Australia. |  |
| BO | Advertiser (Singapore) |  | Required for ad sets that include locations in Singapore. |  |
| BP | Payer (Singapore) |  | Required for ad sets that include locations in Singapore. |  |
| BT | Advertiser (securities ads in India) |  | Required for new, edited, or duplicated ad sets about financial products and services, with audiences in India. |  |
| BU | Payer (securities ads in India) |  | Required for new, edited, or duplicated ad sets about financial products and services, with audiences in India. |  |
| BV | Beneficiary (selected locations) |  | May be required for some ad sets. |  |
| BW | Payer (selected locations) |  | May be required for some ad sets. |  |

## Ad (3 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| CL | Ad ID | Standard numbering format, not in scientific notation, no decimals or commas | Required for edits |  |
| CM | Ad Status | Active, paused | Recommended | PAUSED, ACTIVE |
| CN | Ad Name | 35 character limit. | Required |  |

## Creative (14 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| W | Link Object ID | Page ID or Event ID if creative type is filled out | Link object ID: Required only if you choose a creative_type of "fan" or "rsvp". |  |
| X | Link | URL | Required |  |
| Y | Application ID | Standard numbering format, not in scientific notation, no decimals or commas | Required for app install and app engagement ads. |  |
| CO | Title | 25 character limit - must adhere to the ad guidelines | Required |  |
| CP | Body | 90-character limit for right-hand column ads, or 500-character limit for Feed ads. Must adhere to the ad guidelines. | Required |  |
| CQ | Link Description |  | Optional |  |
| CR | Display Link | Domain (eg. "www.example.com") | Optional |  |
| CS | Image Hash |  | Required when making edits |  |
| CT | Creative Type | Standard (right-hand column only) or Page post ad | Required |  |
| CU | URL Tags |  |  |  |
| CV | Image File Name | Image1.jpg | Required |  |
| CW | Creative Optimization | Yes if you want this or no if you don't. | Optional |  |
| DM | Call to Action |  | Optional | BOOK_TRAVEL, CONTACT_US, DONATE, DONATE_NOW, DOWNLOAD, GET_DIRECTIONS, GO_LIVE, INTERESTED, LEARN_MORE, SEE_DETAILS, LIKE_PAGE, MESSAGE_PAGE, RAISE_MONEY, SAVE, SEND_TIP, SHOP_NOW, SIGN_UP, VIEW_INSTA … |
| DN | Story ID | Standard numbering format, not in scientific notation, no decimals or commas | Required for Page post ad units |  |

## Carousel (15 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| CX | Product 1 - Link | A complete URL | Required for multi image/link only |  |
| CY | Product 1 - Name |  | Required for multi image/link only |  |
| CZ | Product 1 - Description |  | Optional |  |
| DA | Product 1 - Marketing Message - Description |  | Optional |  |
| DB | Product 1 - Image Hash | Recommended size: 600 x 600 pixels | Required for multi image/link only |  |
| DC | Product 2 - Link | A complete URL | Required for multi image/link only |  |
| DD | Product 2 - Name |  | Required for multi image/link only |  |
| DE | Product 2 - Description |  | Optional |  |
| DF | Product 2 - Marketing Message - Description |  | Optional |  |
| DG | Product 2 - Image Hash | Recommended size: 600 x 600 pixels | Required for multi image/link only |  |
| DH | Product 3 - Link | A complete URL | Required for multi image/link only |  |
| DI | Product 3 - Name |  | Required for multi image/link only |  |
| DJ | Product 3 - Description |  | Optional |  |
| DK | Product 3 - Marketing Message - Description |  | Optional |  |
| DL | Product 3 - Image Hash | Recommended size: 600 x 600 pixels | Required for multi image/link only |  |

## Marketing Messages (25 columns)

| Col | Name | Format | Required | Valid values |
|-----|------|--------|----------|--------------|
| DO | Marketing Message Primary Text | 960 character limit. | Body text is required for messages. |  |
| DP | Marketing Message Auto Reply - Body Text | 600 character limit. | Required for marketing message auto reply. |  |
| DQ | Marketing Message Auto Reply - Image Hash |  | Optional |  |
| DR | Marketing Message Auto Reply - Video ID |  | Optional |  |
| DS | Marketing Message Auto Reply - Button 1 - Text | 20 character limit. | Required for a marketing message auto reply button. |  |
| DT | Marketing Message Auto Reply - Button 1 - Type |  | Required for a marketing message auto reply button. |  |
| DU | Marketing Message Auto Reply - Button 1 - URL | 2000 character limit. | Required for a marketing message auto reply button. |  |
| DV | Marketing Message Button 1 - Button Text | 25 character limit. | Optional |  |
| DW | Marketing Message Button 1 - Type |  | Optional |  |
| DX | Marketing Message Button 1 - Response Text | 960 character limit. | Required for reply button. |  |
| DY | Marketing Message Button 1 - Image Hash |  | Optional |  |
| DZ | Marketing Message Button 1 - Video ID |  | Optional |  |
| EA | Marketing Message Button 1 - Video Thumbnail URL |  | Optional |  |
| EB | Marketing Message Button 1 - Call to Action Button - Text | 20 character limit. | Required for a call to action button. |  |
| EC | Marketing Message Button 1 - Call to Action Button - Type |  | Required for a call to action button. |  |
| ED | Marketing Message Button 1 - Call to Action Button - URL | 2000 character limit. | Required for a call to action button. |  |
| EE | Marketing Message Button 2 - Button Text | 25 character limit. | Optional |  |
| EF | Marketing Message Button 2 - Type |  | Optional |  |
| EG | Marketing Message Button 2 - Response Text | 960 character limit. | Required for reply button. |  |
| EH | Marketing Message Button 2 - Image Hash |  | Optional |  |
| EI | Marketing Message Button 2 - Video ID |  | Optional |  |
| EJ | Marketing Message Button 2 - Video Thumbnail URL |  | Optional |  |
| EK | Marketing Message Button 2 - Call to Action Button - Text | 20 character limit. | Required for a call to action button. |  |
| EL | Marketing Message Button 2 - Call to Action Button - Type |  | Required for a call to action button. |  |
| EM | Marketing Message Button 2 - Call to Action Button - URL | 2000 character limit. | Required for a call to action button. |  |
