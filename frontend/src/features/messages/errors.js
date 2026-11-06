// Messages written by the backend (in English) that we show in French
const known = {
  'You cannot message yourself': 'Tu ne peux pas t’envoyer un message à toi-même.',
  'One or more recipients do not exist': 'Un ou plusieurs destinataires n’existent pas.',
  'Conversation not found': 'Cette conversation est introuvable.',
  'Message not found': 'Ce message est introuvable.',
  'This message was already sent': 'Ce message a déjà été envoyé.',
  'Sent messages are immutable and cannot be modified': 'Un message envoyé ne peut plus être modifié.',
  'You are not allowed to message these recipients': 'Tu n’as pas le droit d’écrire à ce destinataire.',
  'This student is not in one of your classes': 'Cet élève n’est pas dans une de tes classes.',
  'Recipients must be parents of this student': 'Les destinataires doivent être des parents de cet élève.',
  'This teacher does not teach your child': 'Cet enseignant n’enseigne pas à ton enfant.',
  'studentId is required when a teacher writes to parents': 'Choisis d’abord l’élève concerné.',
  'studentId is required when a parent writes to teachers': 'Choisis d’abord l’enfant concerné.',
  'Subject, body and at least one recipient are required to send': 'L’objet, le message et au moins un destinataire sont obligatoires pour envoyer.',
  'A sent message cannot be deleted by its sender. Recipients can hide it from their own inbox.': 'Un message envoyé ne peut pas être supprimé. Tu peux le masquer de ta boîte.',
  'A reply can only go to people already in the conversation': 'Une réponse ne peut aller qu’aux personnes déjà dans la conversation.',
  'At least one recipient is required': 'Choisis au moins un destinataire.',
  'Attachment not found (only drafts can be changed)': 'Pièce jointe introuvable (seuls les brouillons peuvent être modifiés).',
  'A message can have at most 5 attachments': 'Un message peut contenir au plus 5 pièces jointes.',
  'Attachments cannot be added to a sent message': 'Impossible d’ajouter une pièce jointe à un message envoyé.',
  'Attach at least one file in the "files" field': 'Choisis au moins un fichier.',
  'Attachment not found': 'Pièce jointe introuvable.',
  'Invalid id': 'Identifiant invalide.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Élément introuvable. Recharge la page.';
  if (err.status === 409) return err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};