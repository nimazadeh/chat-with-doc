import {
  createIcons,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  Fingerprint,
  Layers,
  LockKeyhole,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Terminal,
  X,
} from 'lucide';

export function renderIcons(): void {
  createIcons({
    icons: {
      ArrowRight,
      ArrowUpRight,
      BookOpen,
      Check,
      ChevronRight,
      CircleHelp,
      FileText,
      Fingerprint,
      Layers,
      LockKeyhole,
      LogOut,
      Plus,
      ShieldCheck,
      Sparkles,
      Terminal,
      X,
    },
    attrs: { 'stroke-width': 1.6, 'aria-hidden': 'true', focusable: 'false' },
  });
}
