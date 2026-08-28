# Poser une voix off sur un film

Le comédien lit le script d'un trait, sans suivre l'image. Ces quatre
scripts retrouvent chaque réplique dans sa lecture et la reposent au top
prévu par le film.

## La séance d'enregistrement

Ce qui compte est écrit dans **Bonfil — Script voix off** (dossier
« Bonfil - Les indispensables »), qui part chez le comédien. L'essentiel :
une pièce sourde, un fichier par film, et surtout **ne pas s'arrêter sur une
erreur** — on refait la phrase après une pause, la bonne prise sera gardée.

Peu importe que la lecture soit plus longue ou plus courte que le film :
c'est précisément ce que cette chaîne rattrape.

## Les quatre étapes

```bash
node tools/voix/transcrire.js f6 "…/Bonfil - Voix off/voix-f6.wav"
node tools/voix/aligner.js    f6
node tools/voix/monter.js     f6 "…/Bonfil - Voix off/voix-f6.wav"
node tools/voix/normaliser.js f6
```

La dernière étape écrit `public/voix-f6.mp3`. Le lecteur va le chercher tout
seul : il charge `/voix-<film>.mp3` quand on ouvre le film, sans autre
réglage.

Les fichiers intermédiaires vivent dans `tools/voix/travail/`, hors dépôt.

## Ce qu'il faut lire dans les sorties

**`aligner.js`** donne, pour chaque réplique, sa place dans la bande et la
part de ses mots retrouvés. Une couverture sous 60 % veut dire quelque
chose : la réplique n'a pas été lue, ou l'a été très différemment. Ne
continuez pas sans avoir compris pourquoi.

**`monter.js`** annonce le décalage maximal. Sous une seconde, personne ne
le remarque. **Au-delà de deux, la voix s'entend en retard sur l'image** —
il faut alors reprendre la lecture, ou retoucher le minutage du film.

**`normaliser.js`** annonce le gain appliqué. Au-delà de 30 dB, le souffle
de la pièce remonte avec la voix : réécoutez avant de publier.

## Les réglages, et pourquoi ils sont là

Dans `monter.js` :

| Réglage | Défaut | À quoi il sert |
|---|---|---|
| `AVANT` | 0,15 s | reprise avant le premier mot — augmentez si une attaque est mangée |
| `APRES` | 0,25 s | laisse retomber la fin de phrase |
| `RESPIRATION` | 0,28 s | silence gardé **à l'intérieur** d'une réplique — augmentez si le débit paraît haché |
| `TEMPO_MAX` | 1,14 | plafond d'accélération — baissez-le si la voix s'entend pressée, au prix d'un décalage plus grand |

C'est `RESPIRATION` qui fait le gros du travail : resserrer les silences
récupère vingt à trente secondes par film **sans toucher à un seul mot**.
L'accélération n'intervient que sur ce qui déborde encore.

## Ce qui a été appris à la dure

**Ne jamais découper une lecture par détection de silences seule.** Les
silences tombent aussi au milieu des phrases : on obtient deux fois trop de
morceaux, et les faire correspondre aux répliques donne du bruit. C'est
l'horodatage mot à mot qui permet l'alignement, rien d'autre.

**Vérifier avant de conclure.** Un découpage qui « tombe juste » en nombre
peut être entièrement faux. Le contrôle qui tranche : la durée parlée
doit croître avec la longueur du texte. Sans corrélation, l'alignement est
imaginaire.

**Mesurer le niveau, toujours.** Une bande peut être parfaitement montée et
inaudible sur un téléphone. Une voix off mobile se cale vers −16 LUFS ; une
prise brute peut être vingt décibels plus bas sans que ça s'entende au
casque, dans une pièce calme.

## Ce que la chaîne ne fait pas

Elle ne juge pas ce qu'elle produit. Le décalage se mesure, la coupure d'une
attaque ou une respiration hachée s'entendent — **écoutez toujours avant de
publier.**
