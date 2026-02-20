import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Save, TestTube, Trash2, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface VoiceTemplate {
  id: string;
  name: string;
  tone: string;
  style: string;
  contentType: string;
  samples: string[];
}

export default function VoiceTraining() {
  const { toast } = useToast();
  const [trainingText, setTrainingText] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [selectedTone, setSelectedTone] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedContentType, setSelectedContentType] = useState('');
  const [voiceTemplates, setVoiceTemplates] = useState<VoiceTemplate[]>([
    {
      id: '1',
      name: 'Professional LinkedIn',
      tone: 'Professional',
      style: 'Informative',
      contentType: 'LinkedIn Post',
      samples: ['Sample professional post 1', 'Sample professional post 2']
    },
    {
      id: '2',
      name: 'Casual Twitter',
      tone: 'Casual',
      style: 'Conversational',
      contentType: 'Twitter Post',
      samples: ['Sample casual tweet 1', 'Sample casual tweet 2']
    }
  ]);

  const [abTestConfigs, setAbTestConfigs] = useState([
    { id: 'config-a', name: 'Configuration A', tone: 'Professional', style: 'Formal' },
    { id: 'config-b', name: 'Configuration B', tone: 'Casual', style: 'Conversational' }
  ]);

  const handleAddTrainingData = () => {
    if (!trainingText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some training text.",
        variant: "destructive"
      });
      return;
    }

    // Here you would typically send the training data to your backend
    toast({
      title: "Success",
      description: "Training data added successfully.",
    });
    
    setTrainingText('');
  };

  const handleSaveTemplate = () => {
    if (!templateName || !selectedTone || !selectedStyle || !selectedContentType) {
      toast({
        title: "Error",
        description: "Please fill in all template fields.",
        variant: "destructive"
      });
      return;
    }

    const newTemplate: VoiceTemplate = {
      id: Date.now().toString(),
      name: templateName,
      tone: selectedTone,
      style: selectedStyle,
      contentType: selectedContentType,
      samples: [trainingText]
    };

    setVoiceTemplates([...voiceTemplates, newTemplate]);
    
    toast({
      title: "Success",
      description: "Voice template saved successfully.",
    });

    // Reset form
    setTemplateName('');
    setSelectedTone('');
    setSelectedStyle('');
    setSelectedContentType('');
    setTrainingText('');
  };

  const handleDeleteTemplate = (templateId: string) => {
    setVoiceTemplates(voiceTemplates.filter(template => template.id !== templateId));
    toast({
      title: "Success",
      description: "Voice template deleted.",
    });
  };

  const handleRunABTest = () => {
    toast({
      title: "A/B Test Started",
      description: "Testing different voice configurations...",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold creator-text-gradient">Voice Training</h1>
            <p className="text-muted-foreground mt-2">
              Train and optimize your AI voice for better content generation
            </p>
          </div>
        </div>

        <Tabs defaultValue="training" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="training">Training Data</TabsTrigger>
            <TabsTrigger value="templates">Voice Templates</TabsTrigger>
            <TabsTrigger value="ab-testing">A/B Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="training" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="w-5 h-5" />
                  <span>Add Training Data</span>
                </CardTitle>
                <CardDescription>
                  Paste your existing posts to help the AI learn your writing style
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="training-text">Training Content</Label>
                  <Textarea
                    id="training-text"
                    placeholder="Paste your existing posts, articles, or content here..."
                    value={trainingText}
                    onChange={(e) => setTrainingText(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linkedin-post">LinkedIn Post</SelectItem>
                        <SelectItem value="twitter-post">Twitter Post</SelectItem>
                        <SelectItem value="blog-article">Blog Article</SelectItem>
                        <SelectItem value="email-newsletter">Email Newsletter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={selectedTone} onValueChange={setSelectedTone}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="engaging">Engaging</SelectItem>
                        <SelectItem value="authoritative">Authoritative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="informative">Informative</SelectItem>
                        <SelectItem value="conversational">Conversational</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="storytelling">Storytelling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      placeholder="e.g., Professional LinkedIn"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={handleAddTrainingData} variant="outline">
                    Add Training Data
                  </Button>
                  <Button onClick={handleSaveTemplate} className="bg-creator-gradient hover:opacity-90">
                    <Save className="w-4 h-4 mr-2" />
                    Save as Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Saved Voice Templates</CardTitle>
                <CardDescription>
                  Manage your different voice templates for various content types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {voiceTemplates.map((template) => (
                    <Card key={template.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{template.tone}</Badge>
                          <Badge variant="outline">{template.style}</Badge>
                          <Badge variant="outline">{template.contentType}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {template.samples.length} training samples
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ab-testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TestTube className="w-5 h-5" />
                  <span>A/B Testing</span>
                </CardTitle>
                <CardDescription>
                  Test different voice configurations to find what works best
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {abTestConfigs.map((config) => (
                    <Card key={config.id} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">{config.name}</CardTitle>
                        <div className="flex space-x-2">
                          <Badge>{config.tone}</Badge>
                          <Badge variant="outline">{config.style}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Engagement Rate:</span> 
                            <span className="ml-2 text-creator-primary">
                              {config.id === 'config-a' ? '4.2%' : '3.8%'}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Click-through Rate:</span> 
                            <span className="ml-2 text-creator-primary">
                              {config.id === 'config-a' ? '2.1%' : '2.5%'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Test Parameters</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Test Duration</Label>
                      <Select defaultValue="7-days">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3-days">3 Days</SelectItem>
                          <SelectItem value="7-days">7 Days</SelectItem>
                          <SelectItem value="14-days">14 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Traffic Split</Label>
                      <Select defaultValue="50-50">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50-50">50% / 50%</SelectItem>
                          <SelectItem value="70-30">70% / 30%</SelectItem>
                          <SelectItem value="80-20">80% / 20%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Success Metric</Label>
                      <Select defaultValue="engagement">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="engagement">Engagement Rate</SelectItem>
                          <SelectItem value="clicks">Click-through Rate</SelectItem>
                          <SelectItem value="shares">Share Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button onClick={handleRunABTest} className="bg-creator-gradient hover:opacity-90">
                    <TestTube className="w-4 h-4 mr-2" />
                    Start A/B Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}