import React from "react";

interface DashboardCardProps {
  title: string;
  count: number;
  weeklyChange?: string;
  icon: React.ReactNode;
  accentColor: string;   // #EF3866 for consistency
  iconColorDark: string; // Neon color for dark mode
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  count,
  weeklyChange,
  icon,
  accentColor = "#EF3866",
  iconColorDark,
}) => {
  return (
    <div 
      className={`
        bg-white dark:bg-black 
        border border-gray-200 dark:border-gray-800 
        rounded-xl p-5 
        flex justify-between items-start min-h-[140px] 
        transition-all duration-300 
        hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(239,56,102,0.12)]
        group relative overflow-hidden
      `}
    >
      {/* Subtle accent overlay — more visible in dark mode */}
      <div 
        className="absolute inset-0 opacity-0 dark:opacity-10 pointer-events-none transition-opacity duration-300 group-hover:opacity-5 dark:group-hover:opacity-20"
        style={{
          background: `linear-gradient(135deg, ${accentColor}15 0%, transparent 70%)`
        }}
      />

      <div className="flex flex-col justify-between h-full z-10">
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 font-medium font-sora">{title}</p>
        <div>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-1 font-sora">{count}</h2>
          {weeklyChange && (
            <p className="text-gray-500 dark:text-gray-500 text-xs font-sora">{weeklyChange}</p>
          )}
        </div>
      </div>

      <div 
        className={`
          rounded-lg p-4 flex items-center justify-center transition-all duration-300
          group-hover:scale-110
        `}
      >
        {/* Icon color switches mode */}
        <div 
          className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
          style={{ color: iconColorDark ? undefined : accentColor }} // Fallback to theme in light if no dark color
        >
          {React.cloneElement(icon as React.ReactElement, {})}
        </div>
      </div>

      {/* Futuristic accent border glow on hover */}
      <div 
        className={`
          absolute inset-0 rounded-xl border-2 border-transparent 
          transition-all duration-300 
          group-hover:border-[#EF3866]/20 dark:group-hover:border-[#EF3866]/40 
          group-hover:shadow-[0_0_12px_#EF386620] dark:group-hover:shadow-[0_0_16px_#EF386650]
        `}
      />
    </div>
  );
};

export default DashboardCard;