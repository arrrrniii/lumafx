/* lumafx: an "Effects" panel for every block. Plain script, no build step. */
(function (wp, data) {
	if (!wp || !data) return;
	var el = wp.element.createElement;
	var Fragment = wp.element.Fragment;
	var __ = wp.i18n.__;
	var addFilter = wp.hooks.addFilter;
	var createHOC = wp.compose.createHigherOrderComponent;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var C = wp.components;

	var META = data.effects || {};
	var NAMES = Object.keys(META);

	var HINTS = {
		modal: __('Give this block an HTML anchor (Advanced → HTML anchor), then link any button to #your-anchor. The block becomes a dialog that opens from that link.', 'lumafx'),
		'video-scrub': __('Use on a Video block. Short videos with frequent keyframes scrub best.', 'lumafx'),
		frames: __('Set the image URL pattern, for example /wp-content/uploads/seq/frame-###.jpg.', 'lumafx'),
		lightbox: __('Use on an Image linked to its media file, or on a Gallery whose images link to their media files.', 'lumafx'),
		'svg-draw': __('Use on a Custom HTML block that contains an inline SVG with strokes.', 'lumafx'),
		'smart-header': __('Use on your header template part in the Site Editor.', 'lumafx'),
		hovercard: __('Set the text option, or a selector of hidden content.', 'lumafx'),
		'image-trail': __('Put Image blocks inside, or list image URLs.', 'lumafx'),
		clock: __('Use on a Paragraph. Time zone example: Europe/Tirane.', 'lumafx'),
		'rotate-words': __('Use on a short Paragraph or Heading. Its text is the first word.', 'lumafx'),
		ring: __('Use on a Group, Row or Gallery. Each child becomes an item.', 'lumafx'),
		carousel: __('Use on a Group, Row or Gallery. Each child becomes a slide.', 'lumafx'),
		stories: __('Use on a Group or Gallery. Each child becomes a story.', 'lumafx'),
		marquee: __('Use on a Row or Group. The children loop.', 'lumafx'),
		dock: __('Use on a Row of icon links or buttons.', 'lumafx'),
		stack: __('Use on a Group of cards.', 'lumafx'),
		stagger: __('Use on a Group, List or Columns. Children appear one by one.', 'lumafx'),
		hscroll: __('Use on a Row or Group. The children scroll sideways while the section is pinned.', 'lumafx'),
	};

	var sparkle = el(
		'svg',
		{ width: 20, height: 20, viewBox: '0 0 24 24', 'aria-hidden': true },
		el('path', { fill: 'currentColor', d: 'M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z' })
	);

	// 1. Every block accepts a `lumafx` attribute.
	addFilter('blocks.registerBlockType', 'lumafx/attribute', function (settings) {
		if (!settings || !settings.attributes || settings.attributes.lumafx) return settings;
		settings.attributes = Object.assign({}, settings.attributes, { lumafx: { type: 'object' } });
		return settings;
	});

	// Typed text becomes the closest effect name: "glas" + Enter adds glass.
	function resolve(text) {
		var t = String(text || '').trim().toLowerCase();
		if (!t) return null;
		if (META[t]) return t;
		var starts = NAMES.filter(function (n) { return n.indexOf(t) === 0; });
		if (starts.length) return starts[0];
		var contains = NAMES.filter(function (n) { return n.indexOf(t) >= 0; });
		return contains.length ? contains[0] : null;
	}

	function clean(fx) {
		var effects = (fx.effects || []).filter(function (n) { return META[n]; });
		if (!effects.length) return undefined;
		var keep = {};
		var options = fx.options || {};
		effects.forEach(function (n) {
			Object.keys(META[n].options).forEach(function (k) {
				if (options[k] !== undefined && options[k] !== '' && options[k] !== null) keep[k] = options[k];
			});
		});
		return { effects: effects, options: keep };
	}

	function optionControl(key, opt, value, onChange) {
		var label = key;
		var help = opt.desc || undefined;
		var def = opt['default'];
		if (opt.type === 'enum') {
			return el(C.SelectControl, {
				key: key,
				label: label,
				help: help,
				value: value === undefined ? '' : String(value),
				options: [{ label: __('Default', 'lumafx') + (def !== undefined && def !== '' ? ' (' + def + ')' : ''), value: '' }].concat(
					(opt.values || []).map(function (v) { return { label: v, value: v }; })
				),
				onChange: function (v) { onChange(v || undefined); },
				__nextHasNoMarginBottom: true,
				__next40pxDefaultSize: true,
			});
		}
		if (opt.type === 'boolean') {
			var checked = value === undefined ? !!def : value === true || value === 'true';
			return el(C.ToggleControl, {
				key: key,
				label: label,
				help: help,
				checked: checked,
				onChange: function (v) { onChange(v === !!def ? undefined : v); },
				__nextHasNoMarginBottom: true,
			});
		}
		return el(C.TextControl, {
			key: key,
			label: label,
			help: help,
			value: value === undefined ? '' : String(value),
			placeholder: def !== undefined && def !== '' ? String(def) : '',
			onChange: function (v) { onChange(v); },
			__nextHasNoMarginBottom: true,
			__next40pxDefaultSize: true,
		});
	}

	// 2. The Effects panel.
	var withPanel = createHOC(function (BlockEdit) {
		return function (props) {
			var fx = props.attributes.lumafx || {};
			var effects = (fx.effects || []).filter(function (n) { return META[n]; });
			var options = fx.options || {};
			var set = function (patch) {
				props.setAttributes({ lumafx: clean(Object.assign({}, { effects: effects, options: options }, patch)) });
			};
			var shown = {};
			var groups = effects.map(function (name) {
				var m = META[name];
				var controls = Object.keys(m.options)
					.filter(function (k) {
						if (shown[k]) return false;
						shown[k] = true;
						return true;
					})
					.map(function (k) {
						return optionControl(k, m.options[k], options[k], function (v) {
							var next = Object.assign({}, options);
							if (v === undefined || v === '') delete next[k];
							else next[k] = v;
							set({ options: next });
						});
					});
				return el(
					'div',
					{ key: name, className: 'lumafx-effect' },
					el('p', { className: 'lumafx-effect-title' }, m.title, el('code', null, name)),
					el('p', { className: 'lumafx-effect-desc' }, m.desc),
					HINTS[name] ? el(C.Notice, { status: 'info', isDismissible: false, className: 'lumafx-hint' }, HINTS[name]) : null,
					controls.length ? el('div', { className: 'lumafx-options' }, controls) : null
				);
			});

			return el(
				Fragment,
				null,
				el(BlockEdit, props),
				props.isSelected
					? el(
							InspectorControls,
							null,
							el(
								C.PanelBody,
								{ title: __('Effects', 'lumafx'), icon: sparkle, initialOpen: effects.length > 0, className: 'lumafx-panel' },
								el(C.FormTokenField, {
									label: __('Add effects', 'lumafx'),
									value: effects,
									suggestions: NAMES,
									__experimentalExpandOnFocus: true,
									__experimentalShowHowTo: false,
									__next40pxDefaultSize: true,
									__nextHasNoMarginBottom: true,
									onChange: function (tokens) {
										var picked = [];
										tokens.forEach(function (t) {
											var n = resolve(typeof t === 'string' ? t : t.value);
											if (n && picked.indexOf(n) < 0) picked.push(n);
										});
										set({ effects: picked });
									},
								}),
								effects.length
									? groups
									: el('p', { className: 'lumafx-empty' }, __('Try reveal, glass, border-beam, tilt or image-reveal. Effects play on the published page.', 'lumafx'))
							)
						)
					: null
			);
		};
	}, 'withLumafxPanel');
	addFilter('editor.BlockEdit', 'lumafx/panel', withPanel);

	// 3. A small badge on blocks that carry effects, so they're easy to spot in the canvas.
	var withBadge = createHOC(function (BlockListBlock) {
		return function (props) {
			var fx = props.attributes && props.attributes.lumafx;
			var effects = fx && fx.effects ? fx.effects.filter(function (n) { return META[n]; }) : [];
			if (!effects.length) return el(BlockListBlock, props);
			var wrapperProps = Object.assign({}, props.wrapperProps, { 'data-lumafx': '✦ ' + effects.join(' · ') });
			return el(BlockListBlock, Object.assign({}, props, { wrapperProps: wrapperProps }));
		};
	}, 'withLumafxBadge');
	addFilter('editor.BlockListBlock', 'lumafx/badge', withBadge);
})(window.wp, window.lumafxEditor);
