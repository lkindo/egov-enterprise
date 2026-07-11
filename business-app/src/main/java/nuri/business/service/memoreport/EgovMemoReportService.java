package nuri.business.service.memoreport;

import nuri.business.service.memoreport.dto.MemoReportDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 메모보고 서비스 인터페이스
 */
public interface EgovMemoReportService {

    Page<MemoReportDto> getMemoReportList(String keyword, Pageable pageable);

    Page<MemoReportDto> getMyReportList(String writerId, Pageable pageable);

    Page<MemoReportDto> getReceivedReportList(String rptUserId, Pageable pageable);

    MemoReportDto getMemoReport(String rptId);

    String createMemoReport(String userId, MemoReportDto dto);

    void updateMemoReport(String rptId, String userId, MemoReportDto dto);

    void deleteMemoReport(String rptId);

    void readMemoReport(String rptId);

    void updateDrctMatter(String rptId, String instrCn);
}
