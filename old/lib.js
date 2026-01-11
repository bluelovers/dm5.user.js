

function _uf_fixsize2(who, area, force, scrollsize)
{
	let _elem = $(who);

	let _ok;

	if ($.isPlainObject(area) && $.isNumeric(area.width))
	{
		area = $('<div/>')
			.width(area.width)
			.height(area.height !== undefined ? area.height : area.width)
			;
	}
	else if ($.isArray(area) && $.isNumeric(area[0]))
	{
		area = $('<div/>')
			.width(area[0])
			.height(area[1] !== undefined ? area[1] : area[0])
			;
	}

	if (area === true || area == who || area == _elem)
	{
		scrollsize = null;
		_ok = true;
	}
	else if (area)
	{
		_ok = area;
	}
	else
	{
		_ok = window;
	}

	if (!scrollsize || _ok === true || (scrollsize.width === undefined && scrollsize.height === undefined) || (!scrollsize.width && !scrollsize.height))
	{
		scrollsize = null;
	}
	else
	{
		if (scrollsize == 'auto')
		{
			scrollsize.width = 'auto';
			scrollsize.height = 'auto';
		}

		scrollsize.width = scrollsize.width || 0;
		scrollsize.height = scrollsize.height || 0;
	}

	_elem.each(function ()
	{
		let _this = $(this);
		let _area = $(_ok === true ? this : _ok);

		let _w = (_this[0] as IHTMLElement).naturalWidth;
		let _h = (_this[0] as IHTMLElement).naturalHeight;

		if (!_w || !_h)
		{
			_w = _this.width();
			_h = _this.height();
		}

		let _w2 = _area.width();
		let _h2 = _area.height();

		if (scrollsize)
		{
			_w2 = scrollsize.width == 'auto' ? _area.innerWidth() : _w2 - scrollsize.width;
			_h2 = scrollsize.height == 'auto' ? _area.innerHeight() : _h2 - scrollsize.height;
		}

		let _w3 = _w;
		let _h3 = _h;

		if (_w > _w2)
		{
			_w3 = _w2;
			_h3 = _h * (_w2 / _w);

			if (_h3 > _h2)
			{
				_w3 = _w3 * (_h2 / _h3);
				_h3 = _h2;
			}
		}
		else if (force > 1)
		{
			let scale = calc_scale(_w, _h);

			_w3 = _w3 * scale;
			_h3 = _h2;

			//console.log(force, scale, [_w, _h], [_w3, _h3]);
		}
		else if (force || (_h > _h2))
		{
			_w3 = _w * (_h2 / _h);
			_h3 = _h2;

			if (_w3 > _w2)
			{
				_w3 = _w2;
				_h3 = _h * (_w2 / _w);
			}
		}
		else
		{
		}

		_this.height(_h3).width(_w3);

		_this.attr({
			'data-naturalHeight': _h,
			'data-naturalWidth': _w,

			'data-height': _h3,
			'data-width': _w3,
		});
	});

	return _elem;
}

const comic_style = {

	photo: {
		filter: 'contrast(115%)',
		padding: 0,
		margin: 'auto',
		border: '0px none #fff',
		outline: 0,

		'max-width': 'initial',
		'max-height': 'initial',

		'min-width': 'initial',
		'min-height': 'initial',

		'border-spacing': 0,
	},

	photo_area: {
		padding: 0,
		margin: 'auto',
		border: '0px none #fff',
		outline: 0,
		'border-spacing': 0,
	},

	overflow_hidden: {
		'overflow-x': 'hidden',
	},

	body: {
		margin: 0,
		padding: 0,
		outline: 0,
	},

	bg_transparent: {
		background: 'transparent',
	},

	bg_dark: {
		background: '#34353b',
	},

	bg_dark2: {
		background: '#4f535b',
	},

	bg_dark_text: {
		color: '#DDDDDD',
	},

	bg_dark_border: {
		border: '1px solid #000000',
	},

	page: {
		//position: 'fixed',
		position: 'absolute',
		padding: '10px',
		'z-index': 100,
		'min-width': '80px',
		'text-align': 'center',
	},

	page_position: {
		top: 50,
		left: 50,
	},

	video_thumb: {
		'min-width': 120,
		'min-height': 90,

		display: 'inline-block',
		background: 'rgb(0, 0, 0) none repeat scroll 0% 0%',
		color: 'rgb(255, 255, 255)',
		'text-decoration': 'none',
		'text-align': 'center',
		padding: 5,
	},

	vertical: {

	},

	vertical_before: {
		content: '',
		display: 'inline-block',
		'vertical-align': 'middle',
		height: '100%',
	},

	vertical_target: {
		'vertical-align': 'middle',
		display: 'inline-block',
	},

};

