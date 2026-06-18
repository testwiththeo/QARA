import { useEffect, useState } from "react";
import * as api from "@/api/client";
import type { Integration, IntegrationProvider } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Trash2, Zap, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [provider, setProvider] = useState<IntegrationProvider>("jira");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const fetchIntegrations = async () => {
    try {
      const data = await api.listIntegrations();
      setIntegrations(data.items);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.createIntegration({ provider, config });
      setConfig({});
      setShowCreate(false);
      fetchIntegrations();
    } catch {
      // handle error
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this integration?")) {
      try {
        await api.deleteIntegration(id);
        fetchIntegrations();
      } catch {
        // handle error
      }
    }
  };

  const handleTest = async (id: string) => {
    setTestResult(null);
    try {
      const result = await api.testIntegration(id);
      setTestResult({ id, ...result });
    } catch {
      setTestResult({ id, success: false, message: "Test failed" });
    }
  };

  const jiraFields = [
    { key: "url", label: "Jira URL", placeholder: "https://company.atlassian.net" },
    { key: "email", label: "Email", placeholder: "qa@company.com" },
    { key: "api_token", label: "API Token", placeholder: "xxx" },
    { key: "project_key", label: "Project Key", placeholder: "QA" },
  ];

  const slackFields = [
    { key: "bot_token", label: "Bot Token", placeholder: "xoxb-..." },
    { key: "channel", label: "Channel", placeholder: "#qa-alerts" },
  ];

  const fields = provider === "jira" ? jiraFields : slackFields;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Integrations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Integrations</CardTitle>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Integration
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2" />
              <p>No integrations configured</p>
            </div>
          ) : (
            integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    integration.provider === "jira" ? "bg-blue-500/10" : "bg-purple-500/10"
                  )}>
                    <Zap className={cn(
                      "h-4 w-4",
                      integration.provider === "jira" ? "text-blue-500" : "text-purple-500"
                    )} />
                  </div>
                  <div>
                    <p className="font-medium capitalize">{integration.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      {integration.config.url || integration.config.channel || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {testResult?.id === integration.id && (
                    <Badge variant="outline" className={cn(
                      testResult.success ? "text-green-500 border-green-500/20" : "text-red-500 border-red-500/20"
                    )}>
                      {testResult.success ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                      {testResult.message}
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleTest(integration.id)}>
                    Test
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(integration.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {/* Create Form */}
          {showCreate && (
            <form onSubmit={handleCreate} className="space-y-4 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={provider}
                  onChange={(e) => {
                    setProvider(e.target.value as IntegrationProvider);
                    setConfig({});
                  }}
                >
                  <option value="jira">Jira</option>
                  <option value="slack">Slack</option>
                </Select>
              </div>
              {fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    value={config[field.key] || ""}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    required
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
