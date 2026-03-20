import { CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function StatusBadge({ status }) {
    const isOpen = status === 'open';
    return (
        <Badge variant={isOpen ? "warning" : "success"} className="gap-1 px-2.5 py-1">
            {isOpen ? <Clock3 size={13} /> : <CheckCircle2 size={13} />}
            {isOpen ? 'Open' : 'Closed'}
        </Badge>
    );
}
