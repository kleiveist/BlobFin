# BlobFin Design System

Diese Datei dokumentiert die aktuellen Design-Elemente aus:

- `frontend/src/styles.css`
- `frontend/src/views/templates.ts`
- `frontend/src/main.ts`
- `frontend/src/views/investmentChart.ts`
- `frontend/anlageentwicklung_grafik_html.html` als Standalone/Prototyp-Datei
- `src-tauri/icons/` fuer App-Icons

## Grundstil

BlobFin ist ein ruhiges Finanz- und Planungstool. Die Oberflaeche nutzt kompakte Panels, Tabellen, Kennzahlen, Segment-Schalter und Diagramme. Der Primaerakzent ist Gruen/Teal. Rot markiert Ausgaben, Fehler und Steuerlasten. Gold markiert Auswahl, dauerhafte Werte oder Defizit-Hinweise. Die App hat ein helles und ein dunkles Theme ueber CSS-Variablen.

## Farben: App Theme Hell

| Token | Kategorie | Hex / Wert | Verwendung |
| --- | --- | --- | --- |
| `--page` | Hintergrund | `#F7F4ED` | Body/App-Hintergrund, Meta-Theme-Color hell |
| `--surface` | Flaeche | `#FFFDF8` | Panels, Popover, Chart-Center |
| `--surface-muted` | Flaeche gedimmt | `#F1ECE2` | Tabellenkopf, Tabellenfuss |
| `--surface-soft` | Flaeche weich | `#FFFAF0` | Schalter, kleine Karten, Inputs-Gruppen |
| `--text` | Text primaer | `#1F2528` | Haupttext |
| `--muted` | Text sekundaer | `#687071` | Labels, Hilfstexte, Legenden |
| `--border` | Linie | `#D8D0C2` | Panel-, Input-, Popover- und Tabellenrahmen |
| `--row-border` | Tabellenlinie | `#E8E1D6` | Zeilenlinien |
| `--input-bg` | Input-Flaeche | `#FFFFFF` | Inputs und Selects |
| `--table-bg` | Tabellenflaeche | `#FFFFFF` | Tabellenkoerper |
| `--metric-bg` | Kennzahl-Flaeche | `#FFFFFF` | Normale Metrik-Karten |
| `--metric-strong-bg` | Kennzahl stark | `#EDF8F4 -> #FFFDF8` | Linearer Verlauf fuer starke Metriken |
| `--danger-soft` | Gefahr weich | `#F9DED9` | Danger-Buttons und Delete-Buttons |
| `--highlight` | Highlight | `#E6F3EF` | Hervorgehobene Tabellen-Spalte |
| `--drag-over` | Drag-Ziel | `#EDF8F4` | Tabellenzeile beim Drag-over |
| `--accent` | Primaer | `#1F7A68` | Primaerbutton, aktive Tabs, Sparen-Balken |
| `--accent-strong` | Primaer dunkel | `#145648` | Headline-Akzent, Sekundaerbutton-Text |
| `--accent-soft` | Primaer weich | `#D9EDE7` | Sekundaerbutton, Infobox, Toggle-Flaeche |
| `--gold` | Gold | `#B87514` | Markierung, permanente Werte |
| `--gold-soft` | Gold weich | `#F3DFBA` | Markierte Position, permanente Spalte |
| `--reserve` | Ruecklagen | `#C65F1A` | Ruecklagen-Balken und Kreisdiagramm-Segment |
| `--danger` | Negativ/Gefahr | `#B42318` | Negative Werte, Ausgaben, Danger-Text |
| `--good` | Positiv | `#11795F` | Positive Werte, Einnahmen |
| `--focus` | Fokus | `rgba(31, 122, 104, 0.18)` / `#1F7A682E` | Focus outline |
| `--shadow` | Schatten | `rgba(54, 44, 28, 0.08)` / `#362C1C14` | Panel-Schatten |

## Farben: App Theme Dunkel

