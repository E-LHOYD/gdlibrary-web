<!--
	The app's icons, in one file.

	Inline SVG rather than an icon font or a package: there are two dozen of
	them, they are a few hundred bytes each, and a font or a dependency would
	cost a network request and a flash of missing glyphs to save nothing. Every
	path is stroked in currentColor and sized in em, so an icon takes the colour
	and the size of the button it sits in without being told either -- which is
	what lets the same <Icon name="trash" /> read navy on a plain button and red
	on a danger one.
-->
<script>
	/** @type {string} */
	export let name;
	/** Width and height, in any CSS length. Defaults to the text size. */
	export let size = '1.05em';

	// 24x24 viewBox, stroked not filled, so weight stays even at any size.
	const PATHS = {
		trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6'],
		plus: ['M12 5v14', 'M5 12h14'],
		x: ['M18 6L6 18', 'M6 6l12 12'],
		check: ['M20 6L9 17l-5-5'],
		'check-square': ['M9 11l3 3L21 4', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
		search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4.35-4.35'],
		'book-open': [
			'M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z',
			'M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z'
		],
		bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
		list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
		grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
		star: ['M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z'],
		user: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2'],
		'user-plus': [
			'M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
			'M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2',
			'M19 8v6',
			'M22 11h-6'
		],
		'log-in': ['M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4', 'M10 17l5-5-5-5', 'M15 12H3'],
		'log-out': ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
		mail: ['M3 5h18v14H3z', 'M3 6l9 7 9-7'],
		edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z'],
		refresh: ['M20.5 12a8.5 8.5 0 1 1-2.5-6', 'M21 3v6h-6'],
		eye: ['M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
		'eye-off': [
			'M3 3l18 18',
			'M10.6 10.6a3 3 0 0 0 4.2 4.2',
			'M9.9 5.2A10.6 10.6 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-3.4 4.3',
			'M6.2 6.2A18.4 18.4 0 0 0 1 12s4 7 11 7a10.6 10.6 0 0 0 3.3-.5'
		],
		'arrow-up': ['M12 19V5', 'M5 12l7-7 7 7'],
		'arrow-down': ['M12 5v14', 'M19 12l-7 7-7-7'],
		'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
		'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
		settings: [
			'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
			'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'
		],
		lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4']
	};

	$: paths = PATHS[name] ?? [];
</script>

<svg
	class="icon"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#each paths as d}
		<path {d} />
	{/each}
</svg>

<style>
	.icon {
		flex-shrink: 0;
		/* Optical centring: a 24-box icon sits a shade high against cap height. */
		margin-top: 0.05em;
	}
</style>
