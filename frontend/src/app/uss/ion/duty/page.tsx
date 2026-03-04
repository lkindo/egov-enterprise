'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSummaryCard } from '@/app/components/ui/standard-summary-card';
import { UserPicker } from '@/app/components/ui/user-picker';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardDatePicker } from '@/app/components/ui/standard-date-picker';
import { FormField } from '@/app/components/ui/standard-form';
import { dutyUserService, Duty } from '@/services/user/duty/DutyUserService';
import { useToast } from '@/app/components/ui/toast';
import { Calendar, UserPlus, Clock, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function DutyPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [duties, setDuties] = useState<Duty[]>([]);

  // 모달 및 피커 상태
  const [isModalOpen, setIsOpen] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await dutyUserService.getDuties({})) as any;
      if (res?.success) setDuties(res.data || []);
    } catch (error) {
      toast('당직 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!selectedUser || !selectedDate) {
      toast('날짜와 당직자를 선택해 주세요.', 'error');
      return;
    }

    try {
      await dutyUserService.saveDuty({
        dutyDe: format(selectedDate, 'yyyyMMdd'),
        dutyUserId: selectedUser.ncrdId,
        dutyUserNm: selectedUser.ncrdNm
      });
      toast('당직 편성이 완료되었습니다.', 'success');
      setIsOpen(false);
      loadData();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (item: Duty) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = (await dutyUserService.deleteDuty(item.dutyId)) as any;
      if (res?.success) {
        toast('당직 정보가 삭제되었습니다.', 'success');
        loadData();
      }
    } catch (error) {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    {
      header: '당직일자',
      accessor: (item: Duty) => item.dutyDe,
      className: 'font-mono font-bold'
    },
    {
      header: '당직자',
      accessor: (item: Duty) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
            {item.dutyUserNm.charAt(0)}
          </div>
          <span className="font-bold">{item.dutyUserNm}</span>
        </div>
      )
    },
    {
      header: '직위',
      accessor: (item: Duty) => item.postNm,
      className: 'text-xs text-muted-foreground'
    },
    {
      header: '연락처',
      accessor: (item: Duty) => item.telNo,
      className: 'text-xs'
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: Duty) => (
        <button
          onClick={() => handleDelete(item)}
          className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-all"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="당직 및 비상 대기 관리"
        breadcrumbs={[{ label: '부가서비스' }, { label: '당직관리' }]}
        actions={
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} /> 당직 편성
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StandardSummaryCard title="이번 달 당직" value={duties.length} unit="건" icon={<Calendar size={20} />} variant="blue" />
        <StandardSummaryCard title="오늘의 당직자" value={duties[0]?.dutyUserNm || '미지정'} icon={<ShieldAlert size={20} />} variant="orange" />
        <StandardSummaryCard title="비상 연락망" value="활성화" icon={<Clock size={20} />} variant="green" />
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable
          columns={columns}
          data={duties}
          loading={loading}
          emptyMessage="편성된 당직 내역이 없습니다."
          className="border-none rounded-none"
        />
      </div>

      {/* 편성 모달 */}
      <StandardModal isOpen={isModalOpen} onClose={() => setIsOpen(false)} title="신규 당직 편성">
        <div className="space-y-6">
          <FormField label="당직 일자" required>
            <StandardDatePicker date={selectedDate} onDateChange={setSelectedDate} />
          </FormField>
          <FormField label="당직자 선택" required>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedUser ? `${selectedUser.ncrdNm} (${selectedUser.ncrdId})` : ''}
                placeholder="사용자를 검색하세요."
                readOnly
                className="flex-1 h-10 px-3 rounded-md border bg-muted/20 text-sm outline-none"
              />
              <button
                onClick={() => setPickerOpen(true)}
                className="px-4 border border-primary text-primary rounded-md font-bold text-xs hover:bg-primary/5 transition-all"
              >
                검색
              </button>
            </div>
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <button onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-lg font-bold">취소</button>
            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">편성 완료</button>
          </div>
        </div>
      </StandardModal>

      <UserPicker isOpen={isPickerOpen} onClose={() => setPickerOpen(false)} onSelect={setSelectedUser} />
    </div>
  );
}