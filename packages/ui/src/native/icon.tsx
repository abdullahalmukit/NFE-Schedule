// Per-icon imports: Metro does not tree-shake, so importing from the package
// root would bundle every lucide icon (~2 000 modules).
import type { LucideIcon } from "lucide-react-native";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import Bell from "lucide-react-native/icons/bell";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import DoorOpen from "lucide-react-native/icons/door-open";
import Download from "lucide-react-native/icons/download";
import FileText from "lucide-react-native/icons/file-text";
import GraduationCap from "lucide-react-native/icons/graduation-cap";
import House from "lucide-react-native/icons/house";
import Mail from "lucide-react-native/icons/mail";
import MapPin from "lucide-react-native/icons/map-pin";
import Menu from "lucide-react-native/icons/menu";
import Phone from "lucide-react-native/icons/phone";
import Plus from "lucide-react-native/icons/plus";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Search from "lucide-react-native/icons/search";
import SquareUser from "lucide-react-native/icons/square-user";
import User from "lucide-react-native/icons/user";
import Users from "lucide-react-native/icons/users";
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
