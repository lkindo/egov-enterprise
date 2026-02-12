package egovframework.com.cop.ems.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.company.project.service.mail.EgovMailService;
import com.company.project.service.mail.dto.SentMailDto;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.cmm.service.FileVO;
import egovframework.com.cop.ems.service.EgovSndngMailDetailService;
import egovframework.com.cop.ems.service.EgovSndngMailDtlsService;
import egovframework.com.cop.ems.service.SndngMailVO;
import egovframework.com.utl.fcc.service.EgovStringUtil;
import lombok.RequiredArgsConstructor;

/**
 * 발송메일 내역을 조회하는 비즈니스 구현 클래스
 */
@Service("sndngMailDtlsService")
@RequiredArgsConstructor
public class EgovSndngMailDtlsServiceImpl extends EgovAbstractServiceImpl implements EgovSndngMailDtlsService {

	private final EgovMailService mailService;
	private final EgovSndngMailDetailService sndngMailDetailService;

	@Override
	public List<SndngMailVO> selectSndngMailList(ComDefaultVO vo) throws Exception {
		Pageable pageable = PageRequest.of(vo.getPageIndex() - 1, vo.getPageSize());
		Page<SentMailDto> page = mailService.getSentMailList(vo.getSearchCondition(), vo.getSearchKeyword(), pageable);
		return EgovEmailAdapter.toVOList(page);
	}

	@Override
	public int selectSndngMailListTotCnt(ComDefaultVO vo) throws Exception {
		Pageable pageable = PageRequest.of(vo.getPageIndex() - 1, vo.getPageSize());
		Page<SentMailDto> page = mailService.getSentMailList(vo.getSearchCondition(), vo.getSearchKeyword(), pageable);
		return (int) page.getTotalElements();
	}

	@Override
	public void deleteSndngMailList(SndngMailVO vo) throws Exception {
		String[] sbuf = EgovStringUtil.split(vo.getMssageId(), ",");
		for (String element : sbuf) {
			mailService.deleteMail(element);
		}

		if (vo.getAtchFileIdList() != null) {
			String[] fbuf = EgovStringUtil.split(vo.getAtchFileIdList(), ",");
			for (String element : fbuf) {
				SndngMailVO atchVO = new SndngMailVO();
				atchVO.setAtchFileId(element);
				sndngMailDetailService.deleteAtchmnFile(atchVO);
			}
		}
	}
}
