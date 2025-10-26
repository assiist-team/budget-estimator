import { Edit, Trash2, Undo, Redo, Info } from 'lucide-react';

export const EditIcon = () => <Edit className="h-4 w-4" />;
export const TrashIcon = () => <Trash2 className="h-4 w-4" />;
export const UndoIcon = () => <Undo className="h-4 w-4" />;
export const RedoIcon = () => <Redo className="h-4 w-4" />;
export const HelpIcon = ({ className, title }: { className?: string; title?: string }) => (
  <span className={`inline-block ${className || ''}`.trim()} data-tooltip={title} title={title}>
    <Info className="h-3 w-3" />
  </span>
);
