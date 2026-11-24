import { RoleTabs } from "../../components/ui/RoleTabs";

export default function Layout() {
  return (
    <RoleTabs
      tabs={[
        { name: "dashboard", title: "Dashboard", icon: "speedometer-outline" },
        { name: "services", title: "Services", icon: "construct-outline" },
        { name: "bookings", title: "Bookings", icon: "calendar-outline" },
      ]}
    />
  );
}