| Token | Kategorie | Hex / Wert | Verwendung |
| --- | --- | --- | --- |
| `--page` | Hintergrund | `#101412` | Body/App-Hintergrund, Meta-Theme-Color dunkel |
| `--surface` | Flaeche | `#171D1A` | Panels und Popover |
| `--surface-muted` | Flaeche gedimmt | `#202821` | Tabellenkopf, Tabellenfuss |
| `--surface-soft` | Flaeche weich | `#1D241F` | Schalter, kleine Karten, Inputs-Gruppen |
| `--text` | Text primaer | `#E7ECE8` | Haupttext |
| `--muted` | Text sekundaer | `#A6B0AA` | Labels, Hilfstexte, Legenden |
| `--border` | Linie | `#334039` | Panel-, Input-, Popover- und Tabellenrahmen |
| `--row-border` | Tabellenlinie | `#28332D` | Zeilenlinien |
| `--input-bg` | Input-Flaeche | `#111614` | Inputs und Selects |
| `--table-bg` | Tabellenflaeche | `#151B18` | Tabellenkoerper |
| `--metric-bg` | Kennzahl-Flaeche | `#141A17` | Normale Metrik-Karten |
| `--metric-strong-bg` | Kennzahl stark | `#18352E -> #141A17` | Linearer Verlauf fuer starke Metriken |
| `--danger-soft` | Gefahr weich | `#3B1D1B` | Danger-Buttons und Delete-Buttons |
| `--highlight` | Highlight | `#18372F` | Hervorgehobene Tabellen-Spalte |
| `--drag-over` | Drag-Ziel | `#18352E` | Tabellenzeile beim Drag-over |
| `--accent` | Primaer | `#46C49D` | Primaerbutton, aktive Tabs, Sparen-Balken |
| `--accent-strong` | Primaer hell | `#A6EAD1` | Headline-Akzent, Sekundaerbutton-Text |
| `--accent-soft` | Primaer weich | `#203B33` | Sekundaerbutton, Infobox, Toggle-Flaeche |
| `--gold` | Gold | `#E5B760` | Markierung, permanente Werte |
| `--gold-soft` | Gold weich | `#352A18` | Markierte Position, permanente Spalte |
| `--reserve` | Ruecklagen | `#F09A54` | Ruecklagen-Balken und Kreisdiagramm-Segment |
| `--danger` | Negativ/Gefahr | `#FF8A80` | Negative Werte, Ausgaben, Danger-Text |
| `--good` | Positiv | `#6FE0B4` | Positive Werte, Einnahmen |
| `--focus` | Fokus | `rgba(70, 196, 157, 0.25)` / `#46C49D40` | Focus outline |
| `--shadow` | Schatten | `rgba(0, 0, 0, 0.30)` / `#0000004D` | Panel-Schatten |

## Direkte Farben ausserhalb der Tokens

| Hex / Wert | Kategorie | Verwendung |
| --- | --- | --- |
| `#FFFFFF` | Text/Flaeche | Aktiver Button-Text, Input- und Tabellenflaechen im hellen Theme |
| `#A7CFC3` | Linie | `metric.strong` Border im hellen Theme |
| `rgba(31, 37, 40, 0.20)` / `#1F252833` | Schatten | Settings-Popover hell |
| `rgba(0, 0, 0, 0.45)` / `#00000073` | Schatten | Settings-Popover dunkel |
| `rgba(54, 44, 28, 0.18)` / `#362C1C2E` | Schatten | Reserve-Chart-Popup hell |
| `rgba(0, 0, 0, 0.38)` / `#00000061` | Schatten | Investment-Chart-Popup |
| `rgba(255, 255, 255, 0.86)` / `#FFFFFFDB` | Text | Aktiver Include-Transfer-Subtext |
| `#FFFDF8` + `#D9EDE7` | Swatch | Hell-Theme-Farbkreis |
| `#111614` + `#46C49D` | Swatch | Dunkel-Theme-Farbkreis |

## Diagrammfarben: Investment Chart

| Token | Hell | Dunkel | Verwendung |
| --- | --- | --- | --- |
| `--chart-bg` | `#FFFDF8` | `#17191C` | Chart-Hintergrund |
| `--chart-field` | `#F1ECE2` | `#111315` | Chart-Metriken und Popup |
| `--chart-text` | `#1F2528` | `#E5E7EB` | Chart-Haupttext |
| `--chart-muted` | `#687071` | `#9CA3AF` | Achsen, Labels, Legende |
| `--chart-border` | `#D8D0C2` | `#2F3338` | Chart-Kanten, Popup-Linien |
| `--chart-grid` | `#DBE4DF` | `#2A2D31` | Rasterlinien |
| `--chart-green` | `#43B20A` | `#43B20A` | Wertzuwachs |
| `--chart-purple` | `#9B94FF` | `#9B94FF` | Restguthaben/Auszahlung, Rentenlabel |
| `--chart-grey` | `#777B82` | `#777B82` | Eigenbeitrag |
| `--chart-orange` | `#FF7A00` | `#FF7A00` | Zulagen |
| `--chart-red` | `#FF5B63` | `#FF5B63` | Kapitalertragsteuer, normales Depot als Dash-Line |
| `--chart-retirement` | `#6F7975` | `#0C0D0E` | Vertikale Rentenlinie |

