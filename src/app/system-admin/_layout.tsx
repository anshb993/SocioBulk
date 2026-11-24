import { RoleTabs } from "../../components/ui/RoleTabs";

export default function Layout() {
  return (
    <RoleTabs
      tabs={[
        { name: "dashboard", title: "Dashboard", icon: "speedometer-outline" },
        { name: "users", title: "Users", icon: "people-outline" },
        { name: "societies", title: "Societies", icon: "business-outline" },
      ]}
    />
  );
}