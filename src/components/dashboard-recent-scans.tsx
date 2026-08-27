import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/severity-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ExternalLink, FileDown } from "lucide-react";
import { HealthBar, topSeverity } from "@/components/dashboard-stat-cards";
import type { ScanSummary } from "@/lib/scan-types";

export function RecentScansTable({
  scans,
  isLoading,
  onExport,
}: {
  scans: ScanSummary[];
  isLoading: boolean;
  onExport: (scan: ScanSummary) => void;
}) {
  return (
    <section id="history" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-tight">
          Recent audits
        </h2>
        <span className="text-xs text-muted-foreground">
          {scans.length} scans
        </span>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Project</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Threat</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="text-right">Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && scans.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No scans yet — submit code above to run your first audit.
                </TableCell>
              </TableRow>
            )}
            {scans.map((s) => {
              const top = topSeverity(s.vulnerabilities_count);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {s.project_name}
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs">
                      {s.file_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.created_at
                      ? new Date(s.created_at).toLocaleString()
                      : "Just now"}
                  </TableCell>
                  <TableCell>
                    {top ? (
                      <SeverityBadge severity={top} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        clean
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <HealthBar score={s.health_score ?? 100} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Report <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                          <Link
                            to="/scans/$id"
                            params={{ id: s.id }}
                            className="cursor-pointer"
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            View online workspace
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => onExport(s)}
                          className="cursor-pointer"
                        >
                          <FileDown className="mr-2 h-3.5 w-3.5" />
                          Export executive summary
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
