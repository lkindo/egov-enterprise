package nuri.business.service.file;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.file.FileDetail;
import nuri.business.domain.file.FileDetailRepository;
import nuri.business.service.file.dto.AttachmentIntegrityReport;
import nuri.foundation.core.storage.FileStorageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 첨부 정합성 점검 — DB 레코드와 저장소 실물이 어긋났는지 센다.
 *
 * <p>[왜 필요한가 — 2026-08-26]
 * DB 와 파일 저장소를 분리 운영하는 것은 정상이다. 문제는 <b>어긋났을 때 그것을 알 방법이 없다</b>는
 * 점이었다 — 실제로 이번에는 사용자가 화면의 깨진 배너로 발견했다. 분리를 안전하게 만드는 것은
 * "어긋나지 않게" 가 아니라 <b>"어긋나면 드러나게"</b> 다.
 *
 * <p>드리프트는 정상 운영에서도 생긴다: 저장소 경로 설정 변경, 다른 환경의 DB 를 붙임, 백업 복원
 * 시점 불일치, 스토리지 마이그레이션 중단. 그래서 <b>사후 탐지 수단</b>이 있어야 한다.
 *
 * <p>⚠ 읽기 전용이다. 어긋난 레코드를 <b>자동으로 지우지 않는다</b> — 실물이 없는 이유가 "유실"일
 * 수도 "저장소 설정이 잠깐 틀렸다"일 수도 있는데, 후자에서 레코드를 지우면 복구 가능한 상황을
 * 복구 불가능하게 만든다. 판단은 사람이 한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttachmentIntegrityService {

    /**
     * 한 번에 확인할 레코드 수.
     *
     * <p>전량을 메모리에 올리지 않는다 — 첨부는 수만 건이 될 수 있고, 점검이 서비스 메모리를
     * 압박하면 점검 때문에 장애가 난다.
     */
    private static final int SCAN_PAGE_SIZE = 500;

    /** 보고에 담을 예시 최대 건수. 전체 규모는 개수로, 조치 대상은 예시로 본다. */
    private static final int SAMPLE_LIMIT = 50;

    private final FileDetailRepository fileDetailRepository;
    private final FileStorageService fileStorageService;

    /**
     * 전체 첨부 레코드를 훑어 저장소에 실물이 없는 것을 센다.
     *
     * @return 점검 결과. 어긋난 건수와 조치 대상 예시를 담는다.
     */
    public AttachmentIntegrityReport scan() {
        long checked = 0;
        long missing = 0;
        List<String> samples = new ArrayList<>();

        int pageNumber = 0;
        Page<FileDetail> page;
        do {
            page = fileDetailRepository.findAll(PageRequest.of(pageNumber, SCAN_PAGE_SIZE));
            for (FileDetail detail : page.getContent()) {
                checked++;
                if (isMissing(detail)) {
                    missing++;
                    if (samples.size() < SAMPLE_LIMIT) {
                        samples.add(describe(detail));
                    }
                }
            }
            pageNumber++;
        } while (page.hasNext());

        if (missing > 0) {
            log.error(">>> STORAGE DRIFT: 첨부 {}건 중 {}건이 저장소에 실물이 없습니다."
                    + " 저장소 설정이 바뀌었거나 파일이 유실됐습니다.", checked, missing);
        } else {
            log.info(">>> 첨부 정합성 점검: {}건 모두 저장소에 실물이 있습니다.", checked);
        }

        return new AttachmentIntegrityReport(checked, missing, samples);
    }

    private boolean isMissing(FileDetail detail) {
        String storedName = detail.getStrgFileNm();
        if (storedName == null || storedName.isBlank()) {
            // 저장 파일명이 없으면 애초에 실물을 찾을 수 없다 — 드리프트로 센다.
            return true;
        }
        String path = detail.getFileStrgPath() == null ? "" : detail.getFileStrgPath();
        return !fileStorageService.exists(storedName, path);
    }

    /**
     * 조치 대상 식별자만 남긴다.
     *
     * <p>⚠ 원본 파일명은 넣지 않는다 — 사용자 입력이고, 진단 목적에는 저장 경로만으로 충분하다.
     */
    private String describe(FileDetail detail) {
        Long masterSn = detail.getFileMaster() == null ? null : detail.getFileMaster().getAtchFileSn();
        return "atchFileSn=" + masterSn
                + " seq=" + detail.getAtchFileSeq()
                + " path=" + detail.getFileStrgPath()
                + "/" + detail.getStrgFileNm();
    }
}
