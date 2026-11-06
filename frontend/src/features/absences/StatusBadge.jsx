import Badge from '../../components/ui/Badge.jsx';
import { statusMeta } from './format.js';

export default function StatusBadge({ status }) {
  const meta = statusMeta[status] ?? { label: status, tone: 'neutral' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}