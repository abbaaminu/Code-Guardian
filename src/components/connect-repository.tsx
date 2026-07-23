import { useState } from 'react';
import { Search, GitBranch, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ConnectRepositoryPanelProps {
  submitting?: boolean;
  onSubmit?: (v: { project_name: string; file_type: string; source_code: string }) => void;
  onSelectRepo?: (repoUrl: string, repoName: string) => void;
}

export function ConnectRepositoryPanel({ submitting, onSubmit, onSelectRepo }: ConnectRepositoryPanelProps) {
  const [username, setUsername] = useState('abbaaminu');
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchGitHubRepos = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Clean input: strip domain, protocol, trailing slashes, and '.git' extensions
      const cleanPath = username
        .trim()
        .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
        .replace(/^github\.com\//i, '')
        .replace(/\.git$/i, '')
        .replace(/^\/+|\/+$/g, '');

      const parts = cleanPath.split('/').filter(Boolean);

      if (parts.length === 0) {
        throw new Error('Please enter a valid GitHub username or repository URL');
      }

      // Automatically update the input box to show the clean format
      setUsername(cleanPath);

      if (parts.length >= 2) {
        // Case 1: Specific repository URL or path entered (e.g., abbaaminu/Code-Guardian)
        const owner = parts[0];
        const repoName = parts[1];
        const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);
        
        if (!response.ok) {
          throw new Error('Repository not found, or it may be private');
        }
        
        const data = await response.json();
        // Wrap the single repo object in an array so it renders cleanly in the list
        setRepos([data]);
      } else {
        // Case 2: Only username or organization provided (e.g., abbaaminu)
        const owner = parts[0];
        const response = await fetch(`https://api.github.com/users/${owner}/repos?sort=updated&per_page=15`);
        
        if (!response.ok) {
          throw new Error('GitHub account or organization not found');
        }
        
        const data = await response.json();
        setRepos(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repository data');
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScanRepo = (repoUrl: string, repoName: string) => {
    if (onSelectRepo) {
      onSelectRepo(repoUrl, repoName);
    }
    if (onSubmit) {
      onSubmit({
        project_name: repoName,
        file_type: 'Repository',
        source_code: `// Repository audit target: ${repoUrl}\n// Initialized from GitHub API integration`,
      });
    }
  };

  return (
    <div className="space-y-4 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
      <div className="flex gap-2">
        <Input
          placeholder="Enter username or repo URL (e.g., abbaaminu/Code-Guardian)..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-slate-950 border-slate-800 text-white"
        />
        <Button
          onClick={fetchGitHubRepos}
          disabled={loading || submitting}
          className="bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Fetch Repos
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {repos.map((repo) => (
          <div
            key={repo.id}
            className="flex items-center justify-between p-3 bg-slate-950/80 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3 overflow-hidden mr-2">
              <GitBranch className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <p className="font-mono text-sm font-medium text-slate-200 truncate">{repo.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{repo.description || 'Public Repository'}</p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={submitting}
              onClick={() => handleScanRepo(repo.html_url, repo.name)}
              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 shrink-0"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Scan Repo <ArrowRight className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        ))}
        {repos.length === 0 && !loading && !error && (
          <p className="text-xs text-slate-400 text-center py-4">Enter a username or repository URL and click "Fetch Repos".</p>
        )}
      </div>
    </div>
  );
}

// Named export alias for backward compatibility
export { ConnectRepositoryPanel as ConnectRepository };
