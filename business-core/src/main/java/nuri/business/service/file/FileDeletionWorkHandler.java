package nuri.business.service.file;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.file.FileDetailRepository;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import nuri.foundation.core.storage.FileStorageService;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class FileDeletionWorkHandler implements DurableWorkHandler {
    static final String TYPE = "FILE_DELETE";
    private final FileStorageService storage;
    private final FileDetailRepository details;
    private final ObjectMapper mapper;

    @Override
    public String type() {
        return TYPE;
    }

    @Override
    public void execute(DurableWork work) {
        FileDeletionIntent intent = mapper.readValue(work.payload(), FileDeletionIntent.class);
        if (details.existsByFileStrgPathAndStrgFileNm(intent.targetPath(), intent.filename())) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE);
        }
        storage.deleteCaptured(work.key(), intent.filename(), intent.targetPath(), intent.identity());
    }
}
