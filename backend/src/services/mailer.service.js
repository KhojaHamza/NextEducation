// Sends one plain-text email through SendGrid's HTTP API.
// Without credentials it does nothing and reports { sent: false }.
export const sendMail = async ({ to, subject, text }) => {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return { sent: false };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: 'text/plain', value: text }],
    }),
  });
  if (!res.ok) throw new Error(`Email provider answered ${res.status}`);
  return { sent: true };
};