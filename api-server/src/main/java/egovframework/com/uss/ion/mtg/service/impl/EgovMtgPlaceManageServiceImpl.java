package egovframework.com.uss.ion.mtg.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.notification.MtgPlace;
import com.company.project.domain.notification.MtgPlaceRepository;
import com.company.project.domain.notification.MtgPlaceResve;
import com.company.project.domain.notification.MtgPlaceResveRepository;

import egovframework.com.uss.ion.mtg.service.EgovMtgPlaceManageService;
import egovframework.com.uss.ion.mtg.service.MtgPlaceManageVO;
import jakarta.annotation.Resource;

@Service("egovMtgPlaceManageService")
public class EgovMtgPlaceManageServiceImpl extends EgovAbstractServiceImpl implements EgovMtgPlaceManageService {

	@Resource(name = "mtgPlaceRepository")
	private MtgPlaceRepository mtgPlaceRepository;

	@Resource(name = "mtgPlaceResveRepository")
	private MtgPlaceResveRepository mtgPlaceResveRepository;

	@Resource(name = "egovMtgPlaceManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Resource(name = "egovMtgPlaceResveManageIdGnrService")
	private EgovIdGnrService idgenResveService;

	@Override
	public List<MtgPlaceManageVO> selectMtgPlaceManageList(MtgPlaceManageVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<MtgPlace> page = mtgPlaceRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectMtgPlaceManageListTotCnt(MtgPlaceManageVO searchVO) throws Exception {
		return (int) mtgPlaceRepository.count();
	}

	@Override
	public egovframework.com.uss.ion.mtg.service.MtgPlaceManage selectMtgPlaceManage(MtgPlaceManageVO searchVO)
			throws Exception {
		return mtgPlaceRepository.findById(searchVO.getMtgPlaceId())
				.map(this::toModel)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertMtgPlaceManage(egovframework.com.uss.ion.mtg.service.MtgPlaceManage mtgPlaceManage,
			MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		String id = idgenService.getNextStringId();
		mtgPlaceManage.setMtgPlaceId(id);

		MtgPlace entity = MtgPlace.builder()
				.mtgrumId(id)
				.mtgrumNm(mtgPlaceManage.getMtgPlaceNm())
				.opnBeginTm(mtgPlaceManage.getOpnBeginTm())
				.opnEndTm(mtgPlaceManage.getOpnEndTm())
				.aceptncPosblNmpr(mtgPlaceManage.getAceptncPosblNmpr())
				.lcSe(mtgPlaceManage.getLcSe())
				.lcDetail(mtgPlaceManage.getLcDetail())
				.atchFileId(mtgPlaceManage.getAtchFileId())
				.frstRegisterId(mtgPlaceManage.getFrstRegisterId())
				.build();

		mtgPlaceRepository.save(entity);
	}

	@Override
	public void updtMtgPlaceManage(egovframework.com.uss.ion.mtg.service.MtgPlaceManage mtgPlaceManage,
			MtgPlaceManageVO mtgPlaceManageVO) throws Exception {
		mtgPlaceRepository.findById(mtgPlaceManage.getMtgPlaceId()).ifPresent(entity -> {
			entity.update(mtgPlaceManage.getMtgPlaceNm(), mtgPlaceManage.getOpnBeginTm(), mtgPlaceManage.getOpnEndTm(),
					mtgPlaceManage.getAceptncPosblNmpr(), mtgPlaceManage.getLcSe(), mtgPlaceManage.getLcDetail(),
					mtgPlaceManage.getAtchFileId(), mtgPlaceManage.getLastUpdusrId());
			mtgPlaceRepository.save(entity);
		});
	}

	@Override
	public void deleteMtgPlaceManage(egovframework.com.uss.ion.mtg.service.MtgPlaceManage searchVO) throws Exception {
		mtgPlaceRepository.deleteById(searchVO.getMtgPlaceId());
	}

	@Override
	public List<MtgPlaceManageVO> selectMtgPlaceResveManageList(MtgPlaceManageVO searchVO) throws Exception {
		return mtgPlaceResveRepository.findByMtgrumIdAndResveDe(searchVO.getMtgPlaceId(), searchVO.getResveDe())
				.stream()
				.map(this::toResveVO)
				.collect(Collectors.toList());
	}

	@Override
	public MtgPlaceManageVO selectMtgPlaceResve(MtgPlaceManageVO searchVO) throws Exception {
		return mtgPlaceResveRepository.findById(searchVO.getResveId())
				.map(this::toResveVO)
				.orElseGet(MtgPlaceManageVO::new);
	}

	@Override
	public MtgPlaceManageVO selectMtgPlaceResveDetail(MtgPlaceManageVO searchVO) throws Exception {
		return selectMtgPlaceResve(searchVO);
	}

	@Override
	public void insertMtgPlaceResve(egovframework.com.uss.ion.mtg.service.MtgPlaceResve searchVO) throws Exception {
		String id = idgenResveService.getNextStringId();
		searchVO.setResveId(id);

		MtgPlaceResve entity = MtgPlaceResve.builder()
				.resveId(id)
				.mtgrumId(searchVO.getMtgPlaceId())
				.mtgSj(searchVO.getMtgSj())
				.rsvctmId(searchVO.getResveManId())
				.resveDe(searchVO.getResveDe())
				.resveBeginTm(searchVO.getResveBeginTm())
				.resveEndTm(searchVO.getResveEndTm())
				.atndncNmpr(searchVO.getAtndncNmpr())
				.mtgCn(searchVO.getMtgCn())
				.frstRegisterId(searchVO.getFrstRegisterId())
				.build();

		mtgPlaceResveRepository.save(entity);
	}

	@Override
	public void updtMtgPlaceResve(egovframework.com.uss.ion.mtg.service.MtgPlaceResve searchVO) throws Exception {
		mtgPlaceResveRepository.findById(searchVO.getResveId()).ifPresent(entity -> {
			entity.update(searchVO.getMtgSj(), searchVO.getResveManId(), searchVO.getResveDe(),
					searchVO.getResveBeginTm(), searchVO.getResveEndTm(), searchVO.getAtndncNmpr(), searchVO.getMtgCn(),
					searchVO.getLastUpdusrId());
			mtgPlaceResveRepository.save(entity);
		});
	}

	@Override
	public void deleteMtgPlaceResve(egovframework.com.uss.ion.mtg.service.MtgPlaceResve searchVO) throws Exception {
		mtgPlaceResveRepository.deleteById(searchVO.getResveId());
	}

	@Override
	public int mtgPlaceResveDplactCeck(MtgPlaceManageVO searchVO) throws Exception {
		return 0;
	}

	private MtgPlaceManageVO toVO(MtgPlace entity) {
		MtgPlaceManageVO vo = new MtgPlaceManageVO();
		vo.setMtgPlaceId(entity.getMtgrumId());
		vo.setMtgPlaceNm(entity.getMtgrumNm());
		vo.setOpnBeginTm(entity.getOpnBeginTm());
		vo.setOpnEndTm(entity.getOpnEndTm());
		vo.setAceptncPosblNmpr(entity.getAceptncPosblNmpr());
		vo.setLcSe(entity.getLcSe());
		vo.setLcDetail(entity.getLcDetail());
		vo.setAtchFileId(entity.getAtchFileId());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}

	private egovframework.com.uss.ion.mtg.service.MtgPlaceManage toModel(MtgPlace entity) {
		egovframework.com.uss.ion.mtg.service.MtgPlaceManage model = new egovframework.com.uss.ion.mtg.service.MtgPlaceManage();
		model.setMtgPlaceId(entity.getMtgrumId());
		model.setMtgPlaceNm(entity.getMtgrumNm());
		model.setOpnBeginTm(entity.getOpnBeginTm());
		model.setOpnEndTm(entity.getOpnEndTm());
		model.setAceptncPosblNmpr(entity.getAceptncPosblNmpr());
		model.setLcSe(entity.getLcSe());
		model.setLcDetail(entity.getLcDetail());
		model.setAtchFileId(entity.getAtchFileId());
		model.setFrstRegisterId(entity.getFrstRegisterId());
		return model;
	}

	private MtgPlaceManageVO toResveVO(MtgPlaceResve entity) {
		MtgPlaceManageVO vo = new MtgPlaceManageVO();
		vo.setResveId(entity.getResveId());
		vo.setMtgPlaceId(entity.getMtgrumId());
		vo.setMtgSj(entity.getMtgSj());
		vo.setResveManId(entity.getRsvctmId());
		vo.setResveDe(entity.getResveDe());
		vo.setResveBeginTm(entity.getResveBeginTm());
		vo.setResveEndTm(entity.getResveEndTm());
		vo.setAtndncNmpr(entity.getAtndncNmpr());
		vo.setMtgCn(entity.getMtgCn());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}
}
