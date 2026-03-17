'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { AdministrationWord } from '@/types/help';
import { PageResponse } from '@/types/system';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AdministrationWordClientProps {
  initialData: PageResponse<AdministrationWord>;
}

export default function AdministrationWordClient({ initialData }: AdministrationWordClientProps) {
  const [data, setData] = useState(initialData);
  const [keyword, setKeyword] = useState('');


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="행정전문용어사전"
        breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }, { label: '행정전문용어사전' }]}
      />


      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="용어명 또는 설명 검색..."
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
            className="max-w-[300px]"
          />

          <Button variant="secondary" size="sm">
            <Search className="mr-2 h-4 w-4" />
            검색
          </Button>
        </div>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          신규 등록
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>용어명</TableHead>
                <TableHead>영문명</TableHead>
                <TableHead>주제영역</TableHead>
                <TableHead>정의</TableHead>
                <TableHead className="text-right">등록일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.content && data.content.length > 0 ? (
                data.content?.map((word) => (
                  <TableRow key={word.administWordId} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{word.administWordNm}</TableCell>
                    <TableCell>{word.administWordEngNm || '-'}</TableCell>
                    <TableCell>{word.themaRelm || '-'}</TableCell>
                    <TableCell className="max-w-[400px] truncate">
                      {word.administWordDf || word.administWordDc}
                    </TableCell>
                    <TableCell className="text-right">
                      {word.createdDate ? new Date(word.createdDate).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    등록된 용어 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Pagination component would go here */}
    </div>
  );
}
