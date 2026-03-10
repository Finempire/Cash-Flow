'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type Comment = {
    id: string;
    body: string;
    mentions: string[];
    created_at: string;
    updated_at: string;
    author: {
        id: string;
        name: string;
        role: string;
    };
};

type CommentThreadProps = {
    entityType: string;
    entityId: string;
    className?: string;
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function CommentThread({ entityType, entityId, className = '' }: CommentThreadProps) {
    const { data: session } = useSession();
    const [comments, setComments] = useState<Comment[]>([]);
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments ?? []);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (entityId) fetchComments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityId]);

    const handleSubmit = async () => {
        if (!body.trim() || submitting) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entityType, entityId, body }),
            });
            if (res.ok) {
                setBody('');
                await fetchComments();
            }
        } finally {
            setSubmitting(false);
        }
    };

    const roleColors: Record<string, string> = {
        ACCOUNTANT: 'bg-blue-100 text-blue-700',
        STORE_MANAGER: 'bg-green-100 text-green-700',
        RUNNER: 'bg-orange-100 text-orange-700',
        CEO: 'bg-purple-100 text-purple-700',
    };

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Comments ({comments.length})
            </h3>

            {/* Comment List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
                {loading ? (
                    <p className="text-xs text-gray-400 text-center py-4">Loading…</p>
                ) : comments.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No comments yet.</p>
                ) : (
                    comments.map((c) => (
                        <div key={c.id} className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-2xs font-semibold text-gray-600 shrink-0 uppercase">
                                {c.author.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-semibold text-gray-800">{c.author.name}</span>
                                    <span className={`text-2xs px-1.5 py-0.5 rounded font-medium ${roleColors[c.author.role] ?? 'bg-gray-100 text-gray-500'}`}>
                                        {c.author.role.replace('_', ' ')}
                                    </span>
                                    <span className="text-2xs text-gray-400 ml-auto">{timeAgo(c.created_at)}</span>
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* New Comment Input */}
            {session && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-2xs font-semibold text-blue-600 shrink-0 uppercase">
                        {session.user?.name?.charAt(0) ?? '?'}
                    </div>
                    <div className="flex-1">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Add a comment… use @name to mention"
                            rows={2}
                            className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-400"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-2xs text-gray-400">Ctrl+Enter to submit</span>
                            <button
                                onClick={handleSubmit}
                                disabled={!body.trim() || submitting}
                                className="btn-primary text-2xs px-3 py-1 disabled:opacity-50"
                            >
                                {submitting ? 'Posting…' : 'Comment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
