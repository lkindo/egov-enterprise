'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { addressbookUserService } from '@/services/user/addressbook/AddressbookUserService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Phone, Mail, MapPin, Calendar, ArrowLeft, Save, Edit, Trash2, Home, ChevronRight } from "lucide-react";

interface AddressBookDetail {
    adbkId: string;
    adbkNm: string;
    telNo: string;
    email: string;
    adres: string;
    frstRegisterId: string;
    frstRegisterPnttm: string;
}

const AddressBookDetailPage = () => {
    const params = useParams();
    const router = useRouter();
    const adbkId = params.id as string;

    const [detail, setDetail] = useState<AddressBookDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        adbkNm: '',
        telNo: '',
        email: '',
        adres: ''
    });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const response = await addressbookUserService.getAddressBook(adbkId);
            // ApiResponse.data가 바로 dto이므로 response를 사용하거나 구조에 맞춰 조정
            // 백엔드 AddressBookController.getAddressBook은 ApiResponse<AddressBookDto> 반환
            // client.get은 body.data(AddressBookDto)를 반환함.
            const data = response;
            setDetail(data);
            setFormData({
                adbkNm: data.adbkNm || '',
                telNo: data.telNo || '',
                email: data.email || '',
                adres: data.adres || ''
            });
        } catch (error) {
            console.error('Failed to fetch address book detail', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (adbkId) fetchDetail();
    }, [adbkId]);

    const handleUpdate = async () => {
        setActionLoading(true);
        try {
            await addressbookUserService.updateAddressBook(adbkId, formData);
            alert('수정되었습니다.');
            setIsEditing(false);
            fetchDetail();
        } catch (error: any) {
            alert(error.response?.data?.message || '수정에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        setActionLoading(true);
        try {
            await addressbookUserService.deleteAddressBook(adbkId);
            alert('삭제되었습니다.');
            router.push('/cop/adb/selectAddressBookList');
        } catch (error: any) {
            alert(error.response?.data?.message || '삭제에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-[300px]" />
                <Card><CardContent className="p-10 space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" /></CardContent></Card>
            </div>
        );
    }

    if (!detail) return <div className="p-10 text-center font-medium">데이터를 찾을 수 없습니다.</div>;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg w-fit">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link href="/cop/adb/selectAddressBookList" className="hover:text-foreground transition-colors">주소록관리</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">상세</span>
            </div>

            <Card className="shadow-lg border-none">
                <CardHeader className="border-b bg-muted/20 pb-6 rounded-t-xl">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl font-bold flex items-center gap-3">
                            <User className="w-6 h-6 text-primary" /> {isEditing ? '주소록 수정' : '주소록 상세'}
                        </CardTitle>
                        {!isEditing && (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
                                    <Edit className="w-4 h-4" /> 수정
                                </Button>
                                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={actionLoading} className="gap-2">
                                    <Trash2 className="w-4 h-4" /> 삭제
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                    {/* Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="adbkNm" className="text-muted-foreground flex items-center gap-2">
                                    <User className="w-4 h-4" /> 이름
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="adbkNm"
                                        value={formData.adbkNm}
                                        onChange={(e) => setFormData({ ...formData, adbkNm: e.target.value })}
                                        className="h-11"
                                    />
                                ) : (
                                    <div className="text-lg font-bold py-2 border-b border-muted">{detail.adbkNm}</div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="telNo" className="text-muted-foreground flex items-center gap-2">
                                    <Phone className="w-4 h-4" /> 전화번호
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="telNo"
                                        value={formData.telNo}
                                        onChange={(e) => setFormData({ ...formData, telNo: e.target.value })}
                                        className="h-11"
                                    />
                                ) : (
                                    <div className="text-lg font-mono py-2 border-b border-muted">{detail.telNo}</div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-muted-foreground flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> 이메일
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="h-11"
                                    />
                                ) : (
                                    <div className="text-lg py-2 border-b border-muted">{detail.email || '정보 없음'}</div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adres" className="text-muted-foreground flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> 주소
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="adres"
                                        value={formData.adres}
                                        onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                                        className="h-11"
                                    />
                                ) : (
                                    <div className="text-lg py-2 border-b border-muted">{detail.adres || '정보 없음'}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {!isEditing && (
                        <div className="pt-6 border-t border-muted grid grid-cols-2 gap-4 text-sm text-muted-foreground bg-muted/10 p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 opacity-70" /> 등록자: <span className="text-foreground font-medium">{detail.frstRegisterId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 opacity-70" /> 등록일: <span className="text-foreground font-medium">{detail.frstRegisterPnttm?.substring(0, 10)}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center gap-4 py-8 border-t bg-muted/5 rounded-b-xl">
                    <Link href="/cop/adb/selectAddressBookList">
                        <Button variant="outline" className="h-11 px-8 gap-2 shadow-sm transition-all hover:bg-muted">
                            <ArrowLeft className="w-4 h-4" /> 목록으로
                        </Button>
                    </Link>
                    {isEditing && (
                        <>
                            <Button onClick={handleUpdate} className="h-11 px-8 gap-2 shadow-md transition-all active:scale-95" disabled={actionLoading}>
                                <Save className="w-4 h-4" /> 저장하기
                            </Button>
                            <Button variant="ghost" onClick={() => setIsEditing(false)} className="h-11 px-8 transition-all">
                                취소
                            </Button>
                        </>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default AddressBookDetailPage;
