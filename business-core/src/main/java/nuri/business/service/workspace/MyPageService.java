package nuri.business.service.workspace;

import nuri.business.domain.mypage.MyPageContent;
import nuri.business.repository.workspace.MyPageContentRepository;
import nuri.business.service.workspace.dto.MyPageContentDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MyPageService {

    private final MyPageContentRepository myPageContentRepository;

    public List<MyPageContentDto> getActiveMyPageContents() {
        return myPageContentRepository.findByCntntsUseYn("Y").stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public List<MyPageContentDto> getAllMyPageContents() {
        return myPageContentRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public String createContent(MyPageContentDto dto) {
        MyPageContent entity = MyPageContent.builder()
                .cntntsId(dto.getCntntsId())
                .cntntsNm(dto.getCntntsNm())
                .cntcUrl(dto.getCntcUrl())
                .cntntsUseYn(dto.getCntntsUseAt())
                .cntntsLinkUrl(dto.getCntntsLinkUrl())
                .cntntsDc(dto.getCntntsDc())
                .build();
        return myPageContentRepository.save(entity).getCntntsId();
    }

    @Transactional
    public void updateContent(String id, MyPageContentDto dto) {
        MyPageContent entity = myPageContentRepository.findById(id)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "마이페이지 콘텐츠를 찾을 수 없습니다: " + id));
        entity.update(dto.getCntntsNm(), dto.getCntcUrl(), dto.getCntntsUseAt(), dto.getCntntsLinkUrl(), dto.getCntntsDc());
    }

    @Transactional
    public void deleteContent(String id) {
        myPageContentRepository.deleteById(id);
    }

    private MyPageContentDto convertToDto(MyPageContent entity) {
        return MyPageContentDto.builder()
                .cntntsId(entity.getCntntsId())
                .cntntsNm(entity.getCntntsNm())
                .cntcUrl(entity.getCntcUrl())
                .cntntsUseAt(entity.getCntntsUseYn())
                .cntntsLinkUrl(entity.getCntntsLinkUrl())
                .cntntsDc(entity.getCntntsDc())
                .build();
    }
}
