package egovframework.com.uss.ion.pwm.service.impl;

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

import com.company.project.domain.notification.Popup;
import com.company.project.domain.notification.PopupRepository;

import egovframework.com.uss.ion.pwm.service.EgovPopupManageService;
import egovframework.com.uss.ion.pwm.service.PopupManageVO;
import jakarta.annotation.Resource;

@Service("egovPopupManageService")
public class EgovPopupManageServiceImpl extends EgovAbstractServiceImpl implements EgovPopupManageService {

	@Resource(name = "popupRepository")
	private PopupRepository popupRepository;

	@Resource(name = "egovPopupManageIdGnrService")
	private EgovIdGnrService idgenService;

	@Override
	public List<EgovMap> selectPopupMainList(PopupManageVO searchVO) throws Exception {
		return popupRepository.findAll().stream()
				.filter(e -> "Y".equals(e.getNtceAt()))
				.map(this::toEgovMap)
				.collect(Collectors.toList());
	}

	@Override
	public List<EgovMap> selectPopupWhiteList() throws Exception {
		return popupRepository.findAll().stream()
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("fileUrl", e.getFileUrl());
					return map;
				})
				.collect(Collectors.toList());
	}

	@Override
	public List<EgovMap> selectPopupList(PopupManageVO searchVO) throws Exception {
		Pageable pageable = PageRequest.of(searchVO.getPageIndex() - 1, searchVO.getPageUnit(),
				Sort.by(Sort.Direction.DESC, "frstRegisterPnttm"));
		Page<Popup> page = popupRepository.findAll(pageable);
		return page.getContent().stream().map(this::toEgovMap).collect(Collectors.toList());
	}

	@Override
	public int selectPopupListCount(PopupManageVO searchVO) throws Exception {
		return (int) popupRepository.count();
	}

	@Override
	public void insertPopup(PopupManageVO searchVO) throws Exception {
		String id = idgenService.getNextStringId();
		searchVO.setPopupId(id);

		Popup entity = Popup.builder()
				.popupId(id)
				.popupSjNm(searchVO.getPopupTitleNm())
				.fileUrl(searchVO.getFileUrl())
				.popupVrticlLc(searchVO.getPopupHlc())
				.popupWidthLc(searchVO.getPopupWlc())
				.popupVrticlSize(Integer.valueOf(searchVO.getPopupHSize()))
				.popupWidthSize(Integer.valueOf(searchVO.getPopupWSize()))
				.ntceBgnde(searchVO.getNtceBgnde())
				.ntceEndde(searchVO.getNtceEndde())
				.stopvewSetupAt(searchVO.getStopVewAt())
				.ntceAt(searchVO.getNtceAt())
				.frstRegisterId(searchVO.getFrstRegisterId())
				.build();

		popupRepository.save(entity);
	}

	@Override
	public void updatePopup(PopupManageVO searchVO) throws Exception {
		popupRepository.findById(searchVO.getPopupId()).ifPresent(entity -> {
			entity.update(searchVO.getPopupTitleNm(), searchVO.getFileUrl(), searchVO.getPopupHlc(),
					searchVO.getPopupWlc(), Integer.valueOf(searchVO.getPopupHSize()),
					Integer.valueOf(searchVO.getPopupWSize()), searchVO.getNtceBgnde(),
					searchVO.getNtceEndde(), searchVO.getStopVewAt(), searchVO.getNtceAt(), searchVO.getLastUpdusrId());
			popupRepository.save(entity);
		});
	}

	@Override
	public void deletePopup(PopupManageVO searchVO) throws Exception {
		popupRepository.deleteById(searchVO.getPopupId());
	}

	@Override
	public PopupManageVO selectPopup(PopupManageVO searchVO) throws Exception {
		return popupRepository.findById(searchVO.getPopupId())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	private PopupManageVO toVO(Popup entity) {
		PopupManageVO vo = new PopupManageVO();
		vo.setPopupId(entity.getPopupId());
		vo.setPopupTitleNm(entity.getPopupSjNm());
		vo.setFileUrl(entity.getFileUrl());
		vo.setPopupHlc(entity.getPopupVrticlLc());
		vo.setPopupWlc(entity.getPopupWidthLc());
		vo.setPopupHSize(String.valueOf(entity.getPopupVrticlSize()));
		vo.setPopupWSize(String.valueOf(entity.getPopupWidthSize()));
		vo.setNtceBgnde(entity.getNtceBgnde());
		vo.setNtceEndde(entity.getNtceEndde());
		vo.setStopVewAt(entity.getStopvewSetupAt());
		vo.setNtceAt(entity.getNtceAt());
		vo.setFrstRegisterId(entity.getFrstRegisterId());
		return vo;
	}

	private EgovMap toEgovMap(Popup entity) {
		EgovMap map = new EgovMap();
		map.put("popupId", entity.getPopupId());
		map.put("popupTitleNm", entity.getPopupSjNm());
		map.put("fileUrl", entity.getFileUrl());
		map.put("ntceBgnde", entity.getNtceBgnde());
		map.put("ntceEndde", entity.getNtceEndde());
		map.put("ntceAt", entity.getNtceAt());
		return map;
	}
}