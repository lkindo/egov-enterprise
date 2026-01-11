package egovframework.com.uss.ion.rwd.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.RwardManage;
import com.company.project.domain.notification.RwardManageRepository;

import egovframework.com.uss.ion.rwd.service.EgovRwardManageService;
import egovframework.com.uss.ion.rwd.service.RwardManageVO;
import jakarta.annotation.Resource;

@Service("egovRwardManageService")
public class EgovRwardManageServiceImpl extends EgovAbstractServiceImpl implements EgovRwardManageService {

	@Resource(name = "rwardManageRepository")
	private RwardManageRepository rwardManageRepository;

	@Resource(name = "egovRwardManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<RwardManageVO> selectRwardManageList(RwardManageVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<RwardManage> page = rwardManageRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectRwardManageListTotCnt(RwardManageVO searchVO) throws Exception {
		return (int) rwardManageRepository.count();
	}

	@Override
	public RwardManageVO selectRwardManage(RwardManageVO searchVO) throws Exception {
		return rwardManageRepository.findById(searchVO.getRwardId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertRwardManage(egovframework.com.uss.ion.rwd.service.RwardManage searchVO) throws Exception {
		String id = idgenService.getNextStringId();
		searchVO.setRwardId(id);

		RwardManage entity = RwardManage.builder()
				.rwardId(id)
				.rwardwnrId(searchVO.getRwardManId())
				.rwardCode(searchVO.getRwardCd())
				.rwardDe(searchVO.getRwardDe())
				.rwardNm(searchVO.getRwardNm())
				.pblenCn(searchVO.getPblenCn())
				.sanctnerId(searchVO.getSanctnerId())
				.confmAt(searchVO.getConfmAt())
				.atchFileId(searchVO.getAtchFileId())
				.infrmlSanctnId(searchVO.getInfrmlSanctnId())
				.frstRegisterId(searchVO.getFrstRegisterId())
				.build();

		rwardManageRepository.save(entity);
	}

	@Override
	public void updtRwardManage(egovframework.com.uss.ion.rwd.service.RwardManage searchVO) throws Exception {
		rwardManageRepository.findById(searchVO.getRwardId()).ifPresent(entity -> {
			entity.update(searchVO.getRwardCd(), searchVO.getRwardDe(), searchVO.getRwardNm(), searchVO.getPblenCn(),
					searchVO.getAtchFileId(), searchVO.getLastUpdusrId());
			rwardManageRepository.save(entity);
		});
	}

	@Override
	public void deleteRwardManage(egovframework.com.uss.ion.rwd.service.RwardManage searchVO) throws Exception {
		rwardManageRepository.deleteById(searchVO.getRwardId());
	}

	@Override
	public List<RwardManageVO> selectRwardManageConfmList(RwardManageVO searchVO) throws Exception {
		// select where sanctnerId = ?
		return rwardManageRepository.findAll().stream()
				.filter(e -> searchVO.getSanctnerId().equals(e.getSanctnerId()))
				.map(this::toVO)
				.collect(Collectors.toList());
	}

	@Override
	public int selectRwardManageConfmListTotCnt(RwardManageVO searchVO) throws Exception {
		return (int) selectRwardManageConfmList(searchVO).size();
	}

	@Override
	public void updtRwardManageConfm(egovframework.com.uss.ion.rwd.service.RwardManage searchVO) throws Exception {
		rwardManageRepository.findById(searchVO.getRwardId()).ifPresent(entity -> {
			entity.confirm(searchVO.getConfmAt(), LocalDateTime.now(), searchVO.getReturnResn(),
					searchVO.getLastUpdusrId());
			rwardManageRepository.save(entity);
		});
	}

	private RwardManageVO toVO(RwardManage entity) {
		RwardManageVO vo = new RwardManageVO();
		vo.setRwardId(entity.getRwardId());
		vo.setRwardManId(entity.getRwardwnrId());
		vo.setRwardCd(entity.getRwardCode());
		vo.setRwardDe(entity.getRwardDe());
		vo.setRwardNm(entity.getRwardNm());
		vo.setPblenCn(entity.getPblenCn());
		vo.setSanctnerId(entity.getSanctnerId());
		vo.setConfmAt(entity.getConfmAt());
		if (entity.getSanctnDt() != null) {
			vo.setSanctnDt(entity.getSanctnDt().toString());
		}
		vo.setReturnResn(entity.getReturnResn());
		vo.setAtchFileId(entity.getAtchFileId());
		vo.setInfrmlSanctnId(entity.getInfrmlSanctnId());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}
}
