'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { VirtualScrollList } from '@/app/components/ui/virtual-scroll-list';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { addressbookUserService } from '@/services/user/addressbook/AddressbookUserService';
import { NameCard } from '@/types/addressbook';
import { useToast } from '@/app/components/ui/toast';
import { Contact, Phone, Mail, Building2, User, Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AddressBookPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<NameCard[]>([]);

  // 상세 모달 상태
  const [selectedContact, setSelectedContact] = useState<NameCard | null>(null);
  const [isModalOpen, setIsOpen] = useState(false);

  const loadContacts = useCallback(async (keyword?: string) => {
    try {
      setLoading(true);
      // 실무 데이터가 많다고 가정하고 대량의 목업 데이터 생성 (실제 API 응답으로 대체 가능)
      const res = (await addressbookUserService.searchUsers(keyword || '')) as any;
      if (res?.success) {
        setContacts(res.data);
      }
    } catch (error) {
      toast('주소록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const renderContactItem = (item: NameCard) => (
    <div
      className="flex items-center gap-4 px-6 py-4 border-b hover:bg-accent/30 transition-colors group cursor-pointer"
      onClick={() => {
        setSelectedContact(item);
        setIsOpen(true);
      }}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">
        {item.ncrdNm.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground text-sm">{item.ncrdNm}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-medium uppercase">
            {item.deptNm}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.cmpnyNm}</p>
      </div>
      <div className="hidden md:flex flex-col items-end gap-1 text-[11px] text-muted-foreground font-medium">
        <div className="flex items-center gap-1.5"><Phone size={12} /> {item.mbtlNum}</div>
        <div className="flex items-center gap-1.5"><Mail size={12} /> {item.emailAdres}</div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader
        title="통합 주소록"
        breadcrumbs={[{ label: '협업지원' }, { label: '주소록' }]}
      />

      <StandardSearchFilter
        fields={[
          { name: 'keyword', label: '사용자 검색', type: 'text', placeholder: '이름, 부서, 회사명...' }
        ]}
        onSearch={(v) => loadContacts(v.keyword)}
        className="mb-0"
      />

      <div className="flex-1 bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Contact size={14} /> 연락처 목록
          </h3>
          <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded">
            {contacts.length} 명
          </span>
        </div>

        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="p-12 text-center animate-pulse text-muted-foreground font-medium">
              연락처를 검색하고 있습니다...
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic">
              검색된 연락처가 없습니다.
            </div>
          ) : (
            <VirtualScrollList
              items={contacts}
              itemHeight={72}
              containerHeight={550}
              renderItem={renderContactItem}
              className="border-none rounded-none"
            />
          )}
        </div>
      </div>

      {/* 명함 상세 모달 */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title="상세 연락처 정보"
        maxWidth="sm"
      >
        {selectedContact && (
          <div className="space-y-8 py-4 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-white text-3xl font-black shadow-lg shadow-primary/20">
              {selectedContact.ncrdNm.charAt(0)}
            </div>

            <div>
              <h3 className="text-2xl font-black text-foreground">{selectedContact.ncrdNm}</h3>
              <p className="text-sm font-bold text-primary mt-1">{selectedContact.deptNm} / {selectedContact.cmpnyNm}</p>
            </div>

            <div className="grid gap-3 pt-4 text-left border-t">
              <DetailRow icon={<Phone size={16} />} label="휴대전화" value={selectedContact.mbtlNum} />
              <DetailRow icon={<Building2 size={16} />} label="사무실 번호" value={selectedContact.telNo} />
              <DetailRow icon={<Mail size={16} />} label="이메일" value={selectedContact.emailAdres} />
              <DetailRow icon={<MapPin size={16} />} label="위치" value="본사 4층 스마트오피스" />
            </div>

            <div className="pt-6 flex gap-2">
              <button className="flex-1 py-3 bg-muted hover:bg-accent rounded-xl text-sm font-bold transition-all">쪽지 보내기</button>
              <button className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md transition-all">메일 작성</button>
            </div>
          </div>
        )}
      </StandardModal>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-xl transition-colors">
      <div className="p-2 bg-muted rounded-lg text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}