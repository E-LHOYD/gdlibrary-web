// pdf.js, loaded once and only in the browser.
//
// It is imported on demand rather than at the top of a module because it is
// large and only the reader and the book page's first-page cover need it.

let loading = null;

export function loadPdfjs() {
	if (!loading) {
		loading = (async () => {
			const pdfjs = await import('pdfjs-dist');
			const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
			pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
			return pdfjs;
		})();
	}
	return loading;
}
