# IJzer: fitness tracker voor je thuisgym

Een web-app (PWA) die je via Safari op je iPhone installeert. Hij werkt offline en bewaart alle data op je toestel.

## Wat zit erin

- **Dashboard:** volgende training, weekoverzicht, volume, weekreeks, records, krachtprogressie (geschat 1RM), sets per spiergroep tegen het advies voor je doel, een consistentiekalender en de trend van je lichaamsgewicht.
- **Training loggen:** sets × reps × gewicht, met slimme suggesties via dubbele progressie. Verder een schijvencalculator per kant, opwarmsets, een trainings- en rusttimer, en een melding bij nieuwe records.
- **Schema-generator:** kies je doel (spiermassa, kracht, vetverlies, fit) en een indeling (Benen/Duwen/Trekken, Full body, Upper/Lower). De oefeningen worden afgestemd op je apparatuur en het deload-ritme gaat automatisch.
- **Schema-check:** signaleert stilstand (3 sessies zonder vooruitgang), een lange looptijd (na 2 blokken) en een lange bulk (20 weken). Stelt dan varianten voor, zoals squat → pause squat, met geschatte startgewichten. Het nieuwe blok houdt je rotatie en historie intact.
- **Uitleg & begrippen:** in Instellingen, of tik op het label bij een oefening.
- **Voortgang:** weekvolume, details per oefening (1RM, zwaarste set, volume), rep-records en de geschiedenis per sessie.
- **Historie:** al je trainingen. Je kunt ze bewerken en verwijderen.
- **Back-up:** exporteren en importeren als JSON-bestand.

## Lokaal testen op je laptop

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Open daarna http://localhost:5173.

## Op je iPhone zetten

De app moet op een https-adres staan. Twee gratis opties:

**Netlify Drop (makkelijkst)**
1. Maak een gratis account op netlify.com.
2. Ga naar app.netlify.com/drop en sleep de map `ijzer` erin.
3. Je krijgt een adres zoals `https://jouw-naam.netlify.app`.

**GitHub Pages**
1. Maak een repository aan op GitHub en upload alle bestanden uit deze map. Er zijn geen submappen, dus selecteer alles (Ctrl+A) en sleep het in het uploadvak.
2. Zet Pages aan via Settings → Pages (branch `main`, map `/`).

Daarna op je iPhone: open het adres in **Safari** → Deel-knop → **Zet op beginscherm**.

> Let op: je data hoort bij het webadres. Gebruik steeds hetzelfde adres. Wissel je toch van adres, maak dan eerst een back-up (Instellingen → Back-up maken) en zet die terug in de nieuwe versie.

## Updates uitrollen

1. Pas de code aan.
2. Verhoog `VERSION` in `sw.js` (bijv. `ijzer-v1.0.1`) en `IJZER_VERSION` in `app.js`.
3. Upload opnieuw. De iPhone haalt de nieuwe versie op bij de volgende keer openen, of via Instellingen → Zoeken naar updates.

## Structuur

Alle bestanden staan bewust in één map, zodat uploaden via de GitHub-website makkelijk gaat.

```
index.html, manifest.webmanifest, sw.js   app-shell, installatie, offline-cache
app.js, core.js                           opstarten, navigatie, events
app.css                                   vormgeving
data.js                                   oefeningen, doelen, schema-sjablonen, varianten
engine.js                                 progressie, gewichten afronden, 1RM, records
review.js                                 schema-check (stilstand, nieuw blok)
stats.js                                  analyses
charts.js                                 SVG-grafieken
store.js                                  opslag en back-up
util.js                                   hulpfuncties en iconen
home.js, train.js, progress.js,
history.js, program.js, settings.js       schermen
icon-*.png                                app-iconen
```
