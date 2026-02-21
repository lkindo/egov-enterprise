package egovframework.com.cop.ems.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.company.project.service.mail.EgovMailService;

import egovframework.com.cop.ems.service.EgovSndngMailService;
import egovframework.com.cop.ems.service.SndngMailVO;
import lombok.RequiredArgsConstructor;

/**
 * ????? ??? ???? ??????????? ?????
 * Modernized to delegate to EgovMailService
 **/
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
