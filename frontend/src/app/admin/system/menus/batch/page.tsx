'use client';

import { useState } from 'react';
import client from '@/lib/api/client';

export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Upload, FileText, AlertCircle } from "lucide-react";

interface PreviewMenu {
    menuNo: number;
    menuNm: string;
    upperMenuId: number;
    menuOrdr: number;
    progrmFileNm: string;
}

export default function MenuBatchPage() {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<PreviewMenu[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            // 파일 미리보기 시뮬레이션
            setPreviewData([
                { menuNo: 1000, menuNm: '샘플메뉴1', upperMenuId: 0, menuOrdr: 1, progrmFileNm: 'sample1.do' },
                { menuNo: 1001, menuNm: '샘플메뉴2', upperMenuId: 1000, menuOrdr: 1, progrmFileNm: 'sample2.do' },
            ]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('파일을 선택해주세요.');
            return;
        }
        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await client.post('/sym/mnu/mpm/EgovMenuBndeRegistAPI.do', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.status === 'success') {
                alert('메뉴가 일괄 등록되었습니다.');
                setFile(null);
                setPreviewData([]);
            } else {
                setError(response.data.message || '일괄 등록 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error(err);
            setError('일괄 등록 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">메뉴 일괄등록</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>파일 업로드</CardTitle>
                    <CardDescription>
                        XML 또는 Excel 형식의 메뉴 데이터를 업로드하여 일괄 등록합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Input
                            type="file"
                            accept=".xml,.xlsx,.xls"
                            onChange={handleFileChange}
                            className="max-w-sm"
                        />
                        <Button onClick={handleUpload} disabled={!file || isProcessing}>
                            <Upload className="mr-2 h-4 w-4" />
                            {isProcessing ? '처리중...' : '일괄 등록'}
                        </Button>
                    </div>

                    {file && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>{file.name}</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {previewData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>미리보기</CardTitle>
                        <CardDescription>
                            업로드할 메뉴 데이터입니다. 확인 후 일괄 등록 버튼을 클릭하세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>메뉴번호</TableHead>
                                        <TableHead>메뉴명</TableHead>
                                        <TableHead>상위메뉴ID</TableHead>
                                        <TableHead>순서</TableHead>
                                        <TableHead>프로그램</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.map((menu) => (
                                        <TableRow key={menu.menuNo}>
                                            <TableCell>{menu.menuNo}</TableCell>
                                            <TableCell>{menu.menuNm}</TableCell>
                                            <TableCell>{menu.upperMenuId}</TableCell>
                                            <TableCell>{menu.menuOrdr}</TableCell>
                                            <TableCell>{menu.progrmFileNm}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
