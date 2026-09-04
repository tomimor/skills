# Word list

Distilled from the [Google word list](https://developers.google.com/style/word-list). When a term is marked "don't use," replace it or rewrite the sentence — don't keep it with a disclaimer.

## Never use

Non-inclusive, violent, or ableist terms. These are must-fix findings in a review.

| Don't use | Use instead |
|-----------|-------------|
| whitelist, whitelisted | allowlist, or rewrite: "allow requests from a range of IP addresses" |
| blacklist, blacklisted | denylist, blocklist, or rewrite |
| master / slave | primary / replica, primary / secondary, main, original |
| master (branch, key, record) | main, primary, source |
| native (as in "native speaker," "native app users") | built-in, core, integrated; or name the platform |
| sanity check | confidence check, quick check, validation |
| dummy value, dummy variable | placeholder, sample value, dummy is fine only in "dummy load" hardware contexts |
| grandfathered, grandfather clause | legacy, exempted, exempted by prior policy |
| crazy, insane, lame, dumb, blind to, deaf to, cripple, crippled, handicapped | unexpected, surprising, unaware of, disabled, limited, restricted |
| guys | everyone, folks, people, you all |
| man hours, manpower, manned, chairman, middleman | person hours, workforce, staffed, chair, intermediary |
| he, she, his, her (generic) | they, their; or rewrite in second person |
| abort | stop, cancel, end, exit |
| kill, terminate | stop, force quit, end, cancel |
| hit (a key or button) | press, click, tap |
| hang, hung | stop responding, freeze |
| segregate | separate, isolate |
| first-class citizen | fully supported, first-class (adjective) is acceptable for features, but prefer plain wording |
| normal user, sane default | typical user, standard user, default |

## Don't use (clarity and translation)

| Don't use | Use instead |
|-----------|-------------|
| e.g. | for example, such as |
| i.e. | that is, in other words |
| etc., and so forth | and so on; better, finish the list or say "such as" |
| via | with, by, through, using |
| vs. | versus, compared to |
| N.B., ergo, per se, viz. | plain English |
| in order to | to |
| utilize, leverage (verb) | use |
| allows you to, enables you to | lets you |
| please | (delete) |
| simply, just, easy, easily, effortless, straightforward, trivial | (delete; if the step is genuinely short, the reader will notice) |
| obviously, of course, clearly, needless to say | (delete) |
| note that, it is important to note that, it should be noted | (delete, or use a `Note:` callout) |
| in the event that | if |
| at this point in time, at this time | now — or better, delete it |
| a number of, a variety of | many, several, or the actual number |
| and/or | and, or, or "A, B, or both" |
| &amp; (ampersand) | and (unless part of a proper name) |
| slash (/) meaning "or" | or |
| we will, in this section we discuss, this document describes | (delete the pre-announcement and start) |
| deprecate (as "delete") | deprecate means "discourage but still supported"; use remove, delete, or turn down for actual removal |
| may | can (ability), might (possibility), must (requirement) — "may" is ambiguous |
| should (as a requirement) | must for requirements; keep should for recommendations |
| once (as "after") | after ("once" means "one time") |
| since (as "because") | because ("since" implies time) |
| while (as "although") | although, whereas |
| as (as "because") | because |
| above, below | preceding, following, earlier, later, or a link to the section |
| currently, presently, new, newly, recently, soon, upcoming, in the future | (delete — docs must read correctly a year from now) |
| easy to use, powerful, robust, seamless, world-class | describe what it does instead |
| think, want, know, see (of software) | don't anthropomorphize: "the parser rejects the input," not "the parser doesn't like the input" |
| jargon: bake in, drink from the firehose, low-hanging fruit, out of the box, ping me, dogfood, 10x | plain English |

## Preferred spelling and form

| Use | Not |
|-----|-----|
| email | e-mail |
| internet, web, website, webpage, web app | Internet, Web site, web page (as a compound noun) |
| sign in (verb), sign-in (noun/adjective) | log in, login, logon |
| sign out (verb), sign-out (noun) | log off, logout |
| set up (verb), setup (noun/adjective) | setup as a verb |
| back up (verb), backup (noun) | backup as a verb |
| open source (adjective and noun) | open-source |
| command line (noun), command-line (adjective) | commandline |
| data center, dataset, datastore | data-center, data set |
| filename, file system, hostname, username, timestamp | file name, filesystem, host name |
| runtime (noun/adjective), run time (duration) | |
| cannot | can not |
| ID, IDs | id, Id, ID's |
| APIs, URLs, SDKs | API's, URL's |
| on-premises | on-premise, on-prem |
| third-party (adjective), third party (noun) | |
| real time (noun), real-time (adjective) | |
| left pane, navigation menu | left-hand side, hamburger menu |

## Interaction verbs

| Verb | Use for |
|------|---------|
| click | Buttons, links, and controls on desktop UI. Not "click on." |
| tap | Touch interfaces. When the doc covers both, prefer a neutral verb: "select," "go to," "open." |
| select | Checkboxes, radio buttons, menu items, items in a list; also "clear" for deselecting a checkbox |
| enter | Supplying a value, however the reader supplies it: "In the **Name** field, enter a project name" |
| type | Only when the reader must literally type and not paste |
| press | Keys and key combinations: "press Enter," "press Ctrl+C" |
| go to | Navigating to a page or URL |
| open | Files, apps, dialogs |
| turn on / turn off | Toggles and settings — not "enable"/"disable" for the user's action; use enable/disable for what code does |
| run / execute | Commands and scripts — "run the command," not "issue" or "fire off" |

## Commonly confused

| Term | Meaning |
|------|---------|
| that / which | "that" introduces a restrictive clause (no comma); "which" introduces a nonrestrictive one (comma). Never drop "that" after verbs like verify, ensure, note: "Verify that the file exists." |
| its / it's | possessive / "it is" |
| affect / effect | verb / noun |
| ensure / insure / assure | make certain / indemnify / reassure a person |
| fewer / less | countable / uncountable |
| login / log in | noun / verb — but prefer sign-in and sign in |
| e.g. / i.e. | don't use either; "for example" / "that is" |
| deprecated / obsolete | discouraged but working / no longer available |
| parameter / argument | the declared name / the value passed |
| method / function | keep whatever the language calls it, consistently |
| API / service / product | don't swap synonyms mid-document; pick one term per concept and repeat it |

## Product and trademark names

- Spell out the full product name on first mention on a page; a short form is fine after that if the product has an official one.
- Don't abbreviate product names that have no official abbreviation, and don't invent acronyms.
- Don't make a product name possessive ("the Cloud Storage API," not "Cloud Storage's API"), plural, or a verb.
- Don't use a trademark as a noun stand-in for the generic thing.
