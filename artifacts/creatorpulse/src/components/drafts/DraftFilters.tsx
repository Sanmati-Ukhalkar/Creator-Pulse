import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Filter, BarChart3, Archive, X, Lock } from "lucide-react";

interface DraftFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedPlatform: string;
  onPlatformChange: (platform: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedContentType: string;
  onContentTypeChange: (type: string) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  draftCounts: {
    linkedin: number;
    instagram: number;
    total: number;
  };
  onClearFilters: () => void;
}

export function DraftFilters({
  searchQuery,
  onSearchChange,
  selectedPlatform,
  onPlatformChange,
  selectedStatus,
  onStatusChange,
  selectedContentType,
  onContentTypeChange,
  dateRange,
  onDateRangeChange,
  draftCounts,
  onClearFilters
}: DraftFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const activeFiltersCount = [
    selectedPlatform !== 'all',
    selectedStatus !== 'all',
    selectedContentType !== 'all',
    dateRange !== 'all',
    searchQuery.length > 0
  ].filter(Boolean).length;

  const platformChips = [
    {
      id: 'linkedin',
      label: 'LinkedIn',
      count: draftCounts.linkedin,
      active: true,
      color: 'bg-blue-500'
    },
    {
      id: 'instagram',
      label: 'Instagram',
      count: draftCounts.instagram,
      active: false,
      color: 'bg-pink-500',
      comingSoon: true
    },
    {
      id: 'all',
      label: 'All Platforms',
      count: draftCounts.total,
      active: true,
      color: 'bg-gray-500'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header with Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drafts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive Selected
              </DropdownMenuItem>
              <DropdownMenuItem>
                <X className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Platform Filter Chips */}
      <div className="flex items-center space-x-2">
        {platformChips.map((chip) => (
          <Button
            key={chip.id}
            variant={selectedPlatform === chip.id ? "default" : "outline"}
            size="sm"
            onClick={() => chip.active ? onPlatformChange(chip.id) : null}
            disabled={chip.comingSoon}
            className={`relative ${
              selectedPlatform === chip.id 
                ? `${chip.color} text-white hover:${chip.color}/90` 
                : 'hover:bg-muted'
            } ${chip.comingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={chip.comingSoon ? '🔒 Coming Soon' : ''}
          >
            <div className={`w-2 h-2 rounded-full ${chip.color} mr-2`} />
            {chip.label}
            {chip.count > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {chip.count}
              </Badge>
            )}
            {chip.comingSoon && (
              <Lock className="h-3 w-3 ml-1" />
            )}
          </Button>
        ))}
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="text-muted-foreground"
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filter Row */}
      {showAdvancedFilters && (
        <div className="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Content Type</label>
            <Select value={selectedContentType} onValueChange={onContentTypeChange}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="text_post">Text Post</SelectItem>
                <SelectItem value="carousel">Carousel</SelectItem>
                <SelectItem value="reel">Reel</SelectItem>
                <SelectItem value="story">Story</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date Range</label>
            <Select value={dateRange} onValueChange={onDateRangeChange}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{searchQuery}"
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onSearchChange('')}
              />
            </Badge>
          )}
          {selectedPlatform !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Platform: {selectedPlatform}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onPlatformChange('all')}
              />
            </Badge>
          )}
          {selectedStatus !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {selectedStatus}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onStatusChange('all')}
              />
            </Badge>
          )}
          {selectedContentType !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {selectedContentType}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onContentTypeChange('all')}
              />
            </Badge>
          )}
          {dateRange !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Date: {dateRange}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => onDateRangeChange('all')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}