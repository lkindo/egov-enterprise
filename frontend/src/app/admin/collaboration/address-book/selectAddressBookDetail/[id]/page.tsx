'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, MapPin, ArrowLeft, Send, Home, ChevronRight, Info } from "lucide-react";
import Link from 'next/link';

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
            alert('이름을 입력해 주세요.');
            return;
        }

        setLoading(true);
        try {
            await addressbookUserService.createAddressBook(formData);
            alert('등록되었습니다.');
            router.push('/admin/collaboration/address-book/selectAddressBookList');
        } catch (error: any) {
            alert(error.response?.data?.message || '등록에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-[0.1rem] w-fit border border-slate-100">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> 홈
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link href="/admin/collaboration/address-book/selectAddressBookList" className="hover:text-foreground transition-colors font-medium">주소록 관리</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-black">신규 등록</span>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-[0.1rem] bg-white ring-1 ring-slate-100">
                <CardHeader className="border-b bg-slate-50/50 pb-10 pt-10 px-12">
                    <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-[0.1rem] text-primary">
                            <User className="w-8 h-8" />
                        </div>
                        주소록 신규 등록
                    </CardTitle>
                    <p className="text-muted-foreground font-medium mt-2">새로운 연락처 정보를 시스템에 등록합니다.</p>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="pt-12 px-12 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <Label htmlFor="adbkNm" className="text-sm font-black flex items-center gap-2 text-slate-500">
                                        <span className="text-destructive">*</span> 성명
                                    </Label>
                                    <Input
                                        id="adbkNm"
                                        placeholder="성명을 입력하세요"
                                        className="h-14 text-base border-2 border-slate-50 focus:border-primary/20 bg-slate-50/50 rounded-[0.1rem] transition-all"
                                        value={formData.adbkNm}
                                        onChange={(e) => setFormData({ ...formData, adbkNm: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="telNo" className="text-sm font-black flex items-center gap-2 text-slate-500">
                                        <Phone className="w-4 h-4 opacity-40" /> 전화번호
                                    </Label>
                                    <Input
                                        id="telNo"
                                        placeholder="010-0000-0000"
                                        className="h-14 text-base border-2 border-slate-50 focus:border-primary/20 bg-slate-50/50 rounded-[0.1rem] transition-all font-mono tracking-tight"
                                        value={formData.telNo}
                                        onChange={(e) => setFormData({ ...formData, telNo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <Label htmlFor="email" className="text-sm font-black flex items-center gap-2 text-slate-500">
                                        <Mail className="w-4 h-4 opacity-40" /> 이메일 주소
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="example@egov.go.kr"
                                        className="h-14 text-base border-2 border-slate-50 focus:border-primary/20 bg-slate-50/50 rounded-[0.1rem] transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="adres" className="text-sm font-black flex items-center gap-2 text-slate-500">
                                        <MapPin className="w-4 h-4 opacity-40" /> 거주 주소
                                    </Label>
                                    <Input
                                        id="adres"
                                        placeholder="상세 주소를 입력하세요"
                                        className="h-14 text-base border-2 border-slate-50 focus:border-primary/20 bg-slate-50/50 rounded-[0.1rem] transition-all"
                                        value={formData.adres}
                                        onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-900 rounded-[0.1rem] flex items-start gap-4 shadow-xl ring-8 ring-slate-50">
                            <div className="p-2 bg-primary/20 rounded-[0.1rem] text-primary mt-1">
                                <Info className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-white font-black text-sm">정보 보호 안내</p>
                                <p className="text-slate-400 text-xs font-bold leading-relaxed">
                                    등록된 주소록 연락처는 부서/협업 시스템 내에서 공유 및 관리됩니다. 개인정보 보호 가이드라인을 준수하여 정확한 정보를 기입해 주세요.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col md:flex-row justify-center gap-6 py-12 border-t bg-slate-50/30 rounded-b-[2.5rem] mt-10">
                        <Link href="/admin/collaboration/address-book/selectAddressBookList">
                            <Button type="button" variant="ghost" className="h-16 px-10 gap-2 font-black text-slate-400 hover:bg-white hover:text-rose-500 hover:shadow-xl transition-all rounded-[0.1rem] border border-transparent hover:border-rose-50">
                                <ArrowLeft className="w-5 h-5" /> 등록 취소
                            </Button>
                        </Link>
                        <Button type="submit" className="h-16 px-16 gap-3 font-black bg-slate-900 text-white shadow-2xl shadow-slate-900/20 hover:bg-black transition-all active:scale-95 rounded-[0.1rem]" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2 animate-pulse">처리 중...</span>
                            ) : (
                                <>
                                    <Send className="w-5 h-5 text-primary" /> 주소록 등록하기
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
