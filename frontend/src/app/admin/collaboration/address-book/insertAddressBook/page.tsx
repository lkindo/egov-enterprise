'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
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
 alert('?´ë¦„???…ë ¥?´ì£¼?¸ìš”.');
 return;
 }

 setLoading(true);
 try {
 await addressbookUserService.createAddressBook(formData);
 alert('?±ë¡?˜ì—ˆ?µë‹ˆ??');
 router.push('/admin/collaboration/address-book/selectAddressBookList');
 } catch (error: any) {
 alert(error.response?.data?.message || '?±ë¡???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
 {/* Breadcrumb */}
 <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg w-fit">
 <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
 <Home className="w-4 h-4" /> ?? </Link>
 <ChevronRight className="w-4 h-4" />
 <Link href="/admin/collaboration/address-book/selectAddressBookList" className="hover:text-foreground transition-colors">ì£¼ì†Œë¡ê?ë¦?/Link>
 <ChevronRight className="w-4 h-4" />
 <span className="text-foreground font-medium">?±ë¡</span>
 </div>

 <Card className="shadow-xl border-none">
 <CardHeader className="border-b bg-muted/10 pb-6 rounded-t-xl">
 <CardTitle className="text-2xl font-bold flex items-center gap-3">
 <User className="w-6 h-6 text-primary" /> ì£¼ì†Œë¡?? ê·œ ?±ë¡
 </CardTitle>
 </CardHeader>
 <form onSubmit={handleSubmit}>
 <CardContent className="pt-10 space-y-8">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-6">
 <div className="space-y-2">
 <Label htmlFor="adbkNm" className="text-sm font-semibold flex items-center gap-2">
 <span className="text-destructive">*</span> <User className="w-4 h-4" /> ?´ë¦„
 </Label>
 <Input
 id="adbkNm"
 placeholder="?´ë¦„???…ë ¥?˜ì„¸??
 className="h-12 text-base shadow-sm focus-visible:ring-primary/20"
 value={formData.adbkNm}
 onChange={(e) => setFormData({ ...formData, adbkNm: e.target.value })}
 required
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="telNo" className="text-sm font-semibold flex items-center gap-2">
 <Phone className="w-4 h-4" /> ?„í™”ë²ˆí˜¸
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
 <Mail className="w-4 h-4" /> ?´ë©”?? </Label>
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
 <MapPin className="w-4 h-4" /> ì£¼ì†Œ
 </Label>
 <Input
 id="adres"
 placeholder="?ì„¸ ì£¼ì†Œë¥??…ë ¥?˜ì„¸??
 className="h-12 text-base shadow-sm"
 value={formData.adres}
 onChange={(e) => setFormData({ ...formData, adres: e.target.value })}
 />
 </div>
 </div>
 </div>

 <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg flex items-start gap-3">
 <div className="text-primary mt-0.5">?’¡</div>
 <p className="text-sm text-primary/80 leading-relaxed font-medium">
 ì£¼ì†Œë¡ì— ?±ë¡???°ë½ì²˜ëŠ” ?‘ì—… ?œìŠ¤???´ì—??ê³µìœ  ë°?ê´€ë¦¬ë©?ˆë‹¤. ?•í™•???•ë³´ë¥??…ë ¥??ì£¼ì„¸??
 </p>
 </div>
 </CardContent>
 <CardFooter className="flex justify-center gap-4 py-10 border-t bg-muted/5 rounded-b-xl">
 <Link href="/admin/collaboration/address-book/selectAddressBookList">
 <Button type="button" variant="outline" className="h-12 px-10 gap-2 font-semibold shadow-sm hover:bg-muted transition-all">
 <ArrowLeft className="w-4 h-4" /> ì·¨ì†Œ
 </Button>
 </Link>
 <Button type="submit" className="h-12 px-12 gap-2 font-bold shadow-lg transition-all active:scale-95" disabled={loading}>
 {loading ? (
 <span className="flex items-center gap-2">ì²˜ë¦¬ì¤?..</span>
 ) : (
 <>
 <Send className="w-4 h-4" /> ?±ë¡?˜ê¸°
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
