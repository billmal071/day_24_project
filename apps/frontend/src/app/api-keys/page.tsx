'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getApiKeys, createApiKey, revokeApiKey } from '@/lib/api/api-keys';
import type { ApiKey } from '@/types/api';
import { Plus, Key, Trash2, Copy, Check, AlertTriangle } from 'lucide-react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function fetchKeys() {
    const result = await getApiKeys();
    if (result.success) {
      setKeys(result.data.keys);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchKeys();
  }, []);

  async function handleCreate() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const result = await createApiKey({ name: newKeyName });
    if (result.success) {
      setNewKey(result.data.key);
      setNewKeyName('');
      fetchKeys();
    } else {
      setError(result.error.message);
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    const result = await revokeApiKey(id);
    if (result.success) {
      fetchKeys();
    } else {
      setError(result.error.message);
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-6 bg-muted rounded w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {newKey && (
        <Card className="border-green-500 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-700">API Key Created!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-600 mb-2">
              Copy this key now - it will not be shown again!
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-white p-2 rounded border text-sm font-mono break-all">
                {newKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(newKey)}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => setNewKey(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="API Key Name (e.g., Production, Development)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {keys.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          keys.map((key) => (
            <Card key={key.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        <code className="text-sm text-muted-foreground">
                          {key.keyPrefix}***
                        </code>
                        <Badge
                          variant={key.isActive ? 'success' : 'destructive'}
                        >
                          {key.isActive ? 'Active' : 'Revoked'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rate limit: {key.rateLimit} req/min •{' '}
                        {key.lastUsedAt
                          ? `Last used: ${new Date(key.lastUsedAt).toLocaleDateString()}`
                          : 'Never used'}
                      </div>
                    </div>
                  </div>
                  {key.isActive && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevoke(key.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
