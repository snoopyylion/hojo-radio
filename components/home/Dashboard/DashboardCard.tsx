import React from "react";

interface DashboardCardProps {
  title: string;
  count: number;
  weeklyChange?: string;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  count,
  weeklyChange,
  icon,
  bgColor,
  iconColor,
})  => {
  return (
    <div className={`${bgColor} border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl p-4 flex justify-between items-start min-h-[120px]`}>
      <div className="flex flex-col justify-between h-full">
        <p className="text-gray-600 text-sm mb-2">{title}</p>
        <div>
          <h2 className="text-4xl font-bold text-gray-900 mb-1">{count}</h2>
          {weeklyChange && (
            <p className="text-gray-500 text-xs">{weeklyChange}</p>
          )}
        </div>
      </div>
      <div className={`${iconColor} ${bgColor === 'bg-purple-100' ? 'bg-purple-200' : 
                       bgColor === 'bg-green-100' ? 'bg-green-200' : 
                       bgColor === 'bg-blue-100' ? 'bg-blue-200' : 'bg-pink-200'} 
                       rounded-lg p-4 flex items-center justify-center`}>
        {icon}
      </div>
    </div>
  );
};

export default DashboardCard;
