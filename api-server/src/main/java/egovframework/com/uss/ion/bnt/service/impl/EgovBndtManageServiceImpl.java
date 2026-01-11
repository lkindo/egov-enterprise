package egovframework.com.uss.ion.bnt.service.impl;

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

import com.company.project.domain.duty.BndtCeckManageRepository;
import com.company.project.domain.duty.BndtDiaryRepository;
import com.company.project.domain.duty.BndtManageRepository;
import com.company.project.domain.duty.BndtManageId;
import com.company.project.domain.duty.BndtCeckManageId;
import com.company.project.domain.duty.BndtDiaryId;

import egovframework.com.uss.ion.bnt.service.BndtCeckManage;
import egovframework.com.uss.ion.bnt.service.BndtCeckManageVO;
import egovframework.com.uss.ion.bnt.service.BndtDiary;
import egovframework.com.uss.ion.bnt.service.BndtDiaryVO;
import egovframework.com.uss.ion.bnt.service.BndtManage;
import egovframework.com.uss.ion.bnt.service.BndtManageVO;
import egovframework.com.uss.ion.bnt.service.EgovBndtManageService;
import jakarta.annotation.Resource;

@Service("egovBndtManageService")
public class EgovBndtManageServiceImpl extends EgovAbstractServiceImpl implements EgovBndtManageService {

	@Resource(name = "bndtManageRepository")
	private BndtManageRepository bndtManageRepository;

	@Resource(name = "bndtCeckManageRepository")
	private BndtCeckManageRepository bndtCeckManageRepository;

	@Resource(name = "bndtDiaryRepository")
	private BndtDiaryRepository bndtDiaryRepository;

	@Resource(name = "egovBndtManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<BndtManageVO> selectBndtManageList(BndtManageVO bndtManageVO) throws Exception {
		Pageable pageable = PageRequest.of(bndtManageVO.getPageIndex() - 1, bndtManageVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "bndtDe"));
		Page<com.company.project.domain.duty.BndtManage> page = bndtManageRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectBndtManageListTotCnt(BndtManageVO bndtManageVO) throws Exception {
		return (int) bndtManageRepository.count();
	}

