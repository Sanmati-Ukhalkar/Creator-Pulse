
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Rss, 
  Brain, 
  FileText, 
  Send, 
  Settings, 
  BarChart3,
  ArrowRight,
  ArrowDown,
  Zap,
  Globe,
  Calendar,
  Target
} from "lucide-react"

export const WorkflowDiagram = () => {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Creator Pulse Platform Workflow</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          End-to-end AI-powered content creation and delivery automation for creators
        </p>
      </div>

      {/* Phase 1: Authentication & Onboarding */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            Phase 1: Authentication & Onboarding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StepCard
              icon={<Users className="h-5 w-5" />}
              title="User Registration"
              description="Sign up with email/password or social auth"
              badge="Entry"
            />
            <StepCard
              icon={<Settings className="h-5 w-5" />}
              title="Profile Setup"
              description="Creator type, industry, bio, content preferences"
              badge="Config"
            />
            <StepCard
              icon={<Globe className="h-5 w-5" />}
              title="Platform Connections"
              description="Connect social media accounts (LinkedIn, Twitter, etc.)"
              badge="Integration"
            />
            <StepCard
              icon={<FileText className="h-5 w-5" />}
              title="Voice Training"
              description="Upload content samples to train AI on writing style"
              badge="AI Setup"
            />
          </div>
        </CardContent>
      </Card>

      <ArrowDownCard />

      {/* Phase 2: Content Intelligence */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-blue-600" />
            Phase 2: Content Intelligence & Source Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StepCard
              icon={<Rss className="h-5 w-5" />}
              title="Source Configuration"
              description="Add RSS feeds, Twitter lists, hashtag monitors"
              badge="Sources"
            />
            <StepCard
              icon={<Zap className="h-5 w-5" />}
              title="Content Ingestion"
              description="Automated scraping and content collection"
              badge="Automation"
            />
            <StepCard
              icon={<Brain className="h-5 w-5" />}
              title="AI Topic Analysis"
              description="Extract trending topics, sentiment, engagement potential"
              badge="Intelligence"
            />
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Background Processes:</h4>
            <ul className="text-sm space-y-1">
              <li>• Scheduled content scraping via Supabase Edge Functions</li>
              <li>• LLM-powered topic extraction and trending analysis</li>
              <li>• Content classification and relevance scoring</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <ArrowDownCard />

      {/* Phase 3: Content Generation */}
      <Card className="border-2 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-green-600" />
            Phase 3: AI Content Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <StepCard
              icon={<Target className="h-5 w-5" />}
              title="Topic Research"
              description="Deep dive analysis on selected topics with content angles"
              badge="Research"
            />
            <StepCard
              icon={<Zap className="h-5 w-5" />}
              title="Content Generation"
              description="AI creates platform-optimized content using user's voice"
              badge="AI Creation"
            />
            <StepCard
              icon={<FileText className="h-5 w-5" />}
              title="Draft Management"
              description="Review, edit, and approve generated content drafts"
              badge="Review"
            />
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">AI Features:</h4>
            <ul className="text-sm space-y-1">
              <li>• Platform-specific optimization (Twitter threads, LinkedIn posts, etc.)</li>
              <li>• Voice consistency using trained content samples</li>
              <li>• Hashtag and CTA generation</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <ArrowDownCard />

      {/* Phase 4: Delivery Automation */}
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Send className="h-6 w-6 text-purple-600" />
            Phase 4: Content Delivery & Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <StepCard
              icon={<Calendar className="h-5 w-5" />}
              title="Scheduling"
              description="Set delivery times, platforms, and content types"
              badge="Planning"
            />
            <StepCard
              icon={<Send className="h-5 w-5" />}
              title="Automated Posting"
              description="Queue management and automated publishing"
              badge="Delivery"
            />
            <StepCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Performance Tracking"
              description="Monitor engagement, reach, and content performance"
              badge="Analytics"
            />
            <StepCard
              icon={<Settings className="h-5 w-5" />}
              title="Optimization"
              description="AI learns from performance to improve future content"
              badge="Learning"
            />
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Automation Features:</h4>
            <ul className="text-sm space-y-1">
              <li>• Cron-based scheduling with Supabase Edge Functions</li>
              <li>• Multi-platform delivery queues</li>
              <li>• Performance analytics and reporting</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Technical Architecture */}
      <Card className="border-2 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-orange-600" />
            Technical Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Frontend Stack</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Badge variant="outline">React 18</Badge>
                  <span>Modern UI with TypeScript</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">Tailwind CSS</Badge>
                  <span>Responsive design system</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">Tanstack Query</Badge>
                  <span>State management & caching</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">shadcn/ui</Badge>
                  <span>Component library</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Backend Stack</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Badge variant="outline">Supabase</Badge>
                  <span>Database, Auth, Edge Functions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">PostgreSQL</Badge>
                  <span>Relational database</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">OpenAI API</Badge>
                  <span>AI content generation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline">Edge Functions</Badge>
                  <span>Serverless background jobs</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Features Summary */}
      <Card className="border-2 border-gradient-to-r from-primary/20 to-secondary/20">
        <CardHeader>
          <CardTitle className="text-center">Key Platform Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard
              title="AI-Powered Intelligence"
              features={[
                "Topic trend analysis",
                "Content opportunity identification",
                "Sentiment analysis",
                "Engagement prediction"
              ]}
            />
            <FeatureCard
              title="Automated Content Creation"
              features={[
                "Voice-matched AI writing",
                "Platform optimization",
                "Research-backed content",
                "Multi-format generation"
              ]}
            />
            <FeatureCard
              title="Smart Delivery System"
              features={[
                "Multi-platform scheduling",
                "Performance optimization",
                "Queue management",
                "Analytics dashboard"
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const StepCard = ({ icon, title, description, badge }: {
  icon: React.ReactNode
  title: string
  description: string
  badge: string
}) => (
  <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <Badge variant="secondary" className="text-xs">{badge}</Badge>
    </div>
    <h4 className="font-semibold mb-1">{title}</h4>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
)

const ArrowDownCard = () => (
  <div className="flex justify-center">
    <div className="bg-muted rounded-full p-3">
      <ArrowDown className="h-6 w-6 text-muted-foreground" />
    </div>
  </div>
)

const FeatureCard = ({ title, features }: { title: string; features: string[] }) => (
  <div className="p-4 bg-card border rounded-lg">
    <h4 className="font-semibold mb-3">{title}</h4>
    <ul className="space-y-2">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center gap-2 text-sm">
          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
          {feature}
        </li>
      ))}
    </ul>
  </div>
)
