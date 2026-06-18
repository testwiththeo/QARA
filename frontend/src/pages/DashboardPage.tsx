import { useEffect, useState } from "react";
import { useProjectStore } from "@/stores/bugStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BugStatusBadge } from "@/components/BugStatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Bug, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import * as api from "@/api/client";
import type { BugListItem, BugSeverity } from "@/api/types";

interface DashboardStats {
  totalOpen: number;
  totalClosed: number;
  avgResolutionHours: number;
  severityCounts: Record<BugSeverity, number>;
}

const SEVERITY_COLORS: Record<string, string> = {
  P0: "#ef4444",
  P1: "#f97316",
  P2: "#eab308",
  P3: "#3b82f6",
};

export function DashboardPage() {
  const { selectedProjectId } = useProjectStore();
  const [recentBugs, setRecentBugs] = useState<BugListItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOpen: 0,
    totalClosed: 0,
    avgResolutionHours: 0,
    severityCounts: { P0: 0, P1: 0, P2: 0, P3: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch recent bugs
        const openBugs = await api.listBugs({
          project_id: selectedProjectId,
          page_size: 50,
          sort_by: "created_at",
          sort_order: "desc",
        });
        const closedBugs = await api.listBugs({
          project_id: selectedProjectId,
          status: "closed",
          page_size: 100,
        });

        const allBugs = openBugs.items;
        setRecentBugs(allBugs.slice(0, 10));

        // Calculate stats
        const openCount = allBugs.filter((b) => b.status !== "closed").length;
        const severityCounts: Record<BugSeverity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
        allBugs.forEach((b) => {
          if (b.severity && b.status !== "closed") {
            severityCounts[b.severity] = (severityCounts[b.severity] || 0) + 1;
          }
        });

        setStats({
          totalOpen: openCount,
          totalClosed: closedBugs.total,
          avgResolutionHours: 24, // Placeholder until API provides this
          severityCounts,
        });
      } catch {
        // silent fail for dashboard
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedProjectId]);

  if (!selectedProjectId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a project to view the dashboard
      </div>
    );
  }

  const pieData = Object.entries(stats.severityCounts)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Bug className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Bugs</p>
                <p className="text-2xl font-bold">{isLoading ? "—" : stats.totalOpen}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{isLoading ? "—" : stats.totalClosed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">P0/P1 Open</p>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : stats.severityCounts.P0 + stats.severityCounts.P1}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Resolution</p>
                <p className="text-2xl font-bold">{isLoading ? "—" : `${stats.avgResolutionHours}h`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts + Recent Bugs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Open Bugs by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No open bugs
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bugs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Bugs</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBugs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No bugs yet</div>
            ) : (
              <div className="space-y-3">
                {recentBugs.map((bug) => (
                  <Link
                    key={bug.id}
                    to={`/bugs/${bug.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <BugStatusBadge status={bug.status} />
                      <span className="font-medium truncate">{bug.title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <SeverityBadge severity={bug.severity} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(bug.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