	@Override
	public BndtManageVO selectBndtManage(BndtManageVO bndtManageVO) throws Exception {
		return bndtManageRepository.findById(new BndtManageId(bndtManageVO.getBndtId(), bndtManageVO.getBndtDe()))
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertBndtManage(BndtManage bndtManage) throws Exception {
		com.company.project.domain.duty.BndtManage entity = com.company.project.domain.duty.BndtManage.builder()
				.bndtId(bndtManage.getBndtId())
				.bndtDe(bndtManage.getBndtDe())
				.remark(bndtManage.getRemark())
				.frstRegisterId(bndtManage.getFrstRegisterId())
				.build();
		bndtManageRepository.save(entity);
	}

	@Override
	public void updtBndtManage(BndtManage bndtManage) throws Exception {
		bndtManageRepository.findById(new BndtManageId(bndtManage.getBndtId(), bndtManage.getBndtDe()))
				.ifPresent(entity -> {
					entity.update(bndtManage.getRemark(), bndtManage.getLastUpdusrId());
					bndtManageRepository.save(entity);
				});
	}

	@Override
	public void deleteBndtManage(BndtManage bndtManage) throws Exception {
		bndtManageRepository.deleteById(new BndtManageId(bndtManage.getBndtId(), bndtManage.getBndtDe()));
	}

	@Override
	public int selectBndtDiaryTotCnt(BndtManage bndtManage) throws Exception {
		return (int) bndtDiaryRepository.count();
	}

	@Override
	public List<BndtCeckManageVO> selectBndtCeckManageList(BndtCeckManageVO bndtCeckManageVO) throws Exception {
		return bndtCeckManageRepository.findAll().stream()
				.map(e -> {
					BndtCeckManageVO vo = new BndtCeckManageVO();
					vo.setBndtCeckSe(e.getBndtCeckSe());
					vo.setBndtCeckCd(e.getBndtCeckCd());
					vo.setBndtCeckCdNm(e.getBndtCeckCdNm());
					vo.setUseAt(e.getUseAt());
					return vo;
				}).collect(Collectors.toList());
	}

	@Override
	public int selectBndtCeckManageListTotCnt(BndtCeckManageVO bndtCeckManageVO) throws Exception {
		return (int) bndtCeckManageRepository.count();
	}

	@Override
	public BndtCeckManageVO selectBndtCeckManage(BndtCeckManageVO bndtCeckManageVO) throws Exception {
		return bndtCeckManageRepository
				.findById(new BndtCeckManageId(bndtCeckManageVO.getBndtCeckSe(), bndtCeckManageVO.getBndtCeckCd()))
				.map(e -> {
					BndtCeckManageVO vo = new BndtCeckManageVO();
					vo.setBndtCeckSe(e.getBndtCeckSe());
					vo.setBndtCeckCd(e.getBndtCeckCd());
					vo.setBndtCeckCdNm(e.getBndtCeckCdNm());
					vo.setUseAt(e.getUseAt());
					return vo;
				})
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception {
		com.company.project.domain.duty.BndtCeckManage entity = com.company.project.domain.duty.BndtCeckManage.builder()
				.bndtCeckSe(bndtCeckManage.getBndtCeckSe())
				.bndtCeckCd(bndtCeckManage.getBndtCeckCd())
				.bndtCeckCdNm(bndtCeckManage.getBndtCeckCdNm())
				.useAt(bndtCeckManage.getUseAt())
				.frstRegisterId(bndtCeckManage.getFrstRegisterId())
				.build();
		bndtCeckManageRepository.save(entity);
	}

	@Override
	public void updtBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception {
		bndtCeckManageRepository
				.findById(new BndtCeckManageId(bndtCeckManage.getBndtCeckSe(), bndtCeckManage.getBndtCeckCd()))
				.ifPresent(entity -> {
					entity.update(bndtCeckManage.getBndtCeckCdNm(), bndtCeckManage.getUseAt(),
							bndtCeckManage.getLastUpdusrId());
					bndtCeckManageRepository.save(entity);
				});
	}

	@Override
	public void deleteBndtCeckManage(BndtCeckManage bndtCeckManage) throws Exception {
		bndtCeckManageRepository
				.deleteById(new BndtCeckManageId(bndtCeckManage.getBndtCeckSe(), bndtCeckManage.getBndtCeckCd()));
	}

	@Override
	public int selectBndtCeckManageDplctAt(BndtCeckManage bndtCeckManage) throws Exception {
		return bndtCeckManageRepository.existsById(
				new BndtCeckManageId(bndtCeckManage.getBndtCeckSe(), bndtCeckManage.getBndtCeckCd())) ? 1 : 0;
	}

	@Override
	public List<BndtDiaryVO> selectBndtDiary(BndtDiaryVO bndtDiaryVO) throws Exception {
		return bndtDiaryRepository.findAll().stream()
				.filter(e -> e.getBndtId().equals(bndtDiaryVO.getBndtId())
						&& e.getBndtDe().equals(bndtDiaryVO.getBndtDe()))
				.map(this::toDiaryVO)
				.collect(Collectors.toList());
	}

	@Override
	public void insertBndtDiary(BndtDiary bndtDiary, String diaryForInsert) throws Exception {
		com.company.project.domain.duty.BndtDiary entity = com.company.project.domain.duty.BndtDiary.builder()
				.bndtId(bndtDiary.getBndtId())
				.bndtDe(bndtDiary.getBndtDe())
				.bndtCeckSe(bndtDiary.getBndtCeckSe())
				.bndtCeckCd(bndtDiary.getBndtCeckCd())
				.chckSttus(bndtDiary.getChckSttus())
				.frstRegisterId(bndtDiary.getFrstRegisterId())
				.build();
		bndtDiaryRepository.save(entity);
	}

	@Override
	public void updtBndtDiary(BndtDiary bndtDiary, String diaryForUpdt) throws Exception {
		BndtDiaryId id = new BndtDiaryId(bndtDiary.getBndtId(), bndtDiary.getBndtDe(), bndtDiary.getBndtCeckSe(),
				bndtDiary.getBndtCeckCd());
		bndtDiaryRepository.findById(id).ifPresent(entity -> {
			entity.update(bndtDiary.getChckSttus(), bndtDiary.getLastUpdusrId());
			bndtDiaryRepository.save(entity);
		});
	}

	@Override
	public void deleteBndtDiary(BndtDiary bndtDiary) throws Exception {
		BndtDiaryId id = new BndtDiaryId(bndtDiary.getBndtId(), bndtDiary.getBndtDe(), bndtDiary.getBndtCeckSe(),
				bndtDiary.getBndtCeckCd());
		bndtDiaryRepository.deleteById(id);
	}

	@Override
	public List<BndtManageVO> selectBndtManageBnde(InputStream inputStream) throws Exception {
		return List.of(); // Excel parsing - not implemented for JPA migration
	}

	@Override
	public List<BndtManageVO> selectBndtManageBndeX(InputStream inputStream) throws Exception {
		return List.of(); // Excel parsing (Xlsx) - not implemented for JPA migration
	}

	@Override
	public void insertBndtManageBnde(BndtManageVO bndtManageVO, String checkedBndtManageForInsert) throws Exception {
		// Batch insert - not fully implemented for JPA migration
	}

	@Override
	public int selectBndtManageMonthCnt(BndtManageVO bndtManageVO) throws Exception {
		return (int) bndtManageRepository.count();
	}

	private BndtManageVO toVO(com.company.project.domain.duty.BndtManage entity) {
		BndtManageVO vo = new BndtManageVO();
		vo.setBndtId(entity.getBndtId());
		vo.setBndtDe(entity.getBndtDe());
		vo.setRemark(entity.getRemark());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		if (entity.getFrstRegisterPnttm() != null) {
			vo.setFrstRegisterPnttm(entity.getFrstRegisterPnttm().toString());
		}
		return vo;
	}

	private BndtDiaryVO toDiaryVO(com.company.project.domain.duty.BndtDiary entity) {
		BndtDiaryVO vo = new BndtDiaryVO();
		vo.setBndtId(entity.getBndtId());
		vo.setBndtDe(entity.getBndtDe());
		vo.setBndtCeckSe(entity.getBndtCeckSe());
		vo.setBndtCeckCd(entity.getBndtCeckCd());
		vo.setChckSttus(entity.getChckSttus());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}
}
