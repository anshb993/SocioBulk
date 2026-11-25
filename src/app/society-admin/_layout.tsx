import { RoleTabs } from "../../components/ui/RoleTabs";

export default function Layout() {
  return (
    <RoleTabs
      tabs={[
        { name: "dashboard", title: "Dashboard", icon: "speedometer-outline" },
        { name: "campaigns", title: "Campaigns", icon: "megaphone-outline" },
        { name: "residents", title: "Residents", icon: "people-outline" },
        { name: "profile", title: "Profile", icon: "person-outline" },
      ]}
    />
  );
}