Investment-Canvas:

- Mindestgroesse: `320px x 360px`
- CSS-Hoehe: `min(62vh, 640px)`, mobil `460px`
- Balkenbreite: `3px` bis `16px`
- Balkenradius oben: bis `6px`
- Raster: `1px`, `--chart-grid`, Alpha `0.45`
- Normales Depot: `2px`, `--chart-red`, Dash `[8, 8]`
- Rentenlinie: `2px`, `--chart-retirement`, Dash `[3, 3]`
- Achsentext: `16px system-ui`, Achsentitel `18px system-ui`
- Auszahlungsphase: `--chart-purple` Basis, graues Overlay mit Alpha `0.55`

## Diagrammfarben: Reserve Chart

| Element | Token / Hex | Verwendung |
| --- | --- | --- |
| Einnahmen | `--good` (`#11795F` hell, `#6FE0B4` dunkel) | Balken, Statistik, positives Ergebnis |
| Ausgaben | `--danger` (`#B42318` hell, `#FF8A80` dunkel) | Balken, Statistik, negatives Ergebnis |
| Ruecklagen | `--reserve` (`#C65F1A` hell, `#F09A54` dunkel) | Balken, Statistik, Kreisdiagramm-Segment |
| Sparen | `--accent` (`#1F7A68` hell, `#46C49D` dunkel) | Balken und Kreisdiagramm-Segment |
| Markierte Position | `--gold` (`#B87514` hell, `#E5B760` dunkel) | Selektierter Balken und Legendenpunkt |
| Markierte Position weich | `--gold-soft` (`#F3DFBA` hell, `#352A18` dunkel) | Hintergrund aktiver Positionskarte |
| Uebrig | `--good` | Kreisdiagramm-Segment |
| Fehlbetrag | `--gold` | Kreisdiagramm-Segment |
| Deaktivierte Balken | Opacity `0.16` | Filter bei aktiver Kategorie |
| Plot-Linie unten | `--row-border` | Unterkante der Monatsbalken |

Reserve-Chart-Regeln:

- Plot: `12` Monats-Spalten, `8px` Gap, `1px` Border, `8px` Radius.
- Monatsbalken: `12px` breit, `3px` Mindesthoehe, Radius `5px 5px 0 0`.
- Selektionsbalken: `8px` breit, `--gold`, Ring `0 0 0 2px --gold-soft`.
- Kreisdiagramm: `conic-gradient` aus Ausgaben, Ruecklagen, Sparen, Uebrig, Fehlbetrag.
- Kreisdiagramm-Center: `52%` Durchmesser, `1px` Border, `--surface`.

## Typografie

