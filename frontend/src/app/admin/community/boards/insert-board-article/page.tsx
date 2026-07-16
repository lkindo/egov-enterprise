import React from 'react';
import { BoardRegistClient } from './BoardRegistClient';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InsertBoardArticlePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const bbsId = (params.bbsId as string) || 'BBSMSTR_AAAAAAAAAAAA';
  const pstId = (params.pstId as string) || undefined;
  const parntsId = (params.parnts as string) || (params.parntsId as string) || undefined;

  let initialData = null;
  if (pstId) {
    try {
      initialData = await knowledgeService.getArticle(bbsId, pstId);
    } catch (error) {
      console.error('Failed to fetch initial article data:', error);
    }
  }

  return (
    <BoardRegistClient 
      initialData={initialData} 
      bbsId={bbsId} 
      pstId={pstId} 
      parnts={parntsId} 
    />
  );
}
