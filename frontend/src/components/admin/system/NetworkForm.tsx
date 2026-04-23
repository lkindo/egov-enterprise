'use client';

import React, { useState } from 'react';
import { FormField } from '@/app/components/ui/standard-form';
import { NetworkInfo } from '@/services/foundation/system/networkService';

interface NetworkFormProps {
    initialData?: Partial<NetworkInfo>;
    onSubmit: (data: Partial<NetworkInfo>) => Promise<void>;
    onCancel: () => void;
}

export function NetworkForm({ initialData, onSubmit, onCancel }: NetworkFormProps) {
    const [formData, setFormData] = useState<Partial<NetworkInfo>>({
        manageIem: '',
        ntwrkIp: '',
        subnet: '',
        gtwy: '',
        domnServer: '',
        userNm: '',
        useAt: 'Y',
        ...initialData
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="愿由ы빆紐? required>
                    <input
                        type="text"
                        value={formData.manageIem || ''}
                        onChange={(e) => setFormData({ ...formData, manageIem: e.target.value })}
                        placeholder="?? ?대?留??쒕쾭"
                        className="w-full h-10 px-3 rounded-md border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:ring-2 focus:ring-primary/20"
                        required
                    />
                </FormField>
                <FormField label="?ъ슜?먮챸" required>
                    <input
                        type="text"
                        value={formData.userNm || ''}
                        onChange={(e) => setFormData({ ...formData, userNm: e.target.value })}
                        placeholder="愿由ъ옄 ?깅챸"
                        className="w-full h-10 px-3 rounded-md border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:ring-2 focus:ring-primary/20"
                        required
                    />
                </FormField>
                <FormField label="IP 二쇱냼" required>
                    <input
                        type="text"
                        value={formData.ntwrkIp || ''}
                        onChange={(e) => setFormData({ ...formData, ntwrkIp: e.target.value })}
                        placeholder="192.168.0.1"
                        className="w-full h-10 px-3 rounded-md border bg-background font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:ring-2 focus:ring-primary/20"
                        required
                    />
                </FormField>
                <FormField label="?쒕툕??留덉뒪?? required>
                    <input
                        type="text"
                        value={formData.subnet || ''}
                        onChange={(e) => setFormData({ ...formData, subnet: e.target.value })}
                        placeholder="255.255.255.0"
                        className="w-full h-10 px-3 rounded-md border bg-background font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:ring-2 focus:ring-primary/20"
                        required
                    />
                </FormField>
                <FormField label="寃뚯씠?몄썾?? required>
                    <input
                        type="text"
                        value={formData.gtwy || ''}
                        onChange={(e) => setFormData({ ...formData, gtwy: e.target.value })}
                        placeholder="192.168.0.254"
                        className="w-full h-10 px-3 rounded-md border bg-background font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:ring-2 focus:ring-primary/20"
                        required
                    />
                </FormField>
                <FormField label="DNS ?쒕쾭">
                    <input
                        type="text"
                        value={formData.domnServer || ''}
                        onChange={(e) => setFormData({ ...formData, domnServer: e.target.value })}
                        placeholder="8.8.8.8"
                        className="w-full h-10 px-3 rounded-md border bg-background font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:ring-2 focus:ring-primary/20"
                    />
                </FormField>
            </div>
            <FormField label="?ъ슜 ?щ?" required>
                <select
                    value={formData.useAt}
                    onChange={(e) => setFormData({ ...formData, useAt: e.target.value as 'Y' | 'N' })}
                    className="w-full h-10 px-3 rounded-md border bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:ring-2 focus:ring-primary/20"
                >
                    <option value="Y">?ъ슜 以?/option>
                    <option value="N">誘몄궗??/option>
                </select>
            </FormField>

            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg font-bold">痍⑥냼</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 transition">
                    ??ν븯湲?                </button>
            </div>
        </form>
    );
}