/**
 * 恢復被禁用的右鍵菜單和拖曳功能
 */
function _uf_disable_nocontextmenu(mode, elem?)
{
	var _jquery_array = [$];
	var _unsafeJquery;
	var _jquery;

	if (mode > 1)
	{
		var _style = $('style#_uf_disable_nocontextmenu');

		if (!_style.length)
		{
			//_style = GM_addStyle('* { -moz-user-select: auto !important; -webkit-user-select: auto !important; -ms-user-select: auto !important; }');

			//$(_style).attr('id', '_uf_disable_nocontextmenu');
		}

		// @ts-ignore
		if (unsafeWindow.$ && unsafeWindow.$.fn && unsafeWindow.$.fn.jquery)
		{
			// @ts-ignore
			_unsafeJquery = unsafeWindow.$;

			_jquery_array[_jquery_array.length] = _unsafeJquery;
		}
	}

	var _fn_jq_call = function (_jquery, arr, fn, event)
	{
		if (_jquery.fn[fn])
		{
			$.each(event, function (i, v)
			{
				try
				{
					arr[fn](v);
				}
				catch (e)
				{
					console.error(e);
				}

				//_uf_log(arr, fn, v);
			});
		}
	};

	//		_jquery = _jquery_array[0];

	var _fn_event = ['dragstart', 'contextmenu', 'selectstart', 'mousedown', 'mouseup', 'source'];

	$.each(_jquery_array, function (key, _jquery)
	{

		//var arr = _jquery(unsafeWindow.document).add('body, html');
		var arr = _jquery('body, html');

		if (elem)
		{
			arr = arr.add(elem);
		}

		//			_uf_log('_uf_disable_nocontextmenu', mode, elem, _jquery_array, _jquery, _jquery.fn.jquery, arr);

		try
		{
			arr
				.removeAttr('ondragstart')
				.removeAttr('oncontextmenu')
				.removeAttr('onselectstart')
				.removeAttr('onmousedown')
				.removeAttr('onmouseup')
				.removeAttr('onsource')

				.css({
					'-moz-user-select': 'auto',
					'-webkit-user-select': 'auto',
					'-ms-user-select': 'auto',
					'user-select': 'auto',
				})
				;
		}
		catch (e)
		{
			console.error(e);
		}

		if (mode)
		{
			arr
				.each(function ()
				{
					try
					{
						// @ts-ignore
						this.oncontextmenu = this.ondragstart = this.onselectstart = this.onmousedown = this.onmouseup
							// @ts-ignore
							= this.onsource = null;
					}
					catch (e)
					{
						console.error(e);
					}
				})
				;

			(_jquery.fn.unbind) && _fn_jq_call(_jquery, arr, 'unbind', _fn_event);
			// @ts-ignore
			(_jquery.fn.die) && _fn_jq_call(_jquery, arr, 'die', _fn_event);

			if (_jquery.fn.off)
			{
				/*
				arr
					.off('dragstart')
					.off('contextmenu')
					.off('selectstart')
					.off('mousedown')
					.off('mouseup')
					.off('source')
				;
				*/

				_fn_jq_call(_jquery, arr, 'off', _fn_event);
			}
		}

	});
}
