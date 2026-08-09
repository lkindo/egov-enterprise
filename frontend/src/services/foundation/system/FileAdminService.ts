import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';


/**
 * 파일 관리 서비스 (Admin)
 */
class FileAdminService extends AdminService {
  constructor() {
    super('/files', 'system');
  }

 /*
  * 목록 조회(getFiles)·삭제(deleteFile) 메서드는 두지 않는다 (2026-08-05 제거).
  *
  * 둘 다 백엔드에 대응 매핑이 없었다 — `FileApiController` 는 POST 1 + GET 2
  * (`/{atchFileId}`, `/{atchFileId}/{fileSn}`) 가 전부라 `GET /admin/system/files` 는 404,
  * `DELETE /admin/system/files/{id}/{sn}` 은 405 였다. 앱 호출부도 각각 0개소였다.
  *
  * `getFiles` 는 특히 위험했다 — 목 기반 단위 테스트가 "calls correct endpoints" 라며
  * **존재하지 않는 경로를 올바른 것으로 단언**하고 있었다(false-green).
  *
  * 관리자용 파일 목록/삭제가 필요하면 **백엔드 엔드포인트를 인가와 함께 먼저 만들 것.**
  * FE 메서드만 되살리는 것은 계약을 만드는 것이 아니라 계약이 있다는 착시를 만드는 것이다.
  */

 /**
 * 파일 업로드
 * @param files 업로드할 파일 리스트
 * @returns atchFileId
 */
 async uploadFiles(files: File[], config?: AxiosRequestConfig): Promise<string> {
 const formData = new FormData();
 files.forEach(file => formData.append('files', file));

 return this.post<string>('', formData, {
 ...config,
 headers: { 
 ...config?.headers,
 'Content-Type': 'multipart/form-data' 
 }
 });
 }
}

export const fileAdminService = new FileAdminService();
