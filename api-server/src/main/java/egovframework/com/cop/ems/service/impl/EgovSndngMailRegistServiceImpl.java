package egovframework.com.cop.ems.service.impl;

import com.company.project.service.mail.EgovMailService;
import egovframework.com.cop.ems.service.EgovSndngMailRegistService;
import egovframework.com.cop.ems.service.SndngMailVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service("sndngMailRegistService")
@RequiredArgsConstructor
public class EgovSndngMailRegistServiceImpl implements EgovSndngMailRegistService {

    private final EgovMailService mailService;

    @Override
    public boolean insertSndngMail(SndngMailVO vo) throws Exception {
        mailService.sendMail("SYSTEM", EgovEmailAdapter.toDto(vo));
        return true;
    }

    @Override
    public boolean trnsmitXmlData(SndngMailVO sndngMailVO) throws Exception {
        // Legacy XML logic not needed for modern JPA implementation
        return true;
    }

    @Override
    public boolean recptnXmlData(String xml) throws Exception {
        // Legacy XML logic not needed for modern JPA implementation
        return true;
    }
}
