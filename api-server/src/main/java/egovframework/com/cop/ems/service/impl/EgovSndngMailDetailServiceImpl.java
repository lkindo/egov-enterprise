package egovframework.com.cop.ems.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import com.company.project.service.mail.EgovMailService;
import com.company.project.service.mail.dto.SentMailDto;

import egovframework.com.cmm.service.EgovFileMngService;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cop.ems.service.EgovSndngMailDetailService;
import egovframework.com.cop.ems.service.SndngMailVO;
import lombok.RequiredArgsConstructor;

/**
 * 발송메일을 상세 조회하는 비즈니스 구현 클래스
 */
@Service("sndngMailDetailService")
@RequiredArgsConstructor
public class EgovSndngMailDetailServiceImpl extends EgovAbstractServiceImpl implements EgovSndngMailDetailService {

	private final EgovMailService mailService;
	private final EgovFileMngService egovFileMngService;

	@Override
	public SndngMailVO selectSndngMail(SndngMailVO vo) throws Exception {
		SentMailDto dto = mailService.getSentMail(vo.getMssageId());
		return EgovEmailAdapter.toVO(dto);
	}

	@Override
	public void deleteSndngMail(SndngMailVO vo) throws Exception {
		mailService.deleteMail(vo.getMssageId());
	}

	@Override
	public void deleteAtchmnFile(SndngMailVO vo) throws Exception {
		FileVO fileVO = new FileVO();
		fileVO.setAtchFileId(vo.getAtchFileId());
		egovFileMngService.deleteAllFileInf(fileVO);
	}
}
