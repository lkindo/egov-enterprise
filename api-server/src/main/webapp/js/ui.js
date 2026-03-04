$(function () {

    // init
    $('.popup').length && popup.init();

    // Form

    // Checkbox
    $('.f_chk').on('keyup', function (e) {
        e.preventDefault();
        if (window.event.keyCode == 13) {
            $(this).toggleClass('on');
            if ($(this).find('input').prop('checked')) {
                $(this).find('input').prop('checked', false);
            } else {
                $(this).find('input').prop('checked', true);
            }
        }
    });
    $('.f_chk input').on('click', function (e) {
        e.preventDefault();
        $(this).parent().toggleClass('on');
    });

    var chkOnly = {
        init: function () {
            this.$tartet = $('.f_chk_only');
            this.addEvent();
        },
        addEvent: function () {
            this.$tartet.on('click', function () {
                if ($(this).hasClass('on')) {
                    $(this).removeClass('on');
                    $(this).find('input').prop('checked', false);
                } else {
                    $(this).addClass('on');
                    $(this).find('input').prop('checked', true);
                }
            });
        }
    }
    $('.f_chk_only').length && chkOnly.init();

    var chkAll = {
        init: function () {
            this.$tartet = $('.chkAll');
            this.addEvent();
        },
        addEvent: function () {
            this.$tartet.on('click', function () {
                var idx = $(this).parents('tr').find('th').index($(this).parent('th'));

                if ($(this).hasClass('on')) {
                    $(this).parents('table').find('tbody tr').find('td:eq(' + idx + ') .f_chk_only').addClass('on');
                    $(this).parents('table').find('tbody tr').find('td:eq(' + idx + ') .f_chk_only input').prop('checked', true);
                } else {
                    $(this).parents('table').find('tbody tr').find('td:eq(' + idx + ') .f_chk_only').removeClass('on');
                    $(this).parents('table').find('tbody tr').find('td:eq(' + idx + ') .f_chk_only input').prop('checked', false);
                }
            });
        },
    }
    $('.chkAll').length && chkAll.init();

    // Radio
    $('.f_rdo').on('keyup', function (e) {
        e.preventDefault();
        if (window.event.keyCode == 13) {
            if ($(this).parents('.rdoSet') < 1) {
                $(this).toggleClass('on');
                if ($(this).find('input').prop('checked')) {
                    $(this).find('input').prop('checked', false);
                } else {
                    $(this).find('input').prop('checked', true);
                }
            } else {
                $(this).parents('.rdoSet').find('.f_rdo').removeClass('on');
                $(this).parents('.rdoSet').find('.f_rdo').prop('checked', false);
                $(this).addClass('on');
                $(this).find('input').prop('checked', true);
            }
        }
    });
    $('.f_rdo input').on('click', function (e) {
        e.preventDefault();
        if ($(this).parents('.rdoSet') < 1) {
            $(this).parent().toggleClass('on');
        } else {
            $(this).parents('.rdoSet').find('.f_rdo').removeClass('on');
            $(this).parent().addClass('on');
        }
    });

    var allMenu = {
        init: function () {
            this.$btn = $('.util_menu .allmenu');
            this.$gnb = $('.gnb');

            this.addEvent();
        },
        addEvent: function () {
            var _this = this;
            this.$btn.on('click', function (e) {
                e.preventDefault();
                // Toggle 'all_open' class on GNB to show/hide submenus via CSS
                if (_this.$gnb.hasClass('all_open')) {
                    _this.$gnb.removeClass('all_open');
                    $(this).removeClass('on');
                    // Reset individual active states when closing all menu
                    _this.$gnb.find('li').removeClass('active');
                } else {
                    _this.$gnb.addClass('all_open');
                    $(this).addClass('on');
                }
            });
        }
    }
    $('.allmenu').length && allMenu.init();

    // GNB Accordion Interaction
    var gnbInteraction = {
        init: function () {
            this.$gnbLinks = $('.gnb > ul > li > a');
            this.addEvent();
        },
        addEvent: function () {
            this.$gnbLinks.on('click', function (e) {
                var $li = $(this).parent('li');
                var $submenu = $li.find('.depth2_wrap');

                if ($submenu.length > 0) {
                    e.preventDefault(); // Prevent navigation if submenu exists

                    // If already active, toggle it off (optional, or keep it open)
                    // Let's implement accordion: close others, toggle current

                    if ($li.hasClass('active')) {
                        $li.removeClass('active');
                    } else {
                        // Close other siblings
                        $li.siblings().removeClass('active');
                        // Open current
                        $li.addClass('active');
                    }
                }
                // If no submenu, let it navigate (default behavior)
            });
        }
    };
    $('.gnb').length && gnbInteraction.init();

    //
    var tempIntro = {
        init: function () {
            this.$tartet = $('.POP_TEMPLATE_INTRO');
            this.$btn = $('.header .go');
            this.addEvent();
        },
        addEvent: function (e) {
            var _this = this.$tartet;
            this.$btn.on('click', function (e) {
                e.preventDefault();
                _this.show();
            });
        }
    }
    tempIntro.init();

    $('.tree-ui').length && tree.init();

});

// Popup
var popup = {
    init: function () {
        this.$tartet = $('.popup');
        this.$popClose = this.$tartet.find('.pop_header .close');
        this.addEvent();
    },
    open: function (obj) {
        $('.' + obj).show();
        $('body').css('overflow', 'hidden');
    },
    addEvent: function () {
        this.$popClose.on('click', function () {
            $(this).parents('.popup').hide();
            $('body').css('overflow', 'visible');
        });
    }
}

// 메뉴생성
var tree = {
    init: function () {
        this.$tartet = $('.tree-ui');
        this.$allChk = this.$tartet.find('.all-chk');
        this.$combo = this.$tartet.find('.list .f_chk_only');
        this.addEvent();
    },
    addEvent: function () {
        this.$allChk.on('click', function () {
            if ($(this).find('input').prop('checked')) {
                $(this).parents('.tree-ui').find('.list .f_chk_only').addClass('on');
                $(this).parents('.tree-ui').find('.list .f_chk_only input').prop('checked', true);
            } else {
                $(this).parents('.tree-ui').find('.list .f_chk_only').removeClass('on');
                $(this).parents('.tree-ui').find('.list .f_chk_only input').prop('checked', false);
            }
        });
        this.$combo.on('click', function () {

        });
    }
}
