import { RoleTabs } from "../../components/ui/RoleTabs";

export default function Layout() {
  return (
    <RoleTabs
      tabs={[
        { name: "home", title: "Campaigns", icon: "grid-outline" },
        { name: "bookings", title: "Bookings", icon: "calendar-outline" },
        { name: "society", title: "Society", icon: "business-outline" },
        { name: "profile", title: "Profile", icon: "person-outline" },
      ]}
    />
  );
}