import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  DoorOpen,
  Download,
  FileText,
  GraduationCap,
  House,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SquareUser,
  User,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import type { IconName } from "../icon-names";

const icons: Record<IconName, LucideIcon> = {
  home: House,
  routine: CalendarDays,
  academics: GraduationCap,
  rooms: DoorOpen,
  menu: Menu,
  search: Search,
  download: Download,
  bell: Bell,
  user: User,
  users: Users,
  pin: MapPin,
  phone: Phone,
  mail: Mail,
  back: ArrowLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  refresh: RefreshCw,
  alert: CircleAlert,
  contact: SquareUser,
  notes: FileText,
  check: CircleCheck,
  plus: Plus,
};

export interface IconProps {
  name: IconName;
  color: string;
  size?: number;
}

/** Decorative icon; give the surrounding control an accessibility label. */
export function Icon({ name, color, size = 20 }: IconProps) {
  const Cmp = icons[name];
  return <Cmp size={size} color={color} strokeWidth={2} />;
}
