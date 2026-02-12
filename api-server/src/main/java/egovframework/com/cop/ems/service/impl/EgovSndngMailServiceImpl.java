package egovframework.com.cop.ems.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.company.project.service.mail.EgovMailService;

import egovframework.com.cop.ems.service.EgovSndngMailService;
import egovframework.com.cop.ems.service.SndngMailVO;
import lombok.RequiredArgsConstructor;

/**
 * 메일 솔루션과 연동해서 이용해서 메일을 보내는 서비스 구현 클래스
 * Modernized to delegate to EgovMailService
 */
@Service("egovSndngMailService")
@RequiredArgsConstructor
public class EgovSndngMailServiceImpl extends EgovAbstractServiceImpl implements EgovSndngMailService {

	private final EgovMailService mailService;

	@Override
	public boolean sndngMail(SndngMailVO sndngMailVO) throws Exception {
		mailService.sendMail("SYSTEM", EgovEmailAdapter.toDto(sndngMailVO));
		return true;
	}
}
