import { Mic, ShieldCheck, FileText, MessageCircle } from "lucide-react";
import DashboardCard from "./DashboardCard";

const DashboardGrid = () => {
  const data = [
    {
      title: "Podcasts Created",
      count: 12,
      weeklyChange: "+3 this week",
      icon: <Mic size={20} />,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      title: "News Verified",
      count: 12,
      weeklyChange: "+3 this week",
      icon: <ShieldCheck size={20} />,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Blog Posts Read",
      count: 12,
      weeklyChange: "+12 this week",
      icon: <FileText size={20} />,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Messages Sent",
      count: 12,
      weeklyChange: "+8 this week",
      icon: <MessageCircle size={20} />,
      bgColor: "bg-pink-100",
      iconColor: "text-pink-600",
    },
  ];

  return (
    <div className="bg-white dark:bg-black min-h-screen mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((card, i) => (
            <DashboardCard key={i} {...card} />
          ))}
        </div>
      </div>
  );
};

export default DashboardGrid;