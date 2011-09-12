/*!
 * jquery slider plugin
 * with tooltip and progress supporting touch devices
 * Copyright 2011, Stefan Benicke (opusonline.at)
 * Dual licensed under the MIT or GPL Version 3 licenses.
 */
(function($) {
	
	$.extend($.expr[':'], {
    	range: function(a) {
        	return 'range' == $(a).attr('type');
    	}
	});
	
	var defaults = {
		min: 0,
		max: 100,
		step: 1,
		status: false,
		tooltip: true,
		progress: true,
		disabled: false,
		tooltipTransform: function(value) { return value; },
		onStart: function(value) {},
		onChange: function(value) {},
		onChanged: function(value) {}
	},
	
	$Slider, Mouse_left, Slider_left, Timer,
	Is_touch_device = 'ontouchend' in document,
	Mouse_down = 'mousedown.',
	Mouse_up = 'mouseup.',
	Mouse_move = 'mousemove.',
	EventNameSpace = 'slider',
	
	_setEventTypes = function() {
		if ( ! Is_touch_device) return;
		Mouse_down = 'touchstart.';
		Mouse_up = 'touchend.';
		Mouse_move = 'touchmove.';
	},
	
	_jump = function(event) {
		_eventCancel(event);
		$Slider = $(this).data('handle').focus();
		var data = $Slider.data();
		if (data.disabled) {
			$Slider = null;
			return;
		}
		data.options.onStart.call(data.element, data.value);
		Slider_left = data.slider_left;
		var _event = event.originalEvent && event.originalEvent.touches ? event.originalEvent.touches[0] : event;
		Mouse_left = parseFloat(_event.pageX);
		var left = Mouse_left - Slider_left;
		_setStepPosition($Slider, left);
		data.options.onChanged.call(data.element, data.value);
		$Slider = null;
	},
	_mouseStart = function(event) {
		_eventCancel(event);
		$Slider = $(this).focus();
		var data = $Slider.data(),
		_event = event.originalEvent && event.originalEvent.touches ? event.originalEvent.touches[0] : event;
		if (data.disabled) {
			$Slider = null;
			return;
		}
		data.options.onStart.call(data.element, data.value);
		Mouse_left = parseFloat(_event.pageX);
		Slider_left = data.slider_left;
		if (event.originalEvent && event.originalEvent.touches) {
			data.tooltip.show();
		}
		Timer = setInterval(_moveHandle, 20);
	},
	_mouseMove = function(event) {
		if ( ! $Slider) return;
		event.preventDefault();
		var _event = event.originalEvent && event.originalEvent.touches ? event.originalEvent.touches[0] : event;
		Mouse_left = parseFloat(_event.pageX);
	},
	_mouseEnd = function(event) {
		if ( ! Timer || ! $Slider) return;
		clearInterval(Timer);
		Timer = null;
		var data = $Slider.data();
		if ( ! data.over) {
			data.tooltip.hide();
		}
		if ( ! data.active) {
			$Slider.removeClass('active');
		}
		if (event.originalEvent && event.originalEvent.touches) {
			data.tooltip.hide();
		}
		data.options.onChanged.call(data.element, data.value);
		$Slider = null;
	},
	_moveHandle = function() {
		if ( ! Timer) return;
		var left = Mouse_left - Slider_left;
		_setStepPosition($Slider, left);
	},
	_setStepPosition = function($slider, position) {
		var data = $slider.data(),
		prop = Math.round(position / data.step_width),
		new_value = prop * data.step + data.min;
		position = prop * data.step_width;
		if (new_value == data.value) return;
		_setPosition($slider, position);
		_setValue($slider, new_value);
	},
	_setPosition = function($slider, position) {
		var data = $slider.data();
		if (position > data.slider_width) position = data.slider_width;
		if (position < 0) position = 0;
		$slider.css('left', position);
		if (data.options.progress) data.progress.width(position);
		data.tooltip.css('left', position);
	},
	_setValue = function($slider, value) {
		var data = $slider.data(),
		old_value = data.value;
		if (value > data.max) value = data.max;
		if (value < data.min) value = data.min;
		if (value == old_value) return;
		$slider.data('value', value);
		data.tooltip.html(data.options.tooltipTransform(value));
		data.options.onChange.call(data.element, value);
	},
	_setStatus = function($slider, value) {
		var data = $slider.data();
		if (value < data.min) value = data.min;
		if (value > data.max) value = data.max;
		$slider.data('status_value', value);
		var drawing = _calcNewSize(value, data.min, data.max, data.step, data.slider_width);
		data.status.width(drawing.position);
	},
	_calcNewSize = function(value, min, max, step, slider_width) {
		var range = max - min,
		step_width = parseFloat(slider_width / (range / step)),
		position = (value - min) * step_width / step;
		return {
			position: position,
			step_width: step_width
		};
	},
	_keyAction = function(event) {
		var code = event.keyCode;
		if ( ! (code == 39 || code == 37 || code == 36 || code == 35)) return;
		_eventCancel(event);
		$Slider = $(this).data('handle');
		var data = $Slider.data();
		data.options.onStart.call(data.element, data.value);
		if (code == 39) { // right
			_nextSliderValue($Slider);
		}
		if (code == 37) { // left
			_prevSliderValue($Slider);
		}
		if (code == 36) { // home
			_setPositionFromValue($Slider, data.min);
		}
		if (code == 35) { // end
			_setPositionFromValue($Slider, data.max);
		}
		data.options.onChanged.call(data.element, data.value);
		$Slider = null;
	},
	_nextSliderValue = function($slider) {
		var data = $slider.data();
		var new_value = data.value + data.step;
		_setPositionFromValue($slider, new_value);
	},
	_prevSliderValue = function($slider) {
		var data = $slider.data();
		var new_value = (Math.ceil(data.value / data.step) - 1) * data.step;
		_setPositionFromValue($slider, new_value);
	},
	_setPositionFromValue = function($slider, value) {
		var data = $slider.data();
		if (data.disabled) return;
		if (data.options.tooltip) {
			clearTimeout(data.timer);
			data.timer = setTimeout(function() {
				data.tooltip.fadeOut();
			}, 1500);
			data.tooltip.stop(true, true).fadeIn('fast');
		}
		var drawing = _calcNewSize(value, data.min, data.max, data.step, data.slider_width);
		_setPosition($slider, drawing.position);
		_setValue($slider, value);
	},
	_setDisabled = function($slider, value) {
		$slider.data('disabled', value);
		if (value) {
			$slider.attr('tabindex', -1).data('root').addClass('disabled');
		}
		else {
			$slider.attr('tabindex', 0).data('root').removeClass('disabled');
		}
	},
	_eventCancel = function(event) {
		event.preventDefault();
		event.stopPropagation();
		event.cancelBubble = true;
		event.returnValue = false;
	};
	
	_setEventTypes();
	
	$(document).bind(Mouse_move + EventNameSpace, _mouseMove).bind(Mouse_up + EventNameSpace, _mouseEnd);
	
	$.fn.slider = function(options) {
		
		options = $.extend({}, defaults, options);
		
		return this.each(function() {
			
			if ($(this).data('slider')) return;
			
			var _enter = function() {
				$handle.data('over', true);
				if ($Slider) return;
				if (options.tooltip) $tooltip.fadeIn('fast');
			},
			_leave = function() {
				$handle.data('over', false);
				if ($Slider) return;
				$tooltip.hide();
			},
			_setActive = function() {
				$handle.addClass('active').data('active', true);
			},
			_removeActive = function() {
				$handle.data('active', false);
				if ($Slider) return;
				$handle.removeClass('active');
			},
			_stepDown = function(event) {
				event.preventDefault();
				_prevSliderValue($handle);
			},
			_stepUp = function(event) {
				event.preventDefault();
				_nextSliderValue($handle);
			},
			
			$element = $(this).hide(),
			$root = $('<span class="slider"/>').bind(Mouse_down + EventNameSpace, _jump).bind('mouseenter.' + EventNameSpace, _enter).bind('mouseleave.' + EventNameSpace, _leave).bind('keydown.' + EventNameSpace, _keyAction),
			$bar = $('<span class="slider-bar"/>'),
			$status = $('<span class="slider-status"/>'),
			$progress = $('<span class="slider-progress"/>'),
			$handle = $('<span class="slider-handle" tabindex="0"/>').bind(Mouse_down + EventNameSpace, _mouseStart).bind('mouseenter.' + EventNameSpace, _setActive).bind('mouseleave.' + EventNameSpace, _removeActive),
			$tooltip = $('<span class="slider-tooltip" style="display:none"/>'),
			$arrow_down = $('<span class="slider-down"/>').bind(Mouse_down + EventNameSpace, _stepDown),
			$arrow_up = $('<span class="slider-up"/>').bind(Mouse_down + EventNameSpace, _stepUp),
			min_attr = $element.attr('min'),
			min = min_attr != undefined ? parseInt(min_attr) : parseInt(options.min),
			max_attr = $element.attr('max'),
			max = max_attr != undefined ? parseInt(max_attr) : parseInt(options.max),
			step_attr = $element.attr('step'),
			step = step_attr != undefined ? parseInt(step_attr) : parseInt(options.step),
			value_attr = $element.attr('value'),
			value_standard = typeof options.value == 'number' ? parseInt(options.value) : parseInt(max / 2 + min),
			value = value_attr != undefined ? parseInt(value_attr) : value_standard,
			disabled_attr = $element.attr('disabled'),
			disabled = disabled_attr != undefined ? disabled_attr : options.disabled,
			status = options.status != false ? parseInt(options.status) : min;
			
			$root.data({handle: $handle}).append($bar, $status, $progress, $handle, $tooltip).insertAfter($element.data('slider', $handle));
			
			if (Is_touch_device) {
				$root.before($arrow_down).after($arrow_up);
			}
			
			var slider_width = $bar.width(),
			slider_left = $bar.offset().left,
			drawing = _calcNewSize(value, min, max, step, slider_width);
			
			$handle.data({
				element: $element,
				root: $root,
				status: $status,
				progress: $progress,
				tooltip: $tooltip,
				slider_left: slider_left,
				slider_width: slider_width,
				step_width: drawing.step_width,
				value: 'n/a',
				max: max,
				min: min,
				step: step,
				disabled: disabled,
				status_value: status,
				options: options,
				timer: null
			});
			
			_setPosition($handle, drawing.position);
			_setValue($handle, value);
			_setDisabled($handle, disabled);
			_setStatus($handle, status);
			
		});
		
	};
	
	$.fn.sliderAttr = function() {
		var $element = this.length ? $(this[0]) : $(this);
		var $slider = $element.data('slider');
		if ( ! $slider) return;
		
		var arg = arguments[0];
		var data = $slider.data();
		if (arg == undefined) {
			return {
				value: data.value,
				min: data.min,
				max: data.max,
				step: data.step,
				disabled: data.disabled,
				status: data.status_value
			};
		}
		if (typeof arg == 'object') {
			for (var name in arg) {
				$element.sliderAttr(name, arg[name]);
			}
			return $element;
		}
		var name = arg;
		if (typeof name != 'string') return;
		var value;
		var etter = 'get';
		if (arguments[1] != undefined) {
			etter = 'set';
			value = arguments[1];
			if (typeof value == 'number') {
				value = parseInt(value);
			}
		}
		var _methods = {
			value: {
				get: function() {
					return data.value;
				},
				set: function() {
					if ($Slider) return;
					var drawing = _calcNewSize(value, data.min, data.max, data.step, data.slider_width);
					_setPosition($slider, drawing.position);
					_setValue($slider, value);
				}
			},
			min: {
				get: function() {
					return data.min;
				},
				set: function() {
					var drawing = _calcNewSize(data.value, value, data.max, data.step, data.slider_width);
					$slider.data({min: value, step_width: drawing.step_width});
					_setPosition($slider, drawing.position);
				}
			},
			max: {
				get: function() {
					return data.max;
				},
				set: function() {
					var drawing = _calcNewSize(data.value, data.min, value, data.step, data.slider_width);
					$slider.data({max: value, step_width: drawing.step_width});
					_setPosition($slider, drawing.position);
				}
			},
			step: {
				get: function() {
					return data.step;
				},
				set: function() {
					var drawing = _calcNewSize(data.value, data.min, data.max, value, data.slider_width);
					$slider.data({step: value, step_width: drawing.step_width});
				}
			},
			disabled: {
				get: function() {
					return data.disabled;
				},
				set: function() {
					_setDisabled($slider, value);
				}
			},
			status: {
				get: function() {
					return data.status_value;
				},
				set: function() {
					_setStatus($slider, value);
				}
			}
		};
		if (_methods[name] == undefined) return;
		
		var result = _methods[name][etter]();
		
		return etter == 'get' ? result : $element;
		
	};
	
	$.fn.sliderMove = function() {
		var $element = this.length ? $(this[0]) : $(this);
		var $slider = $element.data('slider');
		if ( ! $slider) return;
		
		var arg = arguments[0];
		if (arg == undefined) return;
		
		var data = $slider.data();
		var _methods = {
			up: function() {
				_nextSliderValue($slider);
			},
			down: function() {
				_prevSliderValue($slider);
			},
			min: function() {
				_setPositionFromValue($slider, data.min);
			},
			max: function() {
				_setPositionFromValue($slider, data.max);
			}
		};
		if (_methods[arg] == undefined) return;
		
		_methods[arg]();
		
		return $element;
	};
	
})(jQuery);
