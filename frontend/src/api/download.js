// Saves a { blob, filename } (from api(..., { asBlob: true })) as a file on the person's computer
export function saveFile({ blob, filename }, fallbackName = 'fichier') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename ?? fallbackName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}