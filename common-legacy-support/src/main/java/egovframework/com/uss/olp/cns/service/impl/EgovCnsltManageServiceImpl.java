package egovframework.com.uss.olp.cns.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.consult.CnsltManage;
import com.company.project.domain.consult.CnsltManageRepository;

import egovframework.com.uss.olp.cns.service.CnsltManageDefaultVO;
import egovframework.com.uss.olp.cns.service.CnsltManageVO;
import egovframework.com.uss.olp.cns.service.EgovCnsltManageService;
import jakarta.annotation.Resource;

@Service("CnsltManageService")
public class EgovCnsltManageServiceImpl extends EgovAbstractServiceImpl implements EgovCnsltManageService {

	@Resource(name = "cnsltManageRepository")
	private CnsltManageRepository cnsltManageRepository;

	@Resource(name = "egovCnsltManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public CnsltManageVO selectCnsltListDetail(CnsltManageVO vo) throws Exception {
		return cnsltManageRepository.findById(vo.getCnsltId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void updateCnsltInqireCo(CnsltManageVO vo) throws Exception {
		cnsltManageRepository.findById(vo.getCnsltId()).ifPresent(entity -> {
			entity.incrementInqireCo();
			cnsltManageRepository.save(entity);
		});
	}

	@Override
	public List<EgovMap> selectCnsltList(CnsltManageDefaultVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "cnsltSj")); // Using cnsltSj as per XML sort, or createdDate? XML says
															// ORDER BY CNSLT_SJ DESC
		Page<CnsltManage> page = cnsltManageRepository.findAll(pageable);
		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public int selectCnsltListTotCnt(CnsltManageDefaultVO searchVO) {
		return (int) cnsltManageRepository.count();
	}

	@Override
	public void insertCnsltDtls(CnsltManageVO vo) throws Exception {
		String cnsltId = idgenService.getNextStringId();
		vo.setCnsltId(cnsltId);

		CnsltManage entity = CnsltManage.builder()
				.cnsltId(cnsltId)
				.cnsltSj(vo.getCnsltSj())
				.cnsltCn(vo.getCnsltCn())
				.othbcAt(vo.getOthbcAt())
				.writngPassword(vo.getWritngPassword())
				.areaNo(vo.getAreaNo())
				.middleTelno(vo.getMiddleTelno())
				.endTelno(vo.getEndTelno())
				.firstMoblphonNo(vo.getFirstMoblphonNo())
				.middleMbtlnum(vo.getMiddleMbtlnum())
				.endMbtlnum(vo.getEndMbtlnum())
				.emailAdres(vo.getEmailAdres())
				.emailAnswerAt(vo.getEmailAnswerAt())
				.wrterNm(vo.getWrterNm())
				.atchFileId(vo.getAtchFileId())
				.frstRegisterId(vo.getFrstRegisterId())
				.build();

		cnsltManageRepository.save(entity);
	}

	@Override
	public int selectCnsltPasswordConfirmCnt(CnsltManageVO vo) {
		// Simple check finding by ID and password match
		return cnsltManageRepository.findById(vo.getCnsltId())
				.map(entity -> entity.getWritngPassword().equals(vo.getWritngPassword()) ? 1 : 0)
				.orElse(0);
	}

	@Override
	public void updateCnsltDtls(CnsltManageVO vo) throws Exception {
		cnsltManageRepository.findById(vo.getCnsltId()).ifPresent(entity -> {
			entity.update(
					vo.getCnsltSj(),
					vo.getCnsltCn(),
					vo.getOthbcAt(),
					vo.getWritngPassword(),
					vo.getAreaNo(),
					vo.getMiddleTelno(),
					vo.getEndTelno(),
					vo.getFirstMoblphonNo(),
					vo.getMiddleMbtlnum(),
					vo.getEndMbtlnum(),
					vo.getEmailAdres(),
					vo.getEmailAnswerAt(),
					vo.getWrterNm(),
					vo.getAtchFileId(),
					vo.getLastUpdusrId());
			cnsltManageRepository.save(entity);
		});
	}

	@Override
	public void deleteCnsltDtls(CnsltManageVO vo) throws Exception {
		cnsltManageRepository.deleteById(vo.getCnsltId());
	}

	@Override
	public CnsltManageVO selectCnsltAnswerListDetail(CnsltManageVO vo) throws Exception {
		return selectCnsltListDetail(vo); // Reuse as structure is same
	}

	@Override
	public List<EgovMap> selectCnsltAnswerList(CnsltManageDefaultVO searchVO) throws Exception {
		return selectCnsltList(searchVO); // Reuse as structure is same
	}

	@Override
	public int selectCnsltAnswerListTotCnt(CnsltManageDefaultVO searchVO) {
		return selectCnsltListTotCnt(searchVO);
	}

	@Override
	public void updateCnsltDtlsAnswer(CnsltManageVO vo) throws Exception {
		cnsltManageRepository.findById(vo.getCnsltId()).ifPresent(entity -> {
			entity.updateAnswer(
					vo.getQnaProcessSttusCode(),
					vo.getManagtCn(),
					vo.getLastUpdusrId());
			cnsltManageRepository.save(entity);
		});
	}

	private CnsltManageVO toVO(CnsltManage entity) {
		CnsltManageVO vo = new CnsltManageVO();
		vo.setCnsltId(entity.getCnsltId());
		vo.setCnsltSj(entity.getCnsltSj());
		vo.setCnsltCn(entity.getCnsltCn());
		vo.setOthbcAt(entity.getOthbcAt());
		vo.setWritngPassword(entity.getWritngPassword());
		vo.setAreaNo(entity.getAreaNo());
		vo.setMiddleTelno(entity.getMiddleTelno());
		vo.setEndTelno(entity.getEndTelno());
		vo.setFirstMoblphonNo(entity.getFirstMoblphonNo());
		vo.setMiddleMbtlnum(entity.getMiddleMbtlnum());
		vo.setEndMbtlnum(entity.getEndMbtlnum());
		vo.setEmailAdres(entity.getEmailAdres());
		vo.setEmailAnswerAt(entity.getEmailAnswerAt());
		vo.setWrterNm(entity.getWrterNm());
		vo.setWritngDe(entity.getWritngDe() != null ? entity.getWritngDe()
				: (entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().toString() : ""));
		vo.setInqireCo(entity.getInqireCo() != null ? String.valueOf(entity.getInqireCo()) : "0");
		vo.setQnaProcessSttusCode(entity.getQnaProcessSttusCode());
		vo.setAtchFileId(entity.getAtchFileId());
		vo.setManagtCn(entity.getManagtCn());
		vo.setManagtDe(entity.getManagtDe());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null)
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		if (entity.getLastUpdusrPnttm() != null)
			vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm().toString());
		return vo;
	}

	private EgovMap toEgovMap(CnsltManage entity) {
		EgovMap map = new EgovMap();
		map.put("cnsltId", entity.getCnsltId());
		map.put("cnsltSj", entity.getCnsltSj());
		map.put("cnsltCn", entity.getCnsltCn());
		map.put("othbcAt", entity.getOthbcAt());
		map.put("wrterNm", entity.getWrterNm());
		map.put("writngDe", entity.getWritngDe() != null ? entity.getWritngDe()
				: (entity.getFrstRegisterPnttm() != null ? entity.getFrstRegisterPnttm().toString() : ""));
		map.put("inqireCo", entity.getInqireCo());
		map.put("qnaProcessSttusCode", entity.getQnaProcessSttusCode());
		map.put("managtCn", entity.getManagtCn());
		map.put("frstRegisterPnttm", entity.getFrstRegisterPnttm());
		return map;
	}
}