| Element | Groesse / Gewicht | Farbe | Regel |
| --- | --- | --- | --- |
| Body | Systemstack `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `--text` | `line-height: 1.45` |
| Eyebrow | `0.78rem`, `800` | `--accent-strong` | Uppercase, `letter-spacing: 0.08em` |
| H1 | `clamp(1.7rem, 2.8vw, 2.8rem)` | `--text` | `letter-spacing: 0` |
| H2 | `1.05rem` | `--text` | kompakt |
| H3 | `0.94rem` | `--text` | `margin-bottom: 12px` |
| Field Label | `0.8rem`, `750` | `--muted` | Grid mit `6px` Gap |
| Tabellenkopf | `0.72rem`, `850` | `--muted` | Uppercase, `line-height: 1.15` |
| Muted Text | `0.85rem` | `--muted` | Hilfstext |
| Positive Werte | `850` | `--good` | Einnahmen, Zinsen, Cashback |
| Negative Werte | `850` | `--danger` | Negative Betraege |
| Metrik Label | `0.76rem`, `800` | `--muted` | Kleine Kennzahl-Beschriftung |
| Metrik Wert | `clamp(1.05rem, 1.8vw, 1.55rem)` | `--text` | `overflow-wrap: anywhere` |
| Chart-Titel | `clamp(1.35rem, 2vw, 2.05rem)`, `850` | `--chart-text` | Investment-Chart |
| Chart Label | `0.78rem`, `750` | `--chart-muted` | Metrik im Chart |
| Chart Wert | `clamp(1rem, 1.6vw, 1.35rem)`, `900` | `--chart-text` | Metrik im Chart |

## Layout und Flaechen

| Element | Masse | Farbe / Linie | Verwendung |
| --- | --- | --- | --- |
| App Header | max `1680px`, Padding `30px 24px 16px` | transparent | Titel und Einstellungen |
| App Main | max `1680px`, Gap `16px`, Padding `0 24px 42px` | transparent | Hauptlayout |
| Workspace Grid | `minmax(280px, 420px) minmax(0, 1fr)` | - | Grunddaten + Ergebnis |
| Panel | Padding `16px`, Radius `8px` | `--surface`, `1px --border`, `--shadow` | Standard-Container |
| Summary Grid | `repeat(auto-fit, minmax(170px, 1fr))`, Gap `10px` | - | Metrik-Karten |
| Popover | Breite `min(320px, 100vw - 24px)`, Radius `8px` | `--surface`, `1px --border` | Theme-Einstellungen |
| Reserve Popup | Padding `16px`, Radius `8px` | `--surface`, `1px --border` | Reserve-Grafik |
| Investment Chart Card | Radius `8px`, Overflow hidden | Chart-Tokens | Chart-Container |
| Foerderung Block | Grid `auto-fit minmax(160px, 1fr)`, Margin `0 24px 22px` | Chart-Tokens, `4px double --chart-border` oben | Altersvorsorgedepot-Zulagen unter Anlageentwicklung |
| Combined Investment Card | Margin oben `18px` | Chart-Tokens | Summierte Entwicklung aus Depot und Altersvorsorgedepot |

## Buttons und Controls

| Klasse / Element | Masse | Farben | Zustand |
| --- | --- | --- | --- |
| `.button` | min-height `38px`, Padding `9px 12px`, Radius `6px` | BG `--accent`, Text `#FFFFFF` | Primaere Aktion |
| `.button.secondary` | wie `.button` | BG `--accent-soft`, Text `--accent-strong` | Sekundaere Aktion |
| `.button.mini` | min-height `30px`, Padding `6px 9px`, `0.76rem` | wie Variante | Kleine Aktion |
| `.button.danger` | wie `.button` | BG `--danger-soft`, Text `--danger` | Reset/Gefahr |
| `.icon-button` | `34px x 34px`, Radius `6px` | Variantenbasiert | Basis fuer kleine Icons |
| `.toolbar-icon-button` | `38px x 38px` | BG `--accent-soft`, Text/Strokefarbe `--accent-strong` | Import, Export, Tabelle |
| `.settings-button` | `38px x 38px`, Radius `8px` | BG `--surface`, Text/Fuellung `--accent-strong`, Border `--border` | Theme-Menue |
| `.chart-popup-close` | `28px x 28px`, Radius `6px` | BG `--chart-field` oder `--surface-soft`, Text `--chart-text` oder `--text` | Popup schliessen |
| `.position-mode-switch` | min-height `38px`, Radius `6px` | BG `--surface-soft`, Border `--border` | Segmented Control |
| `.position-mode-button` | min-width `104px`, Padding `9px 12px` | Inaktiv Text `--muted`, aktiv BG `--accent`, Text `#FFFFFF` | Einnahmen/Ausgaben/Ruecklagen/Sparen |
| `.investment-depot-switch` | responsive Tabs, min `118px` je Tab | wie Segmented Control | Depot/Altersvorsorge-depot/Kinderdepot |
| `.reserve-chart-toggle` | min-height `34px`, Padding `7px 10px`, Radius `6px` | Inaktiv BG `--surface-soft`, aktiv BG `--accent`, Text `#FFFFFF` | Grafikfilter |
| `.theme-option` | min-height `48px`, Radius `8px` | BG `--surface-soft`, aktiv BG `--accent-soft` | Hell/Dunkel-Auswahl |
| `.include-transfer-toggle` | min-height `74px`, Radius `8px`, Padding `11px 12px` | Inaktiv BG `--accent-soft`, aktiv BG `--accent`, Text `#FFFFFF` | Zinsen/Cashback investieren |
| `.drag-handle` | `34px x 34px`, Radius `6px` | BG `--surface-soft`, Text `--muted` | Tabellenposition verschieben |

