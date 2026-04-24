'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
    return (
        <footer className="w-full bg-slate-900/40 backdrop-blur-3xl border-t border-white/5 py-24 pb-12 mt-20 relative overflow-hidden group">
            {/* Glossy background detail */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-hub-purple/5 opacity-50 pointer-events-none" />

            <div className="container mx-auto px-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">
                    {/* Left Column: Brand and Policy Links */}
                    <div className="lg:col-span-5 space-y-12">
                        <div className="flex items-center gap-6">
                            <Image
                                src="/api/v1/images/logo_footer.png"
                                alt="표준프레임워크 포털 eGovFrame"
                                width={180}
                                height={45}
                                className="brightness-110 contrast-125 saturate-150 drop-shadow-2xl"
                            />
                            <div className="h-6 w-px bg-white/10 hidden md:block" />
                            <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/30 hidden md:block">
                                표준프레임워크
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
                            <Link href="/help/policies/privacy" className="text-white hover:text-primary font-bold tracking-tight transition-all hover:scale-105 active:scale-95 duration-300">
                                개인정보처리방침
                            </Link>
                            <Link href="/help/policies/copyright" className="text-white/60 hover:text-white transition-all duration-300">
                                저작권보호정책
                            </Link>
                            <Link href="/help/policies/email" className="text-white/60 hover:text-white transition-all duration-300">
                                이메일무단수집거부
                            </Link>
                        </div>

                        <div className="space-y-4 text-white/40 text-sm leading-relaxed max-w-lg">
                            <address className="not-italic">
                                대표문의메일: egovframesupport@gmail.com | 대표전화: 0000-0000<br />
                                호환성확인: 000-0000-0000 | 교육문의 : 000-0000-0000
                            </address>
                            <p className="font-medium tracking-widest text-[11px] opacity-70">
                                Copyright © 2021 행정안전부. 모든 권리 보유.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Family Banner & Stats Summary */}
                    <div className="lg:col-span-7 flex flex-col justify-end items-start md:items-end gap-12">
                        <div className="flex gap-12 items-center opacity-40 hover:opacity-100 transition-opacity duration-700">
                            <a href="#" className="hover:grayscale-0 transition-all scale-100 hover:scale-110">
                                <Image src="/api/v1/images/banner01.png" alt="행정안전부" width={140} height={40} className="invert brightness-200" />
                            </a>
                            <a href="#" className="hover:grayscale-0 transition-all scale-100 hover:scale-110">
                                <Image src="/api/v1/images/banner02.png" alt="NIA 한국지능정보사회진흥원" width={140} height={40} className="invert brightness-200" />
                            </a>
                        </div>

                        {/* Status Grid Detail */}
                        <div className="hidden lg:grid grid-cols-2 gap-x-16 gap-y-4 text-right">
                            <div className="space-y-2">
                                <div className="text-[10px] uppercase font-black tracking-widest text-primary">시스템 가동률</div>
                                <div className="text-2xl font-black text-white/90 font-mono tracking-tighter">99.99%</div>
                            </div>
                            <div className="space-y-2">
                                <div className="text-[10px] uppercase font-black tracking-widest text-hub-emerald">보안 상태</div>
                                <div className="text-2xl font-black text-white/90 font-mono tracking-tighter">안전</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Bottom Accent Line */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-[2s] ease-out" />
        </footer>
    );
};

export default Footer;
