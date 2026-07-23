import { useState } from 'react';
import { Search, GitBranch, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ConnectRepositoryProps {
  onSelectRepo: (repoUrl: string, repoName: string) => void;
}

export function ConnectRepository({ onSelectRepo }: ConnectRepositoryProps) {
  const [username, setUsername] = useState('abbaaminu');
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchGitHubRepos = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=15`);
      if (!response.ok) throw new Error('GitHub account or organization not found');
      const data = await response.json();
      setRepos(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
      <div className="flex gap-2">
        <Input
          placeholder="Enter GitHub username/org (e.g., abbaaminu)..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-slate-950 border-slate-800 text-white"
        />
        <Button onClick={fetchGitHubRepos} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          Fetch Repos
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {repos.map((repo) => (
          <div key={repo.id} className="flex items-center justify-between p-3 bg-slate-950/80 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="font-mono text-sm font-medium text-slate-200">{repo.full_name}</p>
                <p className="text-xs text-slate-400">{repo.description || 'Public Repository'}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onSelectRepo(repo.html_url, repo.name)}
              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
            >
              Scan Repo <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