Hover: `.button` und `.icon-button` nutzen `filter: brightness(0.98)`. Focus: Inputs, Selects und Buttons nutzen `3px` Outline in `--focus` mit `2px` Offset.

## Icons

| Icon | Umsetzung | Farbe | Verwendung |
| --- | --- | --- | --- |
| Einstellungen | Inline-SVG Gear, `20px`, `fill: currentColor` | `--accent-strong` | Settings-Button |
| Upload | Inline-SVG, `viewBox 0 0 24 24`, Stroke `2` | `currentColor` | Positionen importieren |
| Download | Inline-SVG, `viewBox 0 0 24 24`, Stroke `2` | `currentColor` | Positionen exportieren |
| Tabelle | Inline-SVG Grid, `rect/path`, Stroke `2` | `currentColor` | Jahrestabelle exportieren |
| Schliessen | Text `x` | Button-Farbe | Popups schliessen |
| Entfernen | Text `x` | BG `--danger-soft`, Text `--danger` | Position entfernen |
| Drag Handle | Text `:::` | `--muted` | Tabellenzeilen verschieben |
| Legendenpunkt | `14px` Kreis, Popup `10px` Kreis | Chart- oder App-Tokens | Chart-Legende |
| Legendendash | `28px`, `2px dashed --chart-red` | `--chart-red` | Normales Depot |
| Theme Swatch | `22px` Kreis, 2-Farben-Gradient | siehe direkte Farben | Theme-Auswahl |

App-Icon-Dateien liegen in `src-tauri/icons/`:

- `16x16.png`, `32x32.png`, `64x64.png`
- `128x128.png`, `128x128@2x.png`
- `icon.png`, `icon.ico`, `icon.icns`
- `StoreLogo.png`
- `Square30x30Logo.png`, `Square44x44Logo.png`, `Square71x71Logo.png`, `Square89x89Logo.png`
- `Square107x107Logo.png`, `Square142x142Logo.png`, `Square150x150Logo.png`
- `Square284x284Logo.png`, `Square310x310Logo.png`

## Formulare und Inputs

| Element | Masse | Farben | Verwendung |
| --- | --- | --- | --- |
| `input`, `select` | Breite `100%`, Padding `9px 10px`, Radius `6px` | BG `--input-bg`, Text `--text`, Border `--border` | Zahlen, Auswahlfelder |
| `input:disabled`, `select:disabled` | wie Input | BG `--surface-muted`, Text `--muted`, Border `--row-border` | Gesperrte Eingaben |
| Checkbox | `18px x 18px` | `accent-color: --accent` | Aktiv/Sichtbar/Zinsen/Cashback/Altersvorsorgedepot |
| Range | keine Border, kein Padding | `accent-color: --accent` | Investment-Parameter |
| `.field` | Grid, Gap `6px` | Label `--muted` | Standard-Feld |
| `.range-field` | Grid `220px / 1fr / auto`, Radius `8px`, Padding `10px 12px` | BG `--surface-soft`, Border `--border`, Wert `--gold` | Slider-Zeile |
| `.small-input` | min-width `86px` | Input-Tokens | Kleine Tabellenwerte |
| `.amount-input` | `104px` | Input-Tokens | Betrag |
| `.day-input` | `48px` | Input-Tokens | Tag |
| `.payout-year-input` | `132px` | Input-Tokens | Abgangsjahr |

## Tabellen, Linien und Trennungen

