package egovframework.com.uss.olh.hpc.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.fdl.cmmn.exception.FdlException;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.company.project.domain.help.Hpcm;
import com.company.project.domain.help.HpcmRepository;

import egovframework.com.uss.olh.hpc.service.EgovHpcmService;
import egovframework.com.uss.olh.hpc.service.HpcmDefaultVO;
import egovframework.com.uss.olh.hpc.service.HpcmVO;
import jakarta.annotation.Resource;

@Service("egovHpcmService")
public class EgovHpcmServiceImpl extends EgovAbstractServiceImpl implements EgovHpcmService {

	@Resource(name = "hpcmRepository")
	private HpcmRepository hpcmRepository;

	@Resource(name = "egovHpcmIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public HpcmVO selectHpcmDetail(HpcmVO vo) throws Exception {
		return hpcmRepository.findById(vo.getHpcmId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<HpcmVO> selectHpcmList(HpcmDefaultVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "hpcmId"));
		Page<Hpcm> page = hpcmRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectHpcmListCnt(HpcmDefaultVO searchVO) {
		return (int) hpcmRepository.count();
	}

	@Override
	public void insertHpcm(HpcmVO vo) throws FdlException {
		try {
			String id = idgenService.getNextStringId();
			vo.setHpcmId(id);

			Hpcm entity = Hpcm.builder()
					.hpcmId(id)
					.hpcmSeCode(vo.getHpcmSeCode())
					.hpcmDf(vo.getHpcmDf())
					.hpcmDc(vo.getHpcmDc())
					.frstRegisterId(vo.getFrstRegisterId())
					.build();

			hpcmRepository.save(entity);
		} catch (Exception e) {
			throw new FdlException("error.msg", e);
		}
	}

	@Override
	public void updateHpcm(HpcmVO vo) {
		hpcmRepository.findById(vo.getHpcmId()).ifPresent(entity -> {
			entity.update(
					vo.getHpcmSeCode(),
					vo.getHpcmDf(),
					vo.getHpcmDc(),
					vo.getLastUpdusrId());
			hpcmRepository.save(entity);
		});
	}

	@Override
	public void deleteHpcmCn(HpcmVO vo) {
		hpcmRepository.deleteById(vo.getHpcmId());
	}

	private HpcmVO toVO(Hpcm entity) {
		HpcmVO vo = new HpcmVO();
		vo.setHpcmId(entity.getHpcmId());
		vo.setHpcmSeCode(entity.getHpcmSeCode());
		vo.setHpcmDf(entity.getHpcmDf());
		vo.setHpcmDc(entity.getHpcmDc());
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
