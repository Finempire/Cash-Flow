'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Check, X, Eye, Download, Camera, RefreshCw } from 'lucide-react';

export type UploadType = 'PROVISIONAL_INVOICE' | 'TAX_INVOICE' | 'PAYMENT_PROOF';

interface FileUploadProps {
    type: UploadType;
    purchaseId?: string;
    onUploaded?: (filePath: string) => void;
    existingPath?: string | null;
    existingUrl?: string | null;
    label?: string;
    required?: boolean;
    disabled?: boolean;
}

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

export default function FileUpload({
    type,
    purchaseId,
    onUploaded,
    existingPath,
    existingUrl,
    label,
    required,
    disabled,
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [state, setState] = useState<UploadState>(existingPath ? 'success' : 'idle');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [uploadedPath, setUploadedPath] = useState<string | null>(existingPath || null);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingUrl || null);

    const handleFileSelect = useCallback((file: File) => {
        setError(null);

        // Client-side validation
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.type)) {
            setError('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be under 10MB');
            return;
        }

        setSelectedFile(file);
        setState('selected');

        // Generate preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setState('uploading');
        setProgress(0);
        setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', type);
        if (purchaseId) formData.append('purchase_id', purchaseId);

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = await new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        setProgress(Math.round((e.loaded / e.total) * 100));
                    }
                });
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const responseData = JSON.parse(xhr.responseText);
                        if (responseData.success) resolve(responseData);
                        else reject(new Error(responseData.error || 'Upload failed'));
                    } else {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            reject(new Error(data.error || 'Upload failed'));
                        } catch {
                            reject(new Error('Upload failed'));
                        }
                    }
                });
                xhr.addEventListener('error', () => reject(new Error('Network error')));
                xhr.open('POST', '/api/upload');
                xhr.send(formData);
            });

            setUploadedPath(data.file_path);
            setUploadedUrl(data.signed_url);
            setState('success');
            onUploaded?.(data.file_path);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
            setState('error');
        }
    };

    const handleReset = () => {
        setState('idle');
        setSelectedFile(null);
        setPreview(null);
        setError(null);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = '';
    };

    const viewUrl = uploadedUrl ? uploadedUrl : null;

    const downloadUrl = uploadedUrl ? `${uploadedUrl}&download=1` : null;

    const fileName = uploadedPath
        ? uploadedPath.split('/').pop() || 'document'
        : selectedFile?.name || '';

    return (
        <div className="space-y-2">
            {label && (
                <label className="label">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}

            {/* Hidden file input — camera on mobile */}
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture={type !== 'PAYMENT_PROOF' ? 'environment' : undefined}
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled || state === 'uploading'}
                id={`file-upload-${type}`}
            />

            {/* === IDLE STATE === */}
            {state === 'idle' && (
                <label
                    htmlFor={`file-upload-${type}`}
                    className={`flex flex-col items-center justify-center gap-2 min-h-[120px] w-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                        <div className="flex gap-3">
                            <Upload size={22} />
                            <Camera size={22} />
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                            Tap to upload or take photo
                        </span>
                        <span className="text-2xs text-gray-400">
                            JPEG, PNG, WebP, PDF · max 10 MB
                        </span>
                    </div>
                </label>
            )}

            {/* === SELECTED STATE === */}
            {state === 'selected' && selectedFile && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {preview ? (
                        <div className="relative bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={preview}
                                alt="Preview"
                                className="max-h-48 w-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-gray-50">
                            <FileText size={32} className="text-red-500 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">
                                    {selectedFile.name}
                                </p>
                                <p className="text-2xs text-gray-500">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 p-2 bg-white border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleUpload}
                            className="btn-primary flex-1 sm:flex-none"
                        >
                            <Upload size={14} />
                            Upload Now
                        </button>
                        <label
                            htmlFor={`file-upload-${type}`}
                            className="btn-secondary cursor-pointer text-xs"
                        >
                            Change File
                        </label>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="btn-ghost p-1.5"
                            title="Remove"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* === UPLOADING STATE === */}
            {state === 'uploading' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                        <span className="text-xs text-gray-600 font-medium">Uploading...</span>
                        <span className="text-xs text-gray-400 ml-auto">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-2xs text-gray-400 truncate">{selectedFile?.name}</p>
                </div>
            )}

            {/* === SUCCESS STATE === */}
            {state === 'success' && (
                <div className="border border-green-200 bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                            <Check size={12} className="text-white" />
                        </div>
                        <p className="text-xs font-medium text-green-800 truncate flex-1">
                            {fileName}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {viewUrl && (
                            <a
                                href={viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary text-2xs flex items-center gap-1"
                            >
                                <Eye size={12} />
                                View
                            </a>
                        )}
                        {downloadUrl && (
                            <a
                                href={downloadUrl}
                                download
                                className="btn-secondary text-2xs flex items-center gap-1"
                            >
                                <Download size={12} />
                                Download
                            </a>
                        )}
                        {!disabled && (
                            <label
                                htmlFor={`file-upload-${type}`}
                                className="btn-ghost text-2xs cursor-pointer flex items-center gap-1"
                            >
                                <RefreshCw size={12} />
                                Change
                            </label>
                        )}
                    </div>
                </div>
            )}

            {/* === ERROR STATE === */}
            {state === 'error' && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <X size={14} className="text-red-500 shrink-0" />
                        <p className="text-xs text-red-700">{error}</p>
                    </div>
                    <label
                        htmlFor={`file-upload-${type}`}
                        className="btn-secondary text-xs cursor-pointer inline-flex items-center gap-1"
                    >
                        <RefreshCw size={12} />
                        Try Again
                    </label>
                </div>
            )}

            {/* Inline error from parent validation */}
            {state !== 'error' && error && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                    <X size={11} />
                    {error}
                </p>
            )}
        </div>
    );
}
