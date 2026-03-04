package com.company.project.service.survey;

import com.company.project.domain.survey.Counsel;
import com.company.project.domain.survey.CounselRepository;
import com.company.project.service.survey.dto.CounselDto;
import lombok.RequiredArgsConstructor;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CounselService implements EgovCounselService {

    private final CounselRepository counselRepository;

    @Override
    @Transactional
    public void registerCounsel(CounselDto dto) {
        Counsel counsel = Counsel.builder()
                .counselId(dto.getCounselId())
                .counselSubject(dto.getCounselSubject())
                .counselContent(dto.getCounselContent())
                .openAt(dto.getOpenAt())
                .writeDate(dto.getWriteDate())
                .writerId(dto.getWriterId())
                .writerNm(dto.getWriterNm())
                .status("1") // ?묒닔
                .frstRegisterId(dto.getWriterId())
                .lastUpdusrId(dto.getWriterId())
                .build();
        counselRepository.save(Objects.requireNonNull(counsel));
    }

    @Override
    @Transactional
    public void updateCounsel(CounselDto dto) {
        counselRepository.findById(Objects.requireNonNull(dto.getCounselId()))
                .ifPresent(c -> {
                    // ?꾨뱶 ??룞 ??뜲??듃 濡쒖???왂 (Update 硫붿???뺤옣 媛??
                });
    }

    @Override
    @Transactional
    public void deleteCounsel(String counselId) {
        counselRepository.deleteById(Objects.requireNonNull(counselId));
    }

    @Override
    @Transactional
    public void answerCounsel(CounselDto dto) {
        counselRepository.findById(Objects.requireNonNull(dto.getCounselId()))
                .ifPresent(c -> c.updateAnswer(
                        dto.getManagerContent(),
                        dto.getManagerDate(),
                        "2", // ????꾨즺
                        dto.getWriterId() // ??ъ옄 ID ?꾩슂
                ));
    }

    @Override
    public CounselDto getCounsel(String counselId) {
        return counselRepository.findById(Objects.requireNonNull(counselId))
                .map(c -> CounselDto.builder()
                        .counselId(c.getCounselId())
                        .counselSubject(c.getCounselSubject())
                        .counselContent(c.getCounselContent())
                        .writerNm(c.getWriterNm())
                        .status(c.getStatus())
                        .managerContent(c.getManagerContent())
                        .build())
                .orElse(null);
    }

    @Override
    public Page<CounselDto> getCounselList(String searchKeyword, Pageable pageable) {
        Objects.requireNonNull(pageable);
        return counselRepository.findAll(pageable)
                .map(c -> CounselDto.builder()
                        .counselId(c.getCounselId())
                        .counselSubject(c.getCounselSubject())
                        .writerNm(c.getWriterNm())
                        .writeDate(c.getWriteDate())
                        .status(c.getStatus())
                        .build());
    }
}
