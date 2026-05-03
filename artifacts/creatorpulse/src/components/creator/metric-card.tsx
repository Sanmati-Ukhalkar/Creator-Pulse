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
      case 'positive': return 'text-emerald-600';
      case 'negative': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  if (gradient) {
    return (
      <div className="rounded-xl p-6 hover-lift transition-all duration-200" style={{ background: 'var(--gradient-creator-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-white/20">
            <Icon className="w-5 h-5 text-white" />
          </div>
          {change && (
            <span className="text-sm font-medium text-white/80">{change}</span>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-white/80">{title}</h3>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 hover-lift transition-all duration-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-muted">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {change && (
          <span className={`text-sm font-medium ${getChangeColor()}`}>{change}</span>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
};
