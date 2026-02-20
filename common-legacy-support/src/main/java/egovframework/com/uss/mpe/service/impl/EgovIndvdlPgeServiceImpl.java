package egovframework.com.uss.mpe.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.mypage.IndvdlPge;
import com.company.project.domain.mypage.IndvdlPgeRepository;

import egovframework.com.uss.mpe.service.EgovIndvdlPgeService;
import egovframework.com.uss.mpe.service.IndvdlPgeVO;
import jakarta.annotation.Resource;

@Service("egovIndvdlPgeService")
public class EgovIndvdlPgeServiceImpl extends EgovAbstractServiceImpl implements EgovIndvdlPgeService {

	@Resource(name = "indvdlPgeRepository")
	private IndvdlPgeRepository indvdlPgeRepository;

	@Override
	public List<IndvdlPgeVO> selectIndvdlPgeList(IndvdlPgeVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "cntntsId"));
		Page<IndvdlPge> page = indvdlPgeRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectIndvdlPgeListCnt(IndvdlPgeVO searchVO) {
		return (int) indvdlPgeRepository.count();
	}

	@Override
	public IndvdlPgeVO selectIndvdlPgeDetail(IndvdlPgeVO indvdlPgeVO) throws Exception {
		return indvdlPgeRepository.findById(indvdlPgeVO.getCntntsId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public void insertIndvdlPge(IndvdlPgeVO indvdlPgeVO) throws FdlException {
		try {
			IndvdlPge entity = IndvdlPge.builder()
					.cntntsId(indvdlPgeVO.getCntntsId())
					.cntntsNm(indvdlPgeVO.getCntntsNm())
					.cntcUrl(indvdlPgeVO.getCntcUrl())
					.cntntsUseAt(indvdlPgeVO.getCntntsUseAt())
					.cntntsLinkUrl(indvdlPgeVO.getCntntsLinkUrl())
					.cntntsDc(indvdlPgeVO.getCntntsDc())
					.build();
			indvdlPgeRepository.save(entity);
		} catch (Exception e) {
			throw new FdlException("error.msg", e);
		}
	}

	@Override
	public void updateIndvdlPge(IndvdlPgeVO indvdlPgeVO) {
		indvdlPgeRepository.findById(indvdlPgeVO.getCntntsId()).ifPresent(entity -> {
			entity.update(
					indvdlPgeVO.getCntntsNm(),
					indvdlPgeVO.getCntcUrl(),
					indvdlPgeVO.getCntntsUseAt(),
					indvdlPgeVO.getCntntsLinkUrl(),
					indvdlPgeVO.getCntntsDc());
			indvdlPgeRepository.save(entity);
		});
	}

	private IndvdlPgeVO toVO(IndvdlPge entity) {
		IndvdlPgeVO vo = new IndvdlPgeVO();
		vo.setCntntsId(entity.getCntntsId());
		vo.setCntntsNm(entity.getCntntsNm());
		vo.setCntcUrl(entity.getCntcUrl());
		vo.setCntntsUseAt(entity.getCntntsUseAt());
		vo.setCntntsLinkUrl(entity.getCntntsLinkUrl());
		vo.setCntntsDc(entity.getCntntsDc());
		return vo;
	}
}
