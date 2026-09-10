/**
 * Error and Offline States.
 * - 404: Stitch Screen 'b21c7cccf6234e89ae191d8036d6fea9' (Page introuvable)
 * - Maintenance: Stitch Screen '23ab044742ad4da681863a099d154814' (Maintenance en cours)
 * - Offline / Mobile: Stitch Screen '82dc6fa3f3854be4b3f73d70a6b95477' (Vous êtes hors connexion)
 * - Server Error: Stitch Screen 'c844d28c4ad14029b203fa360852e829' (Une erreur est survenue)
 */

export function NotFoundPage() {
  return {
    screenId: 'b21c7cccf6234e89ae191d8036d6fea9',
    title: 'Page introuvable - VISION SCHOOL',
    errorCode: 404,
    message: 'La page que vous recherchez semble introuvable ou a été déplacée.',
    cta: { label: 'Retour à l’accueil', href: '/' },
  };
}

export function MaintenancePage() {
  return {
    screenId: '23ab044742ad4da681863a099d154814',
    title: 'Maintenance en cours - VISION SCHOOL',
    message: 'Notre plateforme fait peau neuve pour la rentrée 2026/2027. Nous serons de retour très bientôt.',
  };
}

export function OfflinePage() {
  return {
    screenId: '82dc6fa3f3854be4b3f73d70a6b95477',
    title: 'Vous êtes hors connexion - VISION SCHOOL',
    message: 'Veuillez vérifier votre connexion internet pour continuer votre navigation.',
  };
}

export function ServerErrorPage() {
  return {
    screenId: 'c844d28c4ad14029b203fa360852e829',
    title: 'Une erreur est survenue - VISION SCHOOL',
    errorCode: 500,
    message: 'Une anomalie temporaire est survenue. Nos équipes techniques ont été notifiées.',
  };
}
