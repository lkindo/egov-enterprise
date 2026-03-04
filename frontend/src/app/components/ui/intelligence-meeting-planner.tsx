'use client';

import React, { useState } from 'react';
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Users,
    User,
    Plus,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    CheckCircle2,
    AlertCircle,
    Video,
    Monitor,
    Coffee,
    Sparkles
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface meetingRoom {
    id: string;
    name: string;
    capacity: number;
    location: string;
    amenities: ('video' | 'monitor' | 'coffee' | 'wifi')[];
    status: 'available' | 'occupied' | 'maintenance';
}

export interface Reservation {
    id: string;
    roomId: string;
    title: string;
    startTime: string;
    endTime: string;
    organizer: string;
    attendees: number;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 9); // 09:00 - 19:00

export function IntelligenceMeetingPlanner() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedRoom, setSelectedRoom] = useState<string | null>('room-1');

    const rooms: meetingRoom[] = [
        { id: 'room-1', name: 'Visionary Hall', capacity: 20, location: '12F Center', amenities: ['video', 'monitor', 'coffee'], status: 'available' },
        { id: 'room-2', name: 'Innovation Suite', capacity: 8, location: '10F North', amenities: ['monitor', 'wifi'], status: 'occupied' },
        { id: 'room-3', name: 'Strategic Lab', capacity: 12, location: '11F West', amenities: ['video', 'wifi'], status: 'available' },
        { id: 'room-4', name: 'Focus Room', capacity: 4, location: '10F South', amenities: ['monitor'], status: 'maintenance' },
    ];

    const reservations: Reservation[] = [
        { id: 'res-1', roomId: 'room-1', title: 'Q1 Strategy Sync', startTime: '10:00', endTime: '11:30', organizer: 'Admin.Kim', attendees: 12 },
        { id: 'res-2', roomId: 'room-2', title: 'Design Sprint', startTime: '13:00', endTime: '15:00', organizer: 'Designer.Lee', attendees: 6 },
        { id: 'res-3', roomId: 'room-1', title: 'Global Townhall', startTime: '15:30', endTime: '17:00', organizer: 'CEO.Park', attendees: 45 },
    ];

    const getAmIcon = (am: string) => {
        switch (am) {
            case 'video': return <Video size={14} />;
            case 'monitor': return <Monitor size={14} />;
            case 'coffee': return <Coffee size={14} />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col gap-8 h-[calc(100vh-12rem)] animate-in fade-in duration-700">
            {/* Upper Control Hub */}
            <div className="flex flex-col lg:flex-row items-stretch gap-6">
                {/* Date Picker & Stats Card */}
                <div className="w-full lg:w-80 p-8 bg-card border-2 border-primary/5 rounded-[2.5rem] shadow-xl flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <CalendarIcon size={120} className="text-primary" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <Button variant="ghost" size="icon" className="rounded-xl"><ChevronLeft size={20} /></Button>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Feb 2026</p>
                                <p className="text-lg font-black tracking-tight">Monday 23</p>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-xl"><ChevronRight size={20} /></Button>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-primary/5 rounded-2xl flex items-center justify-between border border-primary/10">
                                <span className="text-[10px] font-black text-muted-foreground uppercase">Scheduled</span>
                                <span className="text-lg font-black text-primary">08</span>
                            </div>
                            <div className="p-4 bg-emerald-500/5 rounded-2xl flex items-center justify-between border border-emerald-500/10">
                                <span className="text-[10px] font-black text-muted-foreground uppercase">Free Spaces</span>
                                <span className="text-lg font-black text-emerald-600">14</span>
                            </div>
                        </div>
                    </div>
                    <Button className="mt-8 rounded-2xl h-14 font-black shadow-xl shadow-primary/20 gap-2">
                        <Plus size={18} /> New Reservation
                    </Button>
                </div>

                {/* Room Selection Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {rooms.map(room => (
                        <div
                            key={room.id}
                            onClick={() => setSelectedRoom(room.id)}
                            className={cn(
                                "p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative group/room",
                                selectedRoom === room.id ? "bg-card border-primary ring-4 ring-primary/5 shadow-2xl" : "bg-white dark:bg-slate-800 border-transparent hover:bg-card hover:border-primary/20"
                            )}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                                    room.status === 'available' ? "bg-emerald-500/10 text-emerald-600" : room.status === 'occupied' ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"
                                )}>
                                    <MapPin size={18} />
                                </div>
                                <span className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                                    room.status === 'available' ? "text-emerald-500 border-emerald-500/20" : room.status === 'occupied' ? "text-amber-500 border-amber-500/20" : "text-rose-500 border-rose-500/20"
                                )}>{room.status}</span>
                            </div>
                            <h3 className="text-sm font-black text-foreground mb-1 group-hover/room:text-primary transition-colors">{room.name}</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 flex items-center gap-1.5">
                                <Users size={12} /> Capacity: {room.capacity}
                            </p>
                            <div className="mt-4 flex gap-2">
                                {room.amenities.map(am => (
                                    <div key={am} className="p-1.5 bg-background rounded-lg border text-muted-foreground/40 group-hover/room:text-primary/60 transition-colors">
                                        {getAmIcon(am)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Interactive Timeline Area */}
            <div className="flex-1 min-h-0 bg-card border-2 border-primary/5 rounded-[3rem] p-10 shadow-2xl overflow-hidden flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Timeline Scheduler</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 tracking-widest mt-0.5">Feb 23, 2026 - Room: {rooms.find(r => r.id === selectedRoom)?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-xl text-[10px] font-bold text-muted-foreground uppercase">
                            <div className="w-2 h-2 rounded-full bg-primary" /> Internal
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-xl text-[10px] font-bold text-muted-foreground uppercase">
                            <div className="w-2 h-2 rounded-full bg-purple-500" /> Client
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-x-auto custom-scrollbar pb-4 gap-4">
                    {/* Time Indicators Column */}
                    <div className="flex flex-col pt-16 pr-4 sticky left-0 z-20 bg-transparent">
                        {HOURS.map(hour => (
                            <div key={hour} className="h-24 text-[10px] font-black text-muted-foreground/40 text-right uppercase pt-1">
                                {hour.toString().padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-[800px] relative pt-16 bg-white dark:bg-slate-900 border-l border-primary/10 rounded-tl-[2rem]">
                        {/* Time Vertical Lines */}
                        <div className="absolute inset-0 top-16 grid grid-rows-[repeat(11,minmax(0,1fr))] pointer-events-none">
                            {HOURS.map(hour => (
                                <div key={hour} className="border-t border-primary/5" />
                            ))}
                        </div>

                        {/* Reservations Layer */}
                        <div className="relative h-full w-full p-4">
                            {reservations.filter(res => res.roomId === selectedRoom).map(res => {
                                const startH = parseInt(res.startTime.split(':')[0]);
                                const startM = parseInt(res.startTime.split(':')[1]);
                                const endH = parseInt(res.endTime.split(':')[0]);
                                const endM = parseInt(res.endTime.split(':')[1]);

                                const top = ((startH - 9) * 96) + (startM * 1.6);
                                const height = ((endH - startH) * 96) + ((endM - startM) * 1.6);

                                return (
                                    <div
                                        key={res.id}
                                        style={{ top, height }}
                                        className="absolute left-8 right-8 bg-primary/20 border-2 border-primary/30 rounded-[1.5rem] p-4 group transition-all hover:bg-primary/25 hover:border-primary/40 hover:scale-[1.01] hover:shadow-xl shadow-primary/10 cursor-pointer overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-xs font-black text-primary uppercase tracking-tight">{res.title}</h4>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-primary/60">{res.startTime} - {res.endTime}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical size={12} /></Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-80">
                                                <div className="w-5 h-5 rounded-lg bg-background border flex items-center justify-center"><User size={10} /></div>
                                                {res.organizer}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-80">
                                                <Users size={12} /> {res.attendees} Members
                                            </div>
                                        </div>
                                        <div className="absolute right-0 bottom-0 p-4 opacity-5 rotate-12 group-hover:scale-125 transition-transform group-hover:opacity-10">
                                            <Sparkles size={60} className="text-primary" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Room Suggestions Column (Right) */}
                    <div className="w-80 flex flex-col gap-4 pl-4 border-l border-primary/5 pt-16">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Suggestions</h4>
                        <div className="space-y-3">
                            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <CheckCircle2 size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Available Now</span>
                                </div>
                                <p className="text-xs font-black">Strategic Lab</p>
                                <p className="text-[10px] font-bold text-muted-foreground opacity-60">Ideal for 12 members. High-end video system ready.</p>
                                <Button variant="outline" size="sm" className="mt-2 rounded-xl text-[10px] font-black uppercase tracking-widest h-9">Instant Book</Button>
                            </div>
                            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-2 opacity-60">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <AlertCircle size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Conflict Detected</span>
                                </div>
                                <p className="text-xs font-black">Visionary Hall</p>
                                <p className="text-[10px] font-bold text-muted-foreground opacity-60">Next: CEO.Park at 15:30. Ensure clean-up by 15:15.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}