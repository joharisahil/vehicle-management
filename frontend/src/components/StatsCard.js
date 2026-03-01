import { Card } from './ui/card';

export const StatsCard = ({ title, value, icon: Icon, color }) => {
  return (
    <Card className="rounded-2xl p-5 hover:shadow-md transition-shadow" data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">{title}</p>
          <p className="text-3xl md:text-4xl font-bold mt-2" data-testid={`stats-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
        </div>
        <div className={`h-12 w-12 md:h-14 md:w-14 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="h-6 w-6 md:h-7 md:w-7" strokeWidth={2} />
        </div>
      </div>
    </Card>
  );
};