# Pala's Stream Schedule Maker

Studio web pour creer des plannings de stream lisibles et exportables en PNG.

## Fonctionnalites principales

- Edition des jours, streams et time slots avec gestion des jours off.
- Conversion de fuseaux horaires avec options predefinies et mode custom.
- Deux modes: edition et preview pour un rendu propre avant export.
- Export PNG en formats Story, YouTube post, X vertical et X horizontal.
- Personnalisation des entetes et du pied de page (titre, alignement, style, taille).
- Reorganisation des jours par glisser-deposer et gestion des miniatures.

## Parcours rapide

1. Ouvrir `http://localhost:3000` pour la page d'accueil.
2. Lancer le studio via `http://localhost:3000/schedule`.
3. Nommer la semaine, choisir le fuseau de base.
4. Ajouter des streams et des slots horaires.
5. Passer en preview et telecharger le PNG.

## Installation

```bash
npm install
```

## Scripts

- `npm run dev` lance le serveur de dev
- `npm run build` build de production
- `npm run start` demarre le build
- `npm run lint` lance ESLint

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- emoji-picker-react, html-to-image

## Structure du projet

- `app/page.tsx` page d'accueil et presentation
- `app/schedule/page.tsx` studio d'edition
- `app/schedule/StorySchedulePreview.tsx` rendu canvas et export
- `app/api/image-proxy/route.ts` proxy d'images pour miniatures externes
- `app/globals.css` theme et animations

## Notes

- Le proxy d'images permet d'afficher des miniatures distantes et d'eviter les soucis CORS.
- L'export PNG est genere depuis le DOM en mode preview via html-to-image.
