package egovframework.com.uss.ion.ans.service.impl;

import java.io.InputStream;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.Anniversary;
import com.company.project.domain.notification.AnniversaryRepository;

import egovframework.com.uss.ion.ans.service.AnnvrsryManage;
import egovframework.com.uss.ion.ans.service.AnnvrsryManageVO;
import egovframework.com.uss.ion.ans.service.EgovAnnvrsryManageService;
import jakarta.annotation.Resource;

@Service("egovAnnvrsryManageService")
public class EgovAnnvrsryManageServiceImpl extends EgovAbstractServiceImpl implements EgovAnnvrsryManageService {

	@Resource(name = "anniversaryRepository")
	private AnniversaryRepository anniversaryRepository;

	@Resource(name = "egovAnnvrsryManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<AnnvrsryManageVO> selectAnnvrsryManageList(AnnvrsryManageVO annvrsryManageVO) throws Exception {
		Pageable pageable = PageRequest.of(annvrsryManageVO.getPageIndex() - 1, annvrsryManageVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "annvrsryDe"));
		Page<Anniversary> page = anniversaryRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectAnnvrsryManageListTotCnt(AnnvrsryManageVO annvrsryManageVO) throws Exception {
		return (int) anniversaryRepository.count();
	}

	@Override
	public AnnvrsryManageVO selectAnnvrsryManage(AnnvrsryManageVO annvrsryManageVO) throws Exception {
		return anniversaryRepository.findById(annvrsryManageVO.getAnnId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception {
		String id = idgenService.getNextStringId();
		annvrsryManage.setAnnId(id);

		Anniversary entity = Anniversary.builder()
				.annId(id)
				.usid(annvrsryManage.getUsid())
				.annvrsrySe(annvrsryManage.getAnnvrsrySe())
				.annvrsryNm(annvrsryManage.getAnnvrsryNm())
				.annvrsryDe(annvrsryManage.getAnnvrsryDe())
				.cldrSe(annvrsryManage.getCldrSe())
				.annvrsrySetup(annvrsryManage.getAnnvrsrySetup())
				.annvrsryBeginDe(annvrsryManage.getAnnvrsryBeginDe())
				.memo(annvrsryManage.getMemo())
				.reptitSe(annvrsryManage.getReptitSe())
				.frstRegisterId(annvrsryManage.getFrstRegisterId())
				.build();

		anniversaryRepository.save(entity);
	}

	@Override
	public void updateAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception {
		anniversaryRepository.findById(annvrsryManage.getAnnId()).ifPresent(entity -> {
			entity.update(
					annvrsryManage.getAnnvrsrySe(),
					annvrsryManage.getAnnvrsryNm(),
					annvrsryManage.getAnnvrsryDe(),
					annvrsryManage.getCldrSe(),
					annvrsryManage.getAnnvrsrySetup(),
					annvrsryManage.getAnnvrsryBeginDe(),
					annvrsryManage.getMemo(),
					annvrsryManage.getReptitSe(),
					annvrsryManage.getLastUpdusrId());
			anniversaryRepository.save(entity);
		});
	}

	@Override
	public void deleteAnnvrsryManage(AnnvrsryManage annvrsryManage) throws Exception {
		anniversaryRepository.deleteById(annvrsryManage.getAnnId());
	}

	@Override
	public int selectAnnvrsryManageDplctAt(AnnvrsryManage annvrsryManage) throws Exception {
		return 0;
	}

	@Override
	public List<AnnvrsryManageVO> selectAnnvrsryGdcc(AnnvrsryManageVO annvrsryManageVO) throws Exception {
		return List.of();
	}

	@Override
	public List<AnnvrsryManageVO> selectAnnvrsryManageBnde(InputStream inputStream) throws Exception {
		return List.of();
	}

	@Override
	public void insertAnnvrsryManageBnde(AnnvrsryManageVO annvrsryManageVO, String checkedAnnvrsryManageForInsert)
			throws Exception {
		// Batch insert logic
	}

	private AnnvrsryManageVO toVO(Anniversary entity) {
		AnnvrsryManageVO vo = new AnnvrsryManageVO();
		vo.setAnnId(entity.getAnnId());
		vo.setUsid(entity.getUsid());
		vo.setAnnvrsrySe(entity.getAnnvrsrySe());
		vo.setAnnvrsryNm(entity.getAnnvrsryNm());
		vo.setAnnvrsryDe(entity.getAnnvrsryDe());
		vo.setCldrSe(entity.getCldrSe());
		vo.setAnnvrsrySetup(entity.getAnnvrsrySetup());
		vo.setAnnvrsryBeginDe(entity.getAnnvrsryBeginDe());
		vo.setMemo(entity.getMemo());
		vo.setReptitSe(entity.getReptitSe());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		vo.setLastUpdusrId(entity.getLastUpdusrId());
		if (entity.getLastUpdusrPnttm() != null) {
			vo.setLastUpdusrPnttm(entity.getLastUpdusrPnttm().toString());
		}
		return vo;
	}
}