| Element | Linie / Farbe | Regel |
| --- | --- | --- |
| `.table-wrap` | `1px solid --border`, Radius `8px` | Scrollbarer Tabellenrahmen |
| `th`, `td` | `border-bottom: 1px solid --row-border` | Standard-Zeilenlinie |
| `th` | BG `--surface-muted`, Text `--muted` | Sticky Tabellenkopf |
| `tfoot th` | BG `--surface-muted`, keine Bottom-Line | Tabellenfuss |
| `.result-max-needed-col` | BG `--highlight`, Text `--accent-strong` | Max. Bedarf Monatsanfang |
| `.result-permanent-col` | BG `--gold-soft`, Text `--gold` | Dauerhafter Bestand |
| `.detail-list` | `border-top: 1px solid --border` | Detailblock |
| `.detail-line` | `border-bottom: 1px solid --border` | Detailzeile |
| `.settings-popover-head` | `border-bottom: 1px solid --border` | Popover-Kopf |
| `.reserve-chart-head` | `border-bottom: 1px solid --border` | Reserve-Chart-Kopf |
| `.reserve-chart-insight` | `border-left: 4px solid --accent` | Info-Hinweis |
| `.chart-popup-total` | `border-top: 3px double --chart-border` | Popup-Summe |
| `.investment-statistics` | `border-top: 4px double --chart-border` | Statistik-Block im Chart |
| `.legend-dash` | `border-top: 2px dashed --chart-red` | Normales Depot |
| Rentenlinie Canvas | `2px dashed --chart-retirement` | Rente im Investment-Chart |

## Karten und Listen

| Klasse | Farben | Masse / Verhalten |
| --- | --- | --- |
| `.metric` | BG `--metric-bg`, Border `--border` | Radius `8px`, Padding `12px` |
| `.metric.strong` | BG `--metric-strong-bg`, Border `#A7CFC3` | Wichtige Metrik |
| `.reserve-chart-stat` | BG `--surface-soft`, Border `--border` | Radius `8px`, Padding `10px` |
| `.reserve-chart-position` | BG `--surface-soft`, Text `--text`, Border `--border` | Radius `8px`, aktive Position mit `--gold-soft` |
| `.reserve-pie-field` | BG `--surface-soft`, Text `--text`, Border `--border` | Radius `8px`, aktive Kategorie mit `--accent-soft` |
| `.savings-rate-card` | BG `--accent-soft`, Border `--border` | Radius `8px`, max `260px` |
| `.include-item` | BG `--surface-soft`, Border `--border` | Radius `8px`, zweispaltig |
| `.include-empty` | Border `1px dashed --border`, Text `--muted` | Leerer Zustand |
| `.chart-metric` | BG `--chart-field`, Border `--chart-border` | Radius `8px`, Padding `12px` |

## Responsive Breakpoints

| Breakpoint | Regel |
| --- | --- |
| `max-width: 1240px` | Investment-Grid wird einspaltig |
| `max-width: 1080px` | Workspace und Investment-Control-Grid werden einspaltig; Toolbar/Header stapeln |
| `max-width: 680px` | App-Padding `12px`, Grids werden einspaltig, Reserve-Popup kompakter, Chart-Hoehe `460px`, Button-Row als Grid |

## Standalone Chart Prototyp

`frontend/anlageentwicklung_grafik_html.html` hat eine eigene dunkle Palette:

| Variable / Wert | Hex / Wert | Verwendung |
| --- | --- | --- |
| `--bg` | `#111315` | Seitenhintergrund |
| `--panel` | `#17191C` | Karten/Panel |
| `--text` | `#E5E7EB` | Haupttext |
| `--muted` | `#9CA3AF` | Sekundaertext |
| `--grid` | `#2A2D31` | Raster |
| `--green` | `#43B20A` | Wertzuwachs |
| `--purple` | `#9B94FF` | Restguthaben |
| `--grey` | `#777B82` | Eigenbeitrag |
| `--orange` | `#FF7A00` | Zulagen |
| `--red` | `#FF5B63` | Steuer/Depot-Linie |
| `--border` | `#2F3338` | Linien |
| Input BG | `#0F1113` | Inputs/Selects |
| Button BG | `#243B1B` | Button |
| Button Border | `#3B6B22` | Button-Rahmen |
| Button Text | `#C9F7B0` | Button-Text |
| Card Shadow | `rgba(0, 0, 0, 0.25)` / `#00000040` | Prototyp-Karten-Schatten |
| Retirement/Canvas-Linie | `#0C0D0E` | Vertikale Markierung |
| Warning Text | `#FECACA` | Warnbox |
| Warning BG | `rgba(127, 29, 29, 0.25)` / `#7F1D1D40` | Warnbox |
| Warning Border | `rgba(248, 113, 113, 0.25)` / `#F8717140` | Warnbox |
