import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  gradient?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  gradient = false
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return 'text-creator-emerald';
      case 'negative': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={`glass-card p-6 hover-lift hover-glow transition-all duration-300 ${gradient ? 'bg-creator-gradient' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${gradient ? 'bg-white/20' : 'bg-muted'}`}>
          <Icon className={`w-5 h-5 ${gradient ? 'text-white' : 'text-primary'}`} />
        </div>
        {change && (
          <span className={`text-sm font-medium ${gradient ? 'text-white/80' : getChangeColor()}`}>
            {change}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <h3 className={`text-sm font-medium ${gradient ? 'text-white/90' : 'text-muted-foreground'}`}>
          {title}
        </h3>
        <p className={`text-2xl font-bold ${gradient ? 'text-white' : 'text-card-foreground'}`}>
          {value}
        </p>
      </div>
    </div>
  );
};