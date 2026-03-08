'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { MasterDetailLayout } from '@/app/components/MasterDetailLayout';
import { addressbookUserService } from '@/services/user/addressbook/AddressbookUserService';
import { NameCard } from '@/types/addressbook';
import { useToast } from '@/app/components/ui/toast';
import { Contact, Phone, Mail, Building2, MapPin, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function AddressBookPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<NameCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<NameCard | null>(null);

  const loadContacts = useCallback(async (keyword?: string) => {
    try {
      setLoading(true);
      const res = await addressbookUserService.searchUsers(keyword || '');
      const data = (res as any).content || [];
      setContacts(data);
      if (data.length > 0 && !selectedContact) {
        // 첫 번째 아이템 자동 선택 (Optional)
        // setSelectedContact(data[0]);
      }
    } catch (error) {
      toast('주소록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, selectedContact]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const renderMaster = (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-6 precision-border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
          <input
            type="text"
            placeholder="Search contact..."
            className="w-full bg-slate-100/50 dark:bg-slate-800/50 border-none rounded-none py-2.5 pl-9 pr-4 text-xs tracking-tight focus:ring-1 focus:ring-primary/30 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              loadContacts(e.target.value);
            }}
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-12 text-center text-[10px] uppercase tracking-[0.2em] animate-pulse text-muted-foreground">
            Synchronizing...
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 italic">
            No results found
          </div>
        ) : (
          contacts.map((item, index) => (
            <motion.div
              key={item.ncrdId || index}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "relative group cursor-pointer precision-border-b py-4 px-6 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all duration-200",
                selectedContact?.ncrdId === item.ncrdId && "bg-slate-50 dark:bg-slate-900/50"
              )}
              onClick={() => setSelectedContact(item)}
            >
              {/* Selection Indicator */}
              {selectedContact?.ncrdId === item.ncrdId && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary z-20"
                />
              )}

              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-none border-[0.5px] border-border/50 flex items-center justify-center text-[10px] font-bold text-muted-foreground bg-slate-50 dark:bg-slate-900 overflow-hidden">
                  {item.ncrdNm.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-bold tracking-tight text-foreground">{item.ncrdNm}</h4>
                    <ChevronRight size={12} className={cn(
                      "text-muted-foreground/30 transition-transform group-hover:translate-x-0.5",
                      selectedContact?.ncrdId === item.ncrdId && "text-primary/50"
                    )} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-wider">{item.deptNm}</p>
                    <span className="w-px h-2 bg-border/50" />
                    <p className="text-[11px] text-muted-foreground/70 truncate">{item.cmpnyNm}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );

  const renderDetail = selectedContact ? (
    <div className="max-w-4xl mx-auto py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Profile Section */}
        <div className="lg:col-span-1 space-y-8">
          <div className="relative inline-block">
            <div className="w-32 h-32 precision-border bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-5xl font-thin text-muted-foreground/40">
              {selectedContact.ncrdNm.charAt(0)}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white flex items-center justify-center rounded-none shadow-lg border-4 border-background">
              <Contact size={18} />
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-extralight tracking-tighter text-foreground mb-1">
              {selectedContact.ncrdNm}
            </h2>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">{selectedContact.deptNm}</span>
              <span className="text-sm font-medium text-muted-foreground">{selectedContact.cmpnyNm}</span>
            </div>
          </div>

          <div className="pt-8 flex flex-col gap-3">
            <button className="w-full py-3 px-6 bg-primary text-white text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-primary/90 transition-all">
              Send Message
            </button>
            <button className="w-full py-3 px-6 precision-border bg-card text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
              Write Email
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="lg:col-span-2 space-y-12">
          <section>
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <span className="w-4 h-px bg-muted-foreground/30" /> Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
              <DetailItem icon={<Phone size={14} />} label="Mobile Phone" value={selectedContact.mbtlNum} />
              <DetailItem icon={<Building2 size={14} />} label="Office Number" value={selectedContact.telNo} />
              <DetailItem icon={<Mail size={14} />} label="Email Address" value={selectedContact.emailAdres} />
              <DetailItem icon={<MapPin size={14} />} label="Office Location" value="HQ 4th Floor, Smart Office" />
            </div>
          </section>

          <section>
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <span className="w-4 h-px bg-muted-foreground/30" /> Additional Details
            </h3>
            <div className="p-8 precision-border bg-slate-50/50 dark:bg-slate-900/30">
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "This contact is part of the regular cooperation group. Primary contact for internal project approvals and departmental coordination."
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="px-8 py-4 precision-border-b bg-background/80 backdrop-blur-sm z-10">
        <PageHeader
          title="Integrated Contacts"
          breadcrumbs={[{ label: 'Collaboration' }, { label: 'Address Book' }]}
        />
      </div>
      <div className="flex-1 min-h-0">
        <MasterDetailLayout
          master={renderMaster}
          detail={renderDetail}
          showDetail={!!selectedContact}
          masterWidth="w-[380px]"
        />
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="space-y-1.5 group">
      <div className="flex items-center gap-2 text-muted-foreground/50 group-hover:text-primary transition-colors">
        {icon}
        <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="text-base font-medium text-foreground pl-5">{value || '-'}</p>
    </div>
  );
}
