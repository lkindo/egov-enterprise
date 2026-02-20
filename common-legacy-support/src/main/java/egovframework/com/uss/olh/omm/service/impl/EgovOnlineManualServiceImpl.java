package egovframework.com.uss.olh.omm.service.impl;

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

import com.company.project.domain.help.OnlineManual;
import com.company.project.domain.help.OnlineManualRepository;

import jakarta.annotation.Resource;

@Service("egovOnlineManualService")
public class EgovOnlineManualServiceImpl extends EgovAbstractServiceImpl
		implements egovframework.com.uss.olh.omm.service.EgovOnlineManualService {

	@Resource(name = "onlineManualRepository")
	private OnlineManualRepository onlineManualRepository;

	@Resource(name = "egovOnlineManualIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public egovframework.com.uss.olh.omm.service.OnlineManualVO selectOnlineManualDetail(
			egovframework.com.uss.olh.omm.service.OnlineManualVO vo) throws Exception {
		return onlineManualRepository.findById(vo.getOnlineMnlId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	@Override
	public List<egovframework.com.uss.olh.omm.service.OnlineManualVO> selectOnlineManualList(
			egovframework.com.uss.olh.omm.service.OnlineManualVO searchVO) {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<OnlineManual> page = onlineManualRepository.findAll(pageable);
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	@Override
	public int selectOnlineManualListCnt(egovframework.com.uss.olh.omm.service.OnlineManualVO searchVO) {
		return (int) onlineManualRepository.count();
	}

	@Override
	public void insertOnlineManual(egovframework.com.uss.olh.omm.service.OnlineManualVO vo) throws FdlException {
		try {
			String id = idgenService.getNextStringId();
			vo.setOnlineMnlId(id);

			OnlineManual entity = OnlineManual.builder()
					.onlineMnlId(id)
					.onlineMnlNm(vo.getOnlineMnlNm())
					.onlineMnlSeCode(vo.getOnlineMnlSeCode())
					.onlineMnlDf(vo.getOnlineMnlDf())
					.onlineMnlDc(vo.getOnlineMnlDc())
					.frstRegisterId(vo.getFrstRegisterId())
					.build();

			onlineManualRepository.save(entity);
		} catch (Exception e) {
			throw new FdlException("error.msg", e);
		}
	}

	@Override
	public void updateOnlineManual(egovframework.com.uss.olh.omm.service.OnlineManualVO vo) {
		onlineManualRepository.findById(vo.getOnlineMnlId()).ifPresent(entity -> {
			entity.update(
					vo.getOnlineMnlNm(),
					vo.getOnlineMnlSeCode(),
					vo.getOnlineMnlDf(),
					vo.getOnlineMnlDc(),
					vo.getLastUpdusrId());
			onlineManualRepository.save(entity);
		});
	}

	@Override
	public void deleteOnlineManual(egovframework.com.uss.olh.omm.service.OnlineManualVO vo) {
		onlineManualRepository.deleteById(vo.getOnlineMnlId());
	}

	private egovframework.com.uss.olh.omm.service.OnlineManualVO toVO(OnlineManual entity) {
		egovframework.com.uss.olh.omm.service.OnlineManualVO vo = new egovframework.com.uss.olh.omm.service.OnlineManualVO();
		vo.setOnlineMnlId(entity.getOnlineMnlId());
		vo.setOnlineMnlNm(entity.getOnlineMnlNm());
		vo.setOnlineMnlSeCode(entity.getOnlineMnlSeCode());
		vo.setOnlineMnlDf(entity.getOnlineMnlDf());
		vo.setOnlineMnlDc(entity.getOnlineMnlDc());
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
