'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addressbookUserService } from '@/services/user/addressbook/AddressbookUserService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, MapPin, ArrowLeft, Send, Home, ChevronRight } from "lucide-react";

const InsertAddressBookPage = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        adbkNm: '',
        telNo: '',
        email: '',
        adres: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.adbkNm.trim()) {
            alert('이름을 입력해주세요.');
            return;
        }

        setLoading(true);
        try {
            await addressbookUserService.createAddressBook(formData);
            alert('등록되었습니다.');
            router.push('/cop/adb/selectAddressBookList');
        } catch (error: any) {
            alert(error.response?.data?.message || '등록에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

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
                <span className="text-foreground font-medium">등록</span>
            </div>

            <Card className="shadow-xl border-none">
                <CardHeader className="border-b bg-muted/10 pb-6 rounded-t-xl">
                    <CardTitle className="text-2xl font-bold flex items-center gap-3">
                        <User className="w-6 h-6 text-primary" /> 주소록 신규 등록
                    </CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="pt-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="adbkNm" className="text-sm font-semibold flex items-center gap-2">
                                        <span className="text-destructive">*</span> <User className="w-4 h-4" /> 이름
                                    </Label>
                                    <Input
                                        id="adbkNm"
                                        placeholder="이름을 입력하세요"
                                        className="h-12 text-base shadow-sm focus-visible:ring-primary/20"
                                        value={formData.adbkNm}
                                        onChange={(e) => setFormData({ ...formData, adbkNm: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telNo" className="text-sm font-semibold flex items-center gap-2">
                                        <Phone className="w-4 h-4" /> 전화번호
                                    </Label>
                                    <Input
                                        id="telNo"
                                        placeholder="010-0000-0000"
                                        className="h-12 text-base shadow-sm font-mono tracking-tight"
                                        value={formData.telNo}
                                        onChange={(e) => setFormData({ ...formData, telNo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> 이메일
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="example@company.com"
                                        className="h-12 text-base shadow-sm"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adres" className="text-sm font-semibold flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> 주소
                                    </Label>
                                    <Input
                                        id="adres"
                                        placeholder="상세 주소를 입력하세요"
                                        className="h-12 text-base shadow-sm"
                                        value={formData.adres}
                                        onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg flex items-start gap-3">
                            <div className="text-primary mt-0.5">💡</div>
                            <p className="text-sm text-primary/80 leading-relaxed font-medium">
                                주소록에 등록된 연락처는 협업 시스템 내에서 공유 및 관리됩니다. 정확한 정보를 입력해 주세요.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4 py-10 border-t bg-muted/5 rounded-b-xl">
                        <Link href="/cop/adb/selectAddressBookList">
                            <Button type="button" variant="outline" className="h-12 px-10 gap-2 font-semibold shadow-sm hover:bg-muted transition-all">
                                <ArrowLeft className="w-4 h-4" /> 취소
                            </Button>
                        </Link>
                        <Button type="submit" className="h-12 px-12 gap-2 font-bold shadow-lg transition-all active:scale-95" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">처리중...</span>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" /> 등록하기
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default InsertAddressBookPage;
