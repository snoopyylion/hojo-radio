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
    <div className={`${bgColor} dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-xl p-4 flex justify-between items-start min-h-[120px] transition-all duration-200 hover:shadow-md`}>
      <div className="flex flex-col justify-between h-full">
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 font-medium">{title}</p>
        <div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{count}</h2>
          {weeklyChange && (
            <p className="text-gray-500 dark:text-gray-400 text-xs">{weeklyChange}</p>
          )}
        </div>
      </div>
      <div className={`${iconColor} ${bgColor === 'bg-purple-100' ? 'bg-purple-200 dark:bg-purple-800' : 
                       bgColor === 'bg-green-100' ? 'bg-green-200 dark:bg-green-800' : 
                       bgColor === 'bg-blue-100' ? 'bg-blue-200 dark:bg-blue-800' : 
                       bgColor === 'bg-orange-100' ? 'bg-orange-200 dark:bg-orange-800' : 'bg-pink-200 dark:bg-pink-800'} 
                       rounded-lg p-4 flex items-center justify-center`}>
        {icon}
      </div>
    </div>
  );
};

export default DashboardCard;
