package egovframework.com.uss.ion.ctn.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.ctsnn.CtsnnManage;
import com.company.project.domain.ctsnn.CtsnnManageRepository;

import egovframework.com.uss.ion.ctn.service.CtsnnManageVO;
import egovframework.com.uss.ion.ctn.service.EgovCtsnnManageService;
import jakarta.annotation.Resource;

@Service("egovCtsnnManageService")
public class EgovCtsnnManageServiceImpl extends EgovAbstractServiceImpl implements EgovCtsnnManageService {

	@Resource(name = "ctsnnCtsnnManageRepository")
	private CtsnnManageRepository ctsnnManageRepository;

	@Resource(name = "egovCtsnnManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<CtsnnManageVO> selectCtsnnManageList(CtsnnManageVO ctsnnManageVO) throws Exception {
		Pageable pageable = PageRequest.of(ctsnnManageVO.getPageIndex() - 1, ctsnnManageVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<CtsnnManage> page = ctsnnManageRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectCtsnnManageListTotCnt(CtsnnManageVO ctsnnManageVO) throws Exception {
		return (int) ctsnnManageRepository.count();
	}

	@Override
	public CtsnnManageVO selectCtsnnManage(CtsnnManageVO ctsnnManageVO) throws Exception {
		return ctsnnManageRepository.findById(ctsnnManageVO.getCtsnnId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertCtsnnManage(egovframework.com.uss.ion.ctn.service.CtsnnManage ctsnnManage) throws Exception {
		String id = idgenService.getNextStringId();

		CtsnnManage entity = CtsnnManage.builder()
				.ctsnnId(id)
				.usid(ctsnnManage.getUsid())
				.ctsnnCd(ctsnnManage.getCtsnnCd())
				.reqstDe(ctsnnManage.getReqstDe())
				.ctsnnNm(ctsnnManage.getCtsnnNm())
				.trgterNm(ctsnnManage.getTrgterNm())
				.brth(ctsnnManage.getBrth())
				.occrrDe(ctsnnManage.getOccrrDe())
				.relate(ctsnnManage.getRelate())
				.remark(ctsnnManage.getRemark())
				.sanctnerId(ctsnnManage.getSanctnerId())
				.confmAt(ctsnnManage.getConfmAt())
				.infrmlSanctnId(ctsnnManage.getInfrmlSanctnId())
				.build();

		ctsnnManageRepository.save(entity);
	}

	@Override
	public void updtCtsnnManage(egovframework.com.uss.ion.ctn.service.CtsnnManage ctsnnManage) throws Exception {
		ctsnnManageRepository.findById(ctsnnManage.getCtsnnId()).ifPresent(entity -> {
			entity.update(
					ctsnnManage.getCtsnnCd(),
					ctsnnManage.getCtsnnNm(),
					ctsnnManage.getReqstDe(),
					ctsnnManage.getTrgterNm(),
					ctsnnManage.getBrth(),
					ctsnnManage.getOccrrDe(),
					ctsnnManage.getRelate(),
					ctsnnManage.getRemark());
			ctsnnManageRepository.save(entity);
		});
	}

	@Override
	public void deleteCtsnnManage(egovframework.com.uss.ion.ctn.service.CtsnnManage ctsnnManage) throws Exception {
		ctsnnManageRepository.deleteById(ctsnnManage.getCtsnnId());
	}

	@Override
	public List<CtsnnManageVO> selectCtsnnManageConfmList(CtsnnManageVO ctsnnManageVO) throws Exception {
		return ctsnnManageRepository.findAll().stream()
				.filter(e -> ctsnnManageVO.getSanctnerId().equals(e.getSanctnerId()))
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public int selectCtsnnManageConfmListTotCnt(CtsnnManageVO ctsnnManageVO) throws Exception {
		return (int) selectCtsnnManageConfmList(ctsnnManageVO).size();
	}

	@Override
	public void updtCtsnnManageConfm(egovframework.com.uss.ion.ctn.service.CtsnnManage ctsnnManage) throws Exception {
		ctsnnManageRepository.findById(ctsnnManage.getCtsnnId()).ifPresent(entity -> {
			entity.confirm(
					ctsnnManage.getConfmAt(),
					ctsnnManage.getReturnResn());
			ctsnnManageRepository.save(entity);
		});
	}

	private CtsnnManageVO toVO(CtsnnManage entity) {
		CtsnnManageVO vo = new CtsnnManageVO();
		vo.setCtsnnId(entity.getCtsnnId());
		vo.setUsid(entity.getUsid());
		vo.setCtsnnCd(entity.getCtsnnCd());
		vo.setReqstDe(entity.getReqstDe());
		vo.setCtsnnNm(entity.getCtsnnNm());
		vo.setTrgterNm(entity.getTrgterNm());
		vo.setBrth(entity.getBrth());
		vo.setOccrrDe(entity.getOccrrDe());
		vo.setRelate(entity.getRelate());
		vo.setRemark(entity.getRemark());
		vo.setSanctnerId(entity.getSanctnerId());
		vo.setConfmAt(entity.getConfmAt());
		vo.setReturnResn(entity.getReturnResn());
		vo.setInfrmlSanctnId(entity.getInfrmlSanctnId());
		vo.setFrstRegisterId(entity.getCreatedBy());
		if (entity.getCreatedDate() != null) {
			vo.setFrstRegisterPnttm(entity.getCreatedDate().toString());
		}
		vo.setLastUpdusrId(entity.getLastModifiedBy());
		if (entity.getLastModifiedDate() != null) {
			vo.setLastUpdusrPnttm(entity.getLastModifiedDate().toString());
		}
		return vo;
	}
